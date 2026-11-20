import { test } from 'vitest';
import assert from 'node:assert/strict';
import { randomBytes, createHmac } from 'node:crypto';
import { mkdtemp, writeFile, utimes, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createSapling,
  totp,
  base32,
  GitHubWorkflowAdapter,
  KubernetesScaleAdapter,
  RazorpayWebhookAdapter,
} from '../packages/sdk/dist/index.js';
import { runScan } from '../packages/security/dist/index.js';
const c = { tenantId: 't1', actorId: 'operator', permissions: ['*'] },
  other = { ...c, tenantId: 't2' };
const secret = 'test-only-signing-secret-not-for-prod';
const make = (expanded = {}) =>
  createSapling({
    app: { id: 'v03-test', environment: 'test' },
    expanded: { encryptionKey: randomBytes(32), ...expanded },
  });
async function user(a, email) {
  const u = await a.register(c.tenantId, { email, password: 'a long test password' });
  const ch = await a.challenge(c.tenantId, email, 'verify');
  await a.consume(c.tenantId, ch.secret, 'verify');
  return u;
}
test('TOTP RFC vector', () =>
  assert.equal(totp(base32(Buffer.from('12345678901234567890')), 1), '287082'));
test('MFA blocks password and passwordless session issuance, rejects replay, supports restricted impersonation', async () => {
  const s = make({ impersonationScopes: ['projects:read'] }),
    a = s.accounts,
    u = await user(a, 'admin@example.test'),
    target = await user(a, 'target@example.test');
  const ctx = { ...c, actorId: u.id };
  const initial = await a.login(c.tenantId, { email: u.email, password: 'a long test password' });
  const f = await a.enrollMfa(ctx, { password: 'a long test password' });
  const clock = Date.now;
  let t = clock();
  Date.now = () => t;
  try {
    await a.confirmMfa(ctx, totp(f.secret, Math.floor(t / 30000)));
    assert.equal(await a.verify(c.tenantId, initial.token), undefined);
    const raw = await s.store.get(c.tenantId, 'mfa-factors', u.id);
    assert.ok(!JSON.stringify(raw).includes(f.secret));
    const p = await a.login(c.tenantId, { email: u.email, password: 'a long test password' });
    assert.equal(p.mfaRequired, true);
    assert.equal(p.token, undefined);
    const ch = await a.challenge(c.tenantId, u.email, 'passwordless');
    assert.equal((await a.consume(c.tenantId, ch.secret, 'passwordless')).mfaRequired, true);
    await assert.rejects(
      () => a.verifyMfa(c.tenantId, p.challenge, totp(f.secret, Math.floor(t / 30000))),
      { code: 'UNAUTHENTICATED' },
    );
    t += 31000;
    const session = await a.verifyMfa(
      c.tenantId,
      p.challenge,
      totp(f.secret, Math.floor(t / 30000)),
    );
    assert.equal((await a.verify(c.tenantId, session.token)).actorId, u.id);
    await assert.rejects(
      () => a.verifyMfa(c.tenantId, p.challenge, totp(f.secret, Math.floor(t / 30000))),
      { code: 'UNAUTHENTICATED' },
    );
    const grant = await s.impersonation.start(ctx, {
      sessionToken: session.token,
      targetId: target.id,
      reason: 'support case',
      scopes: ['projects:read'],
    });
    const imp = await s.impersonation.verify(c.tenantId, grant.token);
    assert.equal(imp.impersonatorId, u.id);
    assert.deepEqual(imp.permissions, ['projects:read']);
    await assert.rejects(() => s.projects.create(imp, { name: 'deny' }), { code: 'FORBIDDEN' });
    await assert.rejects(() => s.capabilities.invoke(imp, 'SAAS-001', 'register'), {
      code: 'FORBIDDEN',
    });
    await s.impersonation.stop(ctx, grant.token);
    assert.equal(await s.impersonation.verify(c.tenantId, grant.token), undefined);
  } finally {
    Date.now = clock;
  }
});
test('vault encrypts, rotates, and isolates tenant secrets', async () => {
  const s = make(),
    o = s.operations;
  assert.equal((await o.vault(c, 'put', { name: 'key', value: 'secret-first' })).version, 1);
  assert.equal((await o.vault(c, 'rotate', { name: 'key', value: 'secret-second' })).version, 2);
  assert.deepEqual(await o.vault(c, 'get', { name: 'key' }), {
    value: 'secret-second',
    version: 2,
  });
  assert.ok(
    !JSON.stringify(await s.store.list(c.tenantId, 'vault-secrets')).includes('secret-second'),
  );
  await assert.rejects(() => o.vault(other, 'get', { name: 'key' }));
});
test('logical restore is encrypted and does not overwrite', async () => {
  const s = make(),
    o = s.operations;
  const p = await s.projects.create(c, { name: 'restore me' });
  const b = await o.backup(c, 'backup', {});
  await assert.rejects(() => o.backup(c, 'restore', { id: b.id, confirm: true }), {
    code: 'CONFLICT',
  });
  await s.store.delete(c.tenantId, 'projects', p.id);
  assert.equal((await o.backup(c, 'restore', { id: b.id, confirm: true })).restored, 1);
  assert.equal((await s.projects.get(c, p.id)).name, 'restore me');
  await assert.rejects(() => o.backup(other, 'restore', { id: b.id, confirm: true }));
});
test('signed callbacks are tenant-bound, replay-safe and relayed to worker', async () => {
  const seen = [];
  const s = make({
    operations: { webhookSecrets: { example: secret } },
    worker: { eventHandlers: { 'webhook.example': async (_c, p) => seen.push(p) } },
  });
  const rawBody = JSON.stringify({ id: 'evt1', tenantId: c.tenantId });
  const proof = s.webhooks.sign(rawBody, secret),
    input = { source: 'example', rawBody, ...proof };
  await assert.rejects(() => s.operations.webhook(other, 'reconcile', input), {
    code: 'FORBIDDEN',
  });
  assert.deepEqual(await s.operations.webhook(c, 'reconcile', input), { processed: true });
  assert.deepEqual(await s.operations.webhook(c, 'reconcile', input), { duplicate: true });
  assert.equal(await s.worker.tick([c]), 1);
  assert.equal(seen.length, 1);
  assert.equal(await s.worker.tick([c]), 0);
});
test('worker generates reports and enforces idempotency conflict', async () => {
  const s = make(),
    w = s.automation;
  await w.enqueue(c, { type: 'report.generate', payload: {}, idempotencyKey: 'r1' });
  await assert.rejects(
    () =>
      w.enqueue(c, {
        type: 'report.generate',
        payload: { name: 'different' },
        idempotencyKey: 'r1',
      }),
    { code: 'CONFLICT' },
  );
  assert.equal(await s.worker.tick([c]), 1);
  assert.equal((await s.store.list(c.tenantId, 'generated-reports')).length, 1);
  assert.equal((await s.store.get(c.tenantId, 'durable-jobs', 'r1')).status, 'completed');
});
test('concurrent quota reservations do not exceed quota', async () => {
  const s = make();
  await s.billing.setQuota(c, 'api', 3);
  const result = await Promise.allSettled(
    Array.from({ length: 12 }, () => s.billing.meter(c, 'api')),
  );
  assert.equal(result.filter((x) => x.status === 'fulfilled').length, 3);
});
test('audit is append-only', async () => {
  const s = make();
  const row = await s.audit.record(c, 'test', 'test');
  await assert.rejects(() => s.store.delete(c.tenantId, 'audit', row.id));
});
test('payment webhook validates tenant order and reconciles capture only once', async () => {
  const s = make(),
    a = new RazorpayWebhookAdapter(s.store, secret);
  await s.store.put(c.tenantId, 'payment-orders', {
    id: 'order_a',
    amountMinor: 1000,
    currency: 'INR',
    status: 'created',
  });
  const rawBody = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_a',
          order_id: 'order_a',
          amount: 1000,
          currency: 'INR',
          status: 'captured',
        },
      },
    },
  });
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
  const req = {
    ctx: c,
    featureId: 'SAAS-050',
    action: 'reconcile',
    input: { rawBody, signature },
    options: {},
  };
  await assert.rejects(() => a.execute({ ...req, ctx: other }), { code: 'PAYMENT_MISMATCH' });
  await assert.rejects(() => a.execute({ ...req, input: { rawBody, signature: '0'.repeat(64) } }), {
    code: 'UNAUTHENTICATED',
  });
  assert.equal((await a.execute(req)).processed, true);
  assert.equal((await a.execute(req)).duplicate, true);
  assert.equal((await s.store.get(c.tenantId, 'verified-payments', 'pay_a')).status, 'captured');
});
test('configured GitHub and Kubernetes adapters enforce tenant and confirmation (mock transport)', async () => {
  const original = globalThis.fetch,
    calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('{}', { status: 200 });
  };
  try {
    const g = new GitHubWorkflowAdapter('owner', 'repo', async () => 'mock', {
      'SAAS-165:apply': {
        workflow: 'deploy.yml',
        ref: 'main',
        tenantIds: ['t1'],
        inputNames: ['tenant_id'],
      },
    });
    const req = {
      ctx: c,
      featureId: 'SAAS-165',
      action: 'apply',
      input: { confirm: true, ref: 'evil' },
      options: {},
    };
    await assert.rejects(() => g.execute({ ...req, ctx: other }), { code: 'FORBIDDEN' });
    await assert.rejects(() => g.execute({ ...req, input: {} }));
    await g.execute(req);
    assert.deepEqual(JSON.parse(calls[0].init.body), { ref: 'main', inputs: { tenant_id: 't1' } });
    const k = new KubernetesScaleAdapter('https://cluster.example.test', async () => 'mock', {
      api: { namespace: 'app', deployment: 'api', tenantIds: ['t1'], min: 1, max: 4 },
    });
    const kr = {
      ctx: c,
      featureId: 'SAAS-167',
      action: 'scale',
      input: { target: 'api', confirm: true, replicas: 3 },
      options: {},
    };
    await assert.rejects(() => k.execute({ ...kr, input: { ...kr.input, replicas: 99 } }));
    await k.execute(kr);
    assert.equal(calls[1].init.method, 'PATCH');
    assert.deepEqual(JSON.parse(calls[1].init.body), { spec: { replicas: 3 } });
  } finally {
    globalThis.fetch = original;
  }
});
test('scanner imports dependency and review evidence and fails stale evidence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sapling-v03-'));
  try {
    const npm = join(dir, 'npm.json'),
      review = join(dir, 'review.json');
    await writeFile(
      npm,
      JSON.stringify({ auditReportVersion: 2, vulnerabilities: { example: { severity: 'high' } } }),
    );
    await writeFile(
      review,
      JSON.stringify({
        scannerId: 'SCAN-15',
        completed: true,
        checks: [{ id: 'baseline', status: 'fail', severity: 'medium' }],
      }),
    );
    const opts = {
      root: dir,
      enabledScannerIds: ['SCAN-02', 'SCAN-15'],
      reports: {
        'SCAN-02': { format: 'npm-audit', path: npm },
        'SCAN-15': { format: 'review', path: review },
      },
    };
    const r = await runScan(opts);
    assert.ok(r.findings.some((x) => x.checkId === 'example'));
    assert.ok(r.executedScannerIds.includes('SCAN-15'));
    await utimes(review, new Date(0), new Date(0));
    const stale = await runScan(opts);
    assert.ok(stale.failedScannerIds.includes('SCAN-15'));
    assert.ok(stale.notExecutedScannerIds.includes('SCAN-15'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('readiness fails when a configured dependency fails', async () => {
  const s = make({
    operations: {
      readiness: {
        provider: async () => {
          throw Error('offline');
        },
      },
    },
  });
  const result = await s.readiness();
  assert.equal(result.status, 'not-ready');
  assert.equal(result.checks.provider, false);
});
