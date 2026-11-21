// Deterministic source/catalog evaluation; not a production certification.
import fs from 'node:fs';
import path from 'node:path';
const dir = 'docs/technical-specifications';
fs.mkdirSync(dir, { recursive: true });
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const features = read('docs/saas-features.json'),
  operations = read('docs/feature-operations.json'),
  scanners = read('docs/security-scanners.json'),
  suites = read('docs/quality/suite-parity.json');
const byId = new Map(operations.map((o) => [o.featureId, o]));
if (
  features.length !== 182 ||
  byId.size !== 182 ||
  scanners.length !== 41 ||
  suites.length !== 32 ||
  new Set(features.map((f) => f.id)).size !== 182 ||
  features.some((f) => !byId.has(f.id))
)
  throw Error('Inventory mismatch');
const refs = {
  identity: [
    'identity/accounts.ts',
    'identity/identity.ts',
    'identity/federation.ts',
    'identity/totp.ts',
    'identity/access.ts',
  ],
  tenancy: [
    'tenancy/offboarding.ts',
    'data/governance.ts',
    'data/domain-policy.ts',
    'tenancy/resources.ts',
    'runtime/store.ts',
    'identity/access.ts',
  ],
  billing: [
    'billing/billing.ts',
    'billing/commerce.ts',
    'billing/recurring.ts',
    'workflows/business-workflows.ts',
    'billing/billing-policy.ts',
    'billing/stripe-recurring.ts',
    'payments/razorpay-webhook.ts',
    'payments/cashfree.ts',
    'payments/stripe-payment.ts',
    'integrations/integrations.ts',
  ],
  security: [
    'platform/operations.ts',
    'audit/audit.ts',
    'data/data.ts',
    'security/security-state.ts',
  ],
  notifications: [
    'integrations/integrations.ts',
    'workflows/worker.ts',
    'capabilities/registry.ts',
  ],
  storage: ['storage/storage.ts', 'data/data.ts', 'storage/media.ts'],
  analytics: ['analytics/analytics.ts', 'feature-flags/flags.ts', 'tenancy/resources.ts'],
  workflows: [
    'workflows/automation.ts',
    'data/governance.ts',
    'workflows/worker.ts',
    'workflows/jobs.ts',
  ],
  operations: [
    'platform/providers.ts',
    'platform/provider-operations.ts',
    'workflows/provider-workflow.ts',
    'platform/control-plane.ts',
    'runtime/reliability.ts',
    'platform/operations.ts',
    'workflows/worker.ts',
  ],
};
const rows = features.map((f) => {
  const op = byId.get(f.id);
  return {
    ...f,
    kind: op.kind,
    registeredActions: op.actions,
    source: 'packages/sdk/src/capabilities/registry.ts',
    relatedSources: (refs[f.module] ?? []).map((x) => 'packages/sdk/src/' + x),
    verification:
      'Catalog registration checked; feature-specific end-to-end proof not established.',
    acceptance:
      op.kind === 'provider'
        ? 'Configure named provider, verify permissions, success, failure, replay/idempotency, tenant isolation and reconciliation against sandbox.'
        : op.kind === 'hybrid'
          ? 'Execute registered operations and configured dependency paths; verify failure, concurrency, tenant isolation, app authorization and deployment behavior.'
          : 'Execute all registered actions (or exported typed utility), test input boundaries, error paths, authorization, tenant isolation and persistence/concurrency where applicable.',
  };
});
const md = (s) =>
  String(s ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
const write = (f, s) => fs.writeFileSync(path.join(dir, f), s + '\n');
write('saas-evaluation.json', JSON.stringify(rows, null, 2));
let doc =
  '# SaaS technical evaluation — v0.17.0\n\n182 original IDs. Binding source for every row: `packages/sdk/src/capabilities/registry.ts`. This inventory describes registered implementation paths, not completed production features. The **acceptance criterion** is mandatory in addition to application-level RBAC/ABAC, observability and live gates. Related source references are in `saas-evaluation.json`.\n';
for (const category of [...new Set(rows.map((r) => r.category))]) {
  doc += `\n## ${category}\n\n| ID / feature | Implementation | Operations | Dependency / limitation | Acceptance criterion |\n|---|---|---|---|---|\n`;
  for (const f of rows.filter((r) => r.category === category))
    doc += `| ${f.id} ${md(f.name)} | ${f.kind} | ${md(f.registeredActions.join(', '))} | ${md([f.providerPath, f.limitations].filter(Boolean).join('; '))} | ${md(f.acceptance)} |\n`;
}
write('SAAS_FEATURE_EVALUATION.md', doc);
let sc =
  '# Security scanner technical evaluation — v0.17.0\n\nAll 41 categories preserved. Static rules are heuristics, passive HTTP/DNS require approved targets, and report-only checks require an external engine. Never scan a third party without authorization. Source: `packages/security/src/scanner.ts`, `report-adapters.ts`, `evidence-adapters.ts`.\n\n| ID | Category | Execution | Acceptance / remaining work |\n|---|---|---|---|\n';
for (const s of scanners)
  sc += `| ${s.id} | ${md(s.name)} | ${md(s.execution)} | ${s.execution === 'external' ? 'Configure external engine and import scoped, current evidence.' : 'Verify seeded positive and negative fixtures; run on authorized target where applicable; review false positives and misses.'} No verified full vendor check parity. |\n`;
write('SECURITY_SCANNER_EVALUATION.md', sc);
write(
  'scanner-evaluation.json',
  JSON.stringify(
    scanners.map((s) => ({
      ...s,
      verification:
        'Inventory only; category completeness and independent efficacy not established',
    })),
    null,
    2,
  ),
);
let q =
  '# Quality suite technical evaluation — v0.17.0\n\nOriginal suite implementations retained. Full acceptance requires real engine and application fixtures. The detailed original engine assertions and limitations are preserved in `../quality/IMPLEMENTATION_MATRIX.md`.\n\n| Suite | Engine/source | Source parity | Release validation |\n|---|---|---|---|\n';
for (const s of suites)
  q += `| ${md(s.suite)} | ${md(s.source)} | ${md(s.sourceParity)} | ${md(s.liveValidation)} |\n`;
write('QUALITY_EVALUATION.md', q);
write('quality-evaluation.json', JSON.stringify(suites, null, 2));
const packages = fs
  .readdirSync('packages')
  .filter((n) => fs.existsSync(`packages/${n}/package.json`))
  .map((n) => {
    const p = read(`packages/${n}/package.json`);
    return {
      package: p.name,
      version: p.version,
      dependencies: p.dependencies ?? {},
      peerDependencies: p.peerDependencies ?? {},
      source: `packages/${n}`,
    };
  });
write('package-inventory.json', JSON.stringify(packages, null, 2));
console.log(
  JSON.stringify(
    {
      version: '0.17.0',
      features: features.length,
      scanners: scanners.length,
      qualitySuites: suites.length,
      packages: packages.length,
      classification: rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] ?? 0) + 1), a), {}),
      status: 'inventory-verified; not production approval',
    },
    null,
    2,
  ),
);
