import assert from 'node:assert/strict';
import { test } from 'vitest';
import { InMemoryStore } from '../packages/sdk/dist/index.js';
import { createRemoteConfig } from '../packages/remote-config/dist/index.js';
import { createConfigReader } from '../packages/remote-config/dist/browser.js';
import { createMiner } from '../packages/miner/dist/index.js';
import { createMinerClient } from '../packages/miner/dist/browser.js';

const context = { tenantId: 'one', projectId: 'product', environment: 'staging' };
const author = {
  ...context,
  actorId: 'author',
  permissions: ['config:edit', 'config:read', 'config:review'],
};
const reviewer = { ...author, actorId: 'reviewer' };
const definitions = {
  private: { audience: 'signed-in', validate: (doc) => typeof doc.message === 'string' },
  welcome: {
    audience: 'public',
    validate: (doc) => Object.keys(doc).length === 1 && typeof doc.message === 'string',
  },
};

test('config approval publishes one immutable candidate and restores through the same policy', async () => {
  const store = new InMemoryStore();
  const config = createRemoteConfig({ store, definitions, publicTenantId: 'public' });
  const input = { message: 'first' };
  await config.saveDraft(author, 'private', input, 0);
  input.message = 'changed outside persistence';
  await config.submit(author, 'private', 1);
  await assert.rejects(config.saveDraft(author, 'private', { message: 'pending replacement' }, 1), {
    status: 409,
  });
  assert.equal(await config.read(context, 'private', 'signed-in'), undefined);
  await assert.rejects(config.approve(author, 'private', 1), { status: 403 });
  const review = await Promise.allSettled([
    config.approve(reviewer, 'private', 1),
    config.approve(reviewer, 'private', 1),
  ]);
  assert.equal(review.filter(({ status }) => status === 'fulfilled').length, 1);
  const first = await config.read(context, 'private', 'signed-in');
  assert.equal(first.value.message, 'first');
  for (const scope of [
    { ...context, tenantId: 'other' },
    { ...context, projectId: 'other' },
    { ...context, environment: 'production' },
  ])
    assert.equal(await config.read(scope, 'private', 'signed-in'), undefined);
  await assert.rejects(config.read(context, 'private', 'public'), { status: 404 });

  await config.saveDraft(author, 'private', { message: 'second' }, 1);
  await assert.rejects(config.saveDraft(author, 'private', { message: 'stale' }, 1), {
    status: 409,
  });
  await config.submit(author, 'private', 2);
  await config.reject(reviewer, 'private', 2);
  assert.equal((await config.read(context, 'private', 'signed-in')).etag, first.etag);
  await assert.rejects(config.approve(reviewer, 'private', 2), { status: 409 });
  await config.restore(author, 'private', 1, 2);
  await config.submit(author, 'private', 3);
  await config.approve(reviewer, 'private', 3);
  assert.equal((await config.history(author, 'private')).published, 3);
  assert.notEqual((await config.read(context, 'private', 'signed-in')).etag, first.etag);
  const audit = await store.list(context.tenantId, 'audit');
  assert.equal(audit.filter(({ action }) => action === 'config.approve').length, 2);
  assert.equal(audit.find(({ action }) => action === 'config.restored').detail.restoredFrom, 1);
  assert.ok(audit.every(({ detail }) => !JSON.stringify(detail).includes('first')));
});

