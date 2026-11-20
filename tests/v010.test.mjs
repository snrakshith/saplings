import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSapling, resolveSaplingConfig } from '../packages/sdk/dist/index.js';
const app = { id: 'dx', environment: 'test' };
test('flat SDK exposes all 15 services without exposing mutable registry', () => {
  const s = createSapling({ app });
  for (const name of [
    'providerWorkflows',
    'governance',
    'domains',
    'providerOperations',
    'recurring',
    'offboarding',
    'impersonation',
    'operations',
    'accounts',
    'commerce',
    'data',
    'analytics',
    'automation',
    'lifecycle',
    'metrics',
  ]) {
    assert.ok(s[name]);
    assert.equal(s[name], s[name]);
  }
  assert.equal('expanded' in s, false);
  assert.equal(s.featureManifest().length, 182);
  assert.equal('bindings' in s, false);
});
test('new config and legacy config normalize without merging ambiguous policies', () => {
  const services = { dataCollections: ['documents'] };
  assert.equal(resolveSaplingConfig({ app, services }).services, services);
  assert.equal(resolveSaplingConfig({ app, expanded: services }).services, services);
  assert.equal('expanded' in resolveSaplingConfig({ app, expanded: services }), false);
  assert.throws(() => resolveSaplingConfig({ app, services, expanded: services }), /not both/);
});
test('typed catalog action inventory matches all runtime registrations', () => {
  const s = createSapling({ app });
  const text = readFileSync(
    new URL('../packages/sdk/src/feature-types.ts', import.meta.url),
    'utf8',
  );
  const map = Object.fromEntries(
    [...text.matchAll(/^  "(SAAS-\d+)": (.*);$/gm)].map((m) => [
      m[1],
      m[2]
        .split(' | ')
        .map((x) => JSON.parse(x))
        .sort(),
    ]),
  );
  assert.equal(Object.keys(map).length, 182);
  for (const f of s.featureManifest())
    assert.deepEqual(map[f.featureId], [...f.actions].sort(), f.featureId);
});
test('flat domain methods enforce configured policies', async () => {
  const s = createSapling({
    app,
    services: {
      domainPolicies: {
        documents: {
          read: ['title'],
          write: ['title'],
          authorize: (ctx) => ctx.actorId === 'owner',
        },
      },
    },
  });
  const c = { tenantId: 't', actorId: 'owner' };
  await s.domains.mutate(c, 'documents', 'id', 'create', { title: 'A' });
  assert.equal((await s.domains.get(c, 'documents', 'id')).title, 'A');
  await assert.rejects(s.domains.get({ ...c, actorId: 'other' }, 'documents', 'id'), /denied/);
});
test('pnpm audit evidence imports advisories and rejects malformed evidence', async () => {
  const { runScan } = await import('@saplings/security');
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const dir = await mkdtemp(join(tmpdir(), 'pnpm-audit-'));
  try {
    const path = join(dir, 'audit.json');
    await writeFile(
      path,
      JSON.stringify({
        advisories: { 123: { module_name: 'example', severity: 'high' } },
        metadata: { vulnerabilities: { high: 1 } },
      }),
    );
    const result = await runScan({
      enabledScannerIds: ['SCAN-15'],
      reports: { 'SCAN-15': { format: 'pnpm-audit', path } },
    });
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].severity, 'high');
    await writeFile(path, JSON.stringify({ advisories: [], metadata: {} }));
    const bad = await runScan({
      enabledScannerIds: ['SCAN-15'],
      reports: { 'SCAN-15': { format: 'pnpm-audit', path } },
    });
    assert.deepEqual(bad.failedScannerIds, ['SCAN-15']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
