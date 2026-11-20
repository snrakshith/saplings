import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createClient } from 'redis';
import { randomUUID } from 'node:crypto';
import { ValkeyRateState } from '../../packages/sdk/dist/index.js';
test('live Valkey: independent clients, atomic rate windows and alert expiry', async () => {
  if (!process.env.TEST_VALKEY_URL) throw Error('TEST_VALKEY_URL required');
  const a = createClient({ url: process.env.TEST_VALKEY_URL }),
    b = a.duplicate();
  await Promise.all([a.connect(), b.connect()]);
  try {
    const prefix = 'sapling:test:' + randomUUID() + ':',
      x = new ValkeyRateState(a, prefix),
      y = new ValkeyRateState(b, prefix);
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) => (i % 2 ? x : y).increment('rate', 5000)),
    );
    assert.deepEqual(
      results.map((r) => r.count).sort((a, b) => a - b),
      Array.from({ length: 100 }, (_, i) => i + 1),
    );
    assert.equal(
      (await Promise.all([x.claimAlert('a', 100), y.claimAlert('a', 100)])).filter(Boolean).length,
      1,
    );
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(await y.claimAlert('a', 100), true);
  } finally {
    await Promise.all([a.quit(), b.quit()]);
  }
});

import { RealtimeHub, RedisBroker } from '@saplings/realtime';
test('live Valkey pub/sub across replicas, tenant isolation', async () => {
  if (!process.env.TEST_VALKEY_URL) throw Error('TEST_VALKEY_URL required');
  const clients = Array.from({ length: 4 }, () =>
    createClient({ url: process.env.TEST_VALKEY_URL }),
  );
  await Promise.all(clients.map((c) => c.connect()));
  const prefix = 'sapling:test:' + randomUUID() + ':';
  const policy = { enabled: true, authenticate: () => undefined, authorize: () => true };
  const a = new RealtimeHub({ ...policy, broker: new RedisBroker(clients[0], clients[1], prefix) }),
    b = new RealtimeHub({ ...policy, broker: new RedisBroker(clients[2], clients[3], prefix) });
  const principal = { tenantId: 'tenant-a', userId: 'user' };
  let resolve;
  const received = new Promise((r) => (resolve = r));
  let leaked = false;
  const c = b.connect(
      principal,
      (e) => resolve(e),
      () => {},
    ),
    d = b.connect(
      { ...principal, tenantId: 'tenant-b' },
      () => {
        leaked = true;
      },
      () => {},
    );
  let timer;
  try {
    await c.subscribe('updates');
    await d.subscribe('updates');
    await a.publish(principal, 'updates', { ok: true });
    const event = await Promise.race([
      received,
      new Promise(
        (_, reject) => (timer = setTimeout(() => reject(Error('Pub/sub timeout')), 3000)),
      ),
    ]);
    assert.deepEqual(event.data, { ok: true });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(leaked, false);
  } finally {
    clearTimeout(timer);
    await Promise.all([a.close(), b.close()]);
    await Promise.all(clients.map((c) => c.quit()));
  }
});

import { RedisStreamJournal, ReplayGapError } from '@saplings/realtime';
test('live Valkey stream: reconnect, replay after independent client restart, retention and tenant isolation', async () => {
  if (!process.env.TEST_VALKEY_URL) throw Error('TEST_VALKEY_URL required');
  const a = createClient({ url: process.env.TEST_VALKEY_URL }),
    b = a.duplicate();
  await Promise.all([a.connect(), b.connect()]);
  const prefix = 'sapling:test:' + randomUUID() + ':',
    policy = {
      enabled: true,
      authenticate: () => undefined,
      authorize: () => true,
      replayPollMs: 25,
    },
    p = { tenantId: 'tenant-a', userId: 'user' };
  const x = new RealtimeHub({ ...policy, journal: new RedisStreamJournal(a, prefix, 2) }),
    y = new RealtimeHub({ ...policy, journal: new RedisStreamJournal(b, prefix, 2) });
  let received = [];
  try {
    const first = await x.publish(p, 'updates', 1);
    const second = await x.publish(p, 'updates', 2);
    const c = y.connect(
      p,
      (e) => received.push(e),
      () => {},
    );
    await c.subscribe('updates', first);
    assert.equal(received[0].id, second);
    await c.close();
    await x.publish(p, 'updates', 3);
    const d = y.connect(
      p,
      (e) => received.push(e),
      () => {},
    );
    await d.subscribe('updates', second);
    assert.equal(received[1].data, 3);
    const foreign = y.connect(
      { ...p, tenantId: 'tenant-b' },
      () => {
        throw Error('Tenant leak');
      },
      () => {},
    );
    await assert.rejects(foreign.subscribe('updates', second), ReplayGapError);
    const expired = y.connect(
      p,
      () => {},
      () => {},
    );
    await assert.rejects(expired.subscribe('updates', first), ReplayGapError);
  } finally {
    await Promise.all([x.close(), y.close()]);
    await a.del(prefix + 'tenant-a/updates');
    await Promise.all([a.quit(), b.quit()]);
  }
});

import { RedisConnectionAdmission } from '@saplings/realtime';
test('live Valkey admission: independent clients enforce shared tenant cap, release and TTL', async () => {
  if (!process.env.TEST_VALKEY_URL) throw Error('TEST_VALKEY_URL required');
  const a = createClient({ url: process.env.TEST_VALKEY_URL }),
    b = a.duplicate();
  await Promise.all([a.connect(), b.connect()]);
  const prefix = 'sapling:test:' + randomUUID() + ':',
    p = { tenantId: 'tenant-a', userId: 'user' },
    x = new RedisConnectionAdmission(a, 1, prefix),
    y = new RedisConnectionAdmission(b, 1, prefix);
  try {
    const reservations = await Promise.all([x.acquire(p, 500), y.acquire(p, 500)]);
    assert.equal(reservations.filter(Boolean).length, 1);
    await reservations.find(Boolean)();
    const other = await y.acquire(p, 200);
    assert.ok(other);
    assert.equal(await x.acquire(p, 200), undefined);
    await new Promise((r) => setTimeout(r, 300));
    const next = await x.acquire(p, 1000);
    assert.ok(next);
    await next();
  } finally {
    await Promise.all([a.quit(), b.quit()]);
  }
});

import { RedisHierarchicalAdmission } from '@saplings/realtime';
test('live Valkey hierarchical limits across independent clients', async () => {
  if (!process.env.TEST_VALKEY_URL) throw Error('TEST_VALKEY_URL required');
  const a = createClient({ url: process.env.TEST_VALKEY_URL }),
    b = a.duplicate();
  await Promise.all([a.connect(), b.connect()]);
  const prefix = 'sapling:test:' + randomUUID(),
    caps = { global: 2, tenant: 2, user: 1 },
    x = new RedisHierarchicalAdmission(a, caps, prefix),
    y = new RedisHierarchicalAdmission(b, caps, prefix),
    p = { tenantId: 't', userId: 'u' };
  try {
    const results = await Promise.all([x.acquire(p, 5000), y.acquire(p, 5000)]);
    assert.equal(results.filter(Boolean).length, 1);
    const second = await x.acquire({ ...p, userId: 'v' }, 5000);
    assert.ok(second);
    assert.equal(await y.acquire({ tenantId: 'another', userId: 'u' }, 5000), undefined);
    await results.find(Boolean)();
    const third = await y.acquire({ tenantId: 'another', userId: 'u' }, 5000);
    assert.ok(third);
    await second();
    await third();
  } finally {
    await Promise.all([a.quit(), b.quit()]);
  }
});