test('approval policies and explicit public documents are independent of private tenant data', async () => {
  for (const [reviewPolicy, environment, self] of [
    ['operator', 'production', true],
    ['distinct-reviewer', 'development', false],
    [
      { development: 'operator', staging: 'distinct-reviewer', production: 'distinct-reviewer' },
      'development',
      true,
    ],
  ]) {
    const config = createRemoteConfig({
      store: new InMemoryStore(),
      definitions,
      publicTenantId: 'public',
      reviewPolicy,
    });
    const actor = { ...author, environment, tenantId: 'public' };
    await assert.rejects(
      config.saveDraft({ ...actor, tenantId: 'one' }, 'welcome', { message: 'Hello' }, 0),
      { status: 403 },
    );
    await assert.rejects(
      config.saveDraft(actor, 'welcome', { message: 'Hello', secret: 'test' }, 0),
      { status: 400 },
    );
    await config.saveDraft(actor, 'welcome', { message: 'Hello' }, 0);
    await config.submit(actor, 'welcome', 1);
    if (self) await config.approve(actor, 'welcome', 1);
    else {
      await assert.rejects(config.approve(actor, 'welcome', 1), { status: 403 });
      await config.approve({ ...actor, actorId: 'reviewer' }, 'welcome', 1);
    }
    assert.equal((await config.read(actor, 'welcome', 'public')).value.message, 'Hello');
    await assert.rejects(config.read(actor, 'welcome', 'signed-in'), { status: 404 });
  }
});

test('browser readers revalidate ETags, retain scoped fallback on outage, and clear denied values', async () => {
  const initial = { message: 'default' };
  let response = () => Response.json({ value: { message: 'live' } }, { headers: { ETag: '"r1"' } });
  const headers = [];
  const reader = createConfigReader('/api/config/private', initial, {
    refreshMs: 100,
    fetch: async (_url, options) => {
      headers.push(options.headers);
      return response();
    },
  });
  assert.equal((await reader.read(0)).message, 'live');
  assert.equal((await reader.read(20)).message, 'live');
  assert.equal(headers.length, 1);
  response = () => new Response(null, { status: 304 });
  assert.equal((await reader.read(120)).message, 'live');
  assert.deepEqual(headers[1], { 'If-None-Match': '"r1"' });
  response = () => {
    throw Error('offline');
  };
  assert.equal((await reader.read(121, { force: true })).message, 'live');
  assert.deepEqual(headers[2], { 'If-None-Match': '"r1"' });
  response = () => new Response(null, { status: 403 });
  assert.deepEqual(await reader.read(360), initial);
  reader.reset();
  assert.deepEqual(await reader.read(361), initial);
});

const day = 86_400_000;
const minerActor = {
  ...context,
  subject: 'u:member',
  consent: true,
  permissions: ['miner:read', 'miner:admin', 'miner:privacy'],
};

test('Miner deduplicates events, links anonymous subjects, and applies scope, retention and erasure', async () => {
  let now = Date.parse('2026-10-10T12:00:00Z');
  const store = new InMemoryStore();
  const miner = createMiner({
    store,
    schemas: { viewed: { page: 'string' }, paid: {} },
    retentionDays: 5,
    now: () => now,
  });
  const visitor = { ...minerActor, subject: 'a:browser' };
  await assert.rejects(
    miner.track({ ...visitor, consent: false }, { id: 'denied', name: 'viewed' }),
    { status: 403 },
  );
  await assert.rejects(
    miner.track(visitor, { id: 'invalid', name: 'viewed', properties: { page: 9 } }),
    { status: 400 },
  );
  const repeated = await Promise.all(
    Array.from({ length: 8 }, () =>
      miner.track(visitor, { id: 'anonymous-event', name: 'viewed', properties: { page: 'home' } }),
    ),
  );
  assert.equal(repeated.filter(({ duplicate }) => !duplicate).length, 1);
  await assert.rejects(miner.track(visitor, { id: 'anonymous-event', name: 'paid' }), {
    status: 409,
  });
  await miner.identify(minerActor, visitor.subject);
  await assert.rejects(
    miner.identify({ ...minerActor, subject: 'u:someone-else' }, visitor.subject),
    { status: 409 },
  );
  now += day;
  await miner.track(minerActor, { id: 'conversion', name: 'paid' });
  const range = { from: now - 2 * day, to: now + 1 };
  const report = { id: 'conversion', type: 'funnel', steps: ['viewed', 'paid'] };
  await miner.saveReport(minerActor, report);
  await miner.saveCohort(minerActor, {
    id: 'visitors',
    event: 'viewed',
    days: 5,
    property: { key: 'page', equals: 'home' },
  });
  assert.deepEqual(await miner.report(minerActor, { ...range, cohort: 'visitors' }, report), [
    { name: 'viewed', users: 1 },
    { name: 'paid', users: 1 },
  ]);
  const retained = await miner.report(minerActor, range, {
    id: 'retention',
    type: 'retention',
    first: 'viewed',
    returning: 'paid',
    days: 2,
  });
  assert.equal(retained.days[1].users, 1);
  for (const different of [
    { tenantId: 'other' },
    { projectId: 'other' },
    { environment: 'production' },
  ])
    assert.equal((await miner.report({ ...minerActor, ...different }, range, report))[0].users, 0);
  await miner.deleteSubject(minerActor, minerActor.subject);
  assert.equal((await miner.report(minerActor, range, report))[0].users, 0);
  await assert.rejects(miner.track(visitor, { id: 'deleted', name: 'viewed' }), { status: 403 });
  await miner.track({ ...visitor, subject: 'a:other' }, { id: 'expiry', name: 'viewed' });
  now += 5 * day + 2;
  await miner.purge(minerActor);
  const rows = await store.list(
    context.tenantId,
    'miner:events:' + JSON.stringify([context.projectId, context.environment]),
  );
  assert.deepEqual(rows, []);
});

