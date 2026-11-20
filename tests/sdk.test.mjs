import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  createSapling,
  coverageSummary,
  defineSaplingConfig,
  SaplingError,
} from '../packages/sdk/dist/index.js';
import { runScan } from '../packages/security/dist/index.js';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const ctx = { tenantId: 'tenant-a', actorId: 'admin', permissions: ['*'] };
const other = { tenantId: 'tenant-b', actorId: 'admin', permissions: ['*'] };
function sdk() {
  return createSapling(
    defineSaplingConfig({
      app: { id: 'test', environment: 'test' },
      security: { defender: { rateLimit: { enabled: true, maxRequests: 3, windowMs: 60000 } } },
    }),
  );
}

test('inventory includes all SaaS and scanner categories', () => {
  const c = coverageSummary();
  assert.ok(c.saas.total >= 100);
  assert.equal(c.scanners.total, 41);
});
test('tenant isolation for resources and storage', async () => {
  const s = sdk();
  const project = await s.projects.create(ctx, { name: 'private' });
  assert.equal((await s.projects.get(ctx, project.id)).name, 'private');
  assert.equal(await s.projects.get(other, project.id), undefined);
  const v = await s.storage.upload(ctx, {
    key: 'docs/a.txt',
    data: new TextEncoder().encode('hello'),
  });
  assert.ok(v.version);
  assert.equal(await s.storage.download(other, 'docs/a.txt'), undefined);
  assert.equal(
    new TextDecoder().decode((await s.storage.download(ctx, 'docs/a.txt')).data),
    'hello',
  );
  await assert.rejects(() => s.storage.upload(ctx, { key: '../escape', data: new Uint8Array() }), {
    code: 'BAD_OBJECT_KEY',
  });
});
test('RBAC defaults deny and permission policy allows explicit roles', async () => {
  const s = sdk();
  const unpriv = { tenantId: 't', actorId: 'no-permissions' };
  await assert.rejects(() => s.projects.create(unpriv, { name: 'deny' }), { code: 'FORBIDDEN' });
  await s.access.setRole({ ...unpriv, permissions: ['roles:write', 'projects:read'] }, 'viewer', [
    'projects:read',
  ]);
  assert.equal(await s.access.has({ ...unpriv, roles: ['viewer'] }, 'projects:read'), true);
  assert.equal(await s.access.has({ ...unpriv, roles: ['viewer'] }, 'projects:write'), false);
});
test('API key is tenant-scoped, time-limited, revoked and never listed raw', async () => {
  const s = sdk(),
    result = await s.identity.createApiKey(ctx, { name: 'deploy', scopes: ['projects:read'] });
  assert.equal((await s.identity.verifyApiKey('tenant-a', result.secret)).id, result.id);
  assert.equal(await s.identity.verifyApiKey('tenant-b', result.secret), undefined);
  assert.equal((await s.identity.listKeys(ctx))[0].digest, undefined);
  await s.identity.revokeApiKey(ctx, result.id);
  assert.equal(await s.identity.verifyApiKey('tenant-a', result.secret), undefined);
});
test('metering quota enforcement and flag determinism', async () => {
  const s = sdk();
  await s.billing.setQuota(ctx, 'api', 2);
  await s.billing.meter(ctx, 'api');
  await s.billing.meter(ctx, 'api');
  await assert.rejects(() => s.billing.meter(ctx, 'api'), { code: 'QUOTA_EXCEEDED' });
  await s.flags.set(ctx, { key: 'beta', enabled: true, rollout: 35, variants: { A: 50, B: 50 } });
  assert.deepEqual(
    await s.flags.evaluate(ctx, 'beta', 'alice'),
    await s.flags.evaluate(ctx, 'beta', 'alice'),
  );
});
test('job retries, webhook signing, audit', async () => {
  const s = sdk();
  let attempts = 0;
  s.jobs.register('x', async () => {
    attempts++;
    throw new Error('test retry');
  });
  const j = await s.jobs.enqueue(
    ctx,
    'x',
    { some: 'data' },
    { maxAttempts: 1, idempotencyKey: 'abc' },
  );
  assert.equal((await s.jobs.workNext(ctx)).status, 'dead');
  assert.equal(attempts, 1);
  assert.equal(
    (await s.jobs.enqueue(ctx, 'x', { some: 'data' }, { maxAttempts: 1, idempotencyKey: 'abc' }))
      .id,
    j.id,
  );
  const proof = s.webhooks.sign('{"a":1}', 'local-secret-with-adequate-length');
  assert.equal(
    s.webhooks.verify(
      '{"a":1}',
      'local-secret-with-adequate-length',
      proof.timestamp,
      proof.signature,
    ),
    true,
  );
  assert.equal(
    s.webhooks.verify(
      '{"a":2}',
      'local-secret-with-adequate-length',
      proof.timestamp,
      proof.signature,
    ),
    false,
  );
  assert.ok((await s.audit.list(ctx)).length > 0);
});
test('defender blocks high-confidence probes and enforces per-identity rate', () => {
  const s = sdk();
  const request = { method: 'GET', url: '/index', headers: {}, ip: '127.0.0.1' };
  const first = s.defender.evaluate({ ...request, url: '/.env' });
  assert.equal(first.action, 'block');
  const a = s.defender.evaluate(request);
  const b = s.defender.evaluate(request);
  const c = s.defender.evaluate(request);
  assert.equal(a.action, 'allow');
  assert.equal(b.action, 'allow');
  assert.equal(c.action, 'block');
});
test('production configuration refuses volatile store', () => {
  assert.throws(() => createSapling({ app: { id: 'production', environment: 'production' } }), {
    code: 'PRODUCTION_STORE_REQUIRED',
  });
});
test('scanner detects source code anti-pattern and redacts secret', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sapling-test-'));
  try {
    await writeFile(
      join(dir, 'test.ts'),
      'const api_key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAA";\nlocalStorage.setItem("access_token", token);\n',
    );
    const scan = await runScan({ root: dir });
    assert.ok(scan.findings.some((f) => f.checkId === 'EXPOSED_KEY'));
    assert.ok(!JSON.stringify(scan).includes('AAAAAAAAAAAAAAAAAAAAAAAAAAAA'));
    assert.ok(scan.executedScannerIds.includes('SCAN-04'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('capability adapter routing respects config toggles and explicit provider', async () => {
  const s = createSapling({
    app: { id: 'extensions', environment: 'test' },
    features: {
      'SAAS-001': { enabled: true, options: { tier: 'custom' } },
      'SAAS-002': { enabled: false },
    },
    providers: {
      capabilities: {
        'SAAS-001': {
          async execute({ ctx, action, options }) {
            return { tenant: ctx.tenantId, action, tier: options.tier };
          },
        },
      },
    },
  });
  assert.deepEqual(await s.capabilities.invoke(ctx, 'SAAS-001', 'register'), {
    tenant: 'tenant-a',
    action: 'register',
    tier: 'custom',
  });
  await assert.rejects(() => s.capabilities.invoke(ctx, 'SAAS-002', 'authenticate'), {
    code: 'FEATURE_DISABLED',
  });
  await assert.rejects(() => s.capabilities.invoke(ctx, 'SAAS-003', 'verify'), {
    code: 'UNKNOWN_ACTION',
  });
});