test('Miner fixes experiment allocations and orders same-millisecond conversions after exposure', async () => {
  const now = Date.parse('2026-10-10T12:00:00Z');
  const miner = createMiner({
    store: new InMemoryStore(),
    schemas: { converted: {} },
    now: () => now,
  });
  await miner.setFlag(minerActor, {
    id: 'team',
    enabled: true,
    rollout: 100,
    trait: { key: 'plan', equals: 'team' },
  });
  assert.equal((await miner.evaluateFlag(minerActor, 'team')).enabled, false);
  assert.equal(
    (await miner.evaluateFlag({ ...minerActor, traits: { plan: 'team' } }, 'team')).enabled,
    true,
  );
  const experiment = {
    id: 'onboarding',
    flag: 'team',
    allocation: 100,
    treatment: 50,
    conversionEvent: 'converted',
  };
  await miner.saveExperiment(minerActor, experiment);
  assert.equal(await miner.assign(minerActor, experiment.id), null);
  await miner.launch(minerActor, experiment.id);
  await assert.rejects(miner.saveExperiment(minerActor, { ...experiment, treatment: 80 }), {
    status: 409,
  });
  assert.equal(await miner.assign(minerActor, experiment.id), null);
  const participant = { ...minerActor, traits: { plan: 'team' } };
  const first = await miner.assign(participant, experiment.id);
  assert.deepEqual(await miner.assign(participant, experiment.id), first);
  await miner.track(minerActor, { id: 'prior', name: 'converted' });
  await assert.rejects(
    miner.expose(minerActor, experiment.id, first.variant === 'control' ? 'treatment' : 'control'),
    { status: 409 },
  );
  await miner.expose(minerActor, experiment.id, first.variant);
  assert.equal((await miner.expose(minerActor, experiment.id, first.variant)).duplicate, true);
  const range = { from: now - day, to: now + 100 };
  assert.equal(
    (await miner.results(minerActor, experiment.id, range)).variants.find(
      ({ variant }) => variant === first.variant,
    ).converted,
    0,
  );
  await miner.track(minerActor, { id: 'after', name: 'converted' });
  const result = (await miner.results(minerActor, experiment.id, range)).variants.find(
    ({ variant }) => variant === first.variant,
  );
  assert.equal(result.exposed, 1);
  assert.equal(result.converted, 1);
  await miner.stop(minerActor, experiment.id);
  assert.equal(await miner.assign(minerActor, experiment.id), null);
});

test('Miner browser retries keep the same event identity and clock', async () => {
  const bodies = [];
  const miner = createMinerClient({
    fetch: async (_url, options) => {
      bodies.push(JSON.parse(options.body));
      return bodies.length === 1
        ? new Response(null, { status: 503 })
        : Response.json({ duplicate: true });
    },
  });
  assert.equal((await miner.track('viewed')).duplicate, true);
  assert.deepEqual(bodies[0], bodies[1]);
});
