/** Source-aware v0.12 audit; never marks a feature production-complete from registration or mock tests. */
import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8'),
  write = (p, s) => fs.writeFileSync(p, s.trimEnd() + '\n');
const features = JSON.parse(read('docs/technical-specifications/saas-evaluation.json'));
if (features.length !== 182) throw Error('Expected exactly 182 SaaS features');
const version = JSON.parse(read('package.json')).version;
const targets = {
  accounts: {
    ids: [1, 2, 3, 4, 5, 6, 9, 18],
    summary:
      'Configurable password strength/breach policy, normalized/atomic registration, reset challenge consumption and session invalidation.',
    files: [
      'packages/kingsman/src/saas-accounts.ts',
      'packages/sdk/src/types.ts',
      'tests/v012.test.mjs',
    ],
    newIds: [1, 4],
  },
  access: {
    ids: [15, 16, 17, 25, 26, 27, 28, 29, 33],
    summary:
      'Authorization checks and system-field immutability for resource mutations, role and impersonation boundaries.',
    files: [
      'packages/sdk/src/resources.ts',
      'packages/kingsman/src/saas-access.ts',
      'tests/v012.test.mjs',
    ],
    newIds: [25, 26, 27, 28, 29],
  },
  billing: {
    ids: [34, 35, 36, 37, 38, 39, 40, 41, 45, 46],
    summary:
      'Atomic usage event deduplication, quota/audit consistency, one active subscription per plan/customer, invoice deduplication and coupon limits.',
    files: ['packages/sdk/src/billing.ts', 'packages/sdk/src/commerce.ts', 'tests/v012.test.mjs'],
    newIds: [35, 38, 39, 40, 41, 45],
  },
  domains: {
    ids: [61, 62, 88, 89, 90, 93, 97, 98, 129, 130],
    summary:
      'Domain row/field policies now apply to bounded data imports, exports, streaming, search, pagination and filters; destructive paths respect legal hold.',
    files: [
      'packages/sdk/src/domain-policy.ts',
      'packages/sdk/src/data.ts',
      'packages/sdk/src/registry.ts',
      'tests/v012.test.mjs',
    ],
    newIds: [88, 89, 90, 93, 97, 98, 129, 130],
  },
  crud: {
    ids: [132, 143, 144, 146, 147, 151, 152, 153, 171, 175, 176, 179, 181],
    summary:
      'Configured domain policy now governs catalog-backed generic CRUD; production use without a matching policy fails closed; partial updates no longer require creation-only fields.',
    files: [
      'packages/sdk/src/registry.ts',
      'packages/sdk/src/domain-policy.ts',
      'tests/v012.test.mjs',
    ],
    newIds: [132, 143, 144, 146, 147, 151, 152, 153, 171, 175, 176, 179, 181],
  },
  business: {
    ids: [173, 174, 177, 178, 180, 182],
    summary:
      'Validated task assignees and transitions, ticket transitions and scoped listing, approval/admin read permissions and auditable ownership transfers.',
    files: [
      'packages/sdk/src/business-workflows.ts',
      'packages/sdk/src/registry.ts',
      'tests/v012.test.mjs',
    ],
    newIds: [173, 174, 178, 180, 182],
  },
  shared: {
    ids: features.map((f) => Number(f.id.slice(-3))),
    summary:
      'All catalog IDs have disable/permission/unknown-action/frozen-tenant checks, plus configurable per-action input/output validation and application resource authorization; exact application schemas are not automatically supplied.',
    files: [
      'packages/sdk/src/capabilities.ts',
      'packages/sdk/src/types.ts',
      'packages/sdk/src/registry.ts',
      'tests/v012.test.mjs',
    ],
    newIds: [],
  },
};
const checks = features.map((f) => {
  const number = Number(f.id.slice(-3)),
    target = Object.entries(targets).filter(([k, t]) => k !== 'shared' && t.ids.includes(number)),
    implemented = target.some(([k, t]) => t.newIds.includes(number));
  const base = `docs/features/saas/${f.id}`;
  for (const file of [
    'PRODUCT_SPECIFICATION.md',
    'TECHNICAL_SPECIFICATION.md',
    'GAPS_AND_IMPROVEMENTS.md',
  ])
    if (!fs.existsSync(`${base}/${file}`)) throw Error('Missing dossier ' + f.id + '/' + file);
  const gaps = read(`${base}/GAPS_AND_IMPROVEMENTS.md`);
  const checklist = gaps.split('\n').filter((l) => l.startsWith('- [ ] '));
  if (checklist.length < 8) throw Error('Insufficient gap checklist ' + f.id);
  const active = target.flatMap(([k, t]) => t.files),
    modules = target.map(([k]) => k);
  const record = {
    id: f.id,
    name: f.name,
    module: f.module,
    kind: f.kind,
    registeredActions: f.registeredActions,
    reviewed: true,
    sharedChecks: [
      'disabled feature rejects',
      'unauthorized actor rejects',
      'unknown action rejects',
      'frozen tenant denies non-offboarding capability',
    ],
    engineeringState: implemented ? 'cross-cutting-and-domain-hardening' : 'baseline-reference',
    domains: modules,
    sources: [...new Set([...active, ...f.relatedSources])],
    testEvidence: 'tests/v012.test.mjs',
    liveAcceptanceVerified: false,
    productionReady: false,
    openChecklistItems: checklist.length,
    blockingGap: checklist[0]?.slice(6),
    nextStep: f.acceptance,
  };
  const notes =
    target.map(([k, t]) => `- **${k}:** ${t.summary}`).join('\n') ||
    '- No new feature-specific implementation in this patch; original gap checklist remains authoritative.';
  const stamp = `\n## v${version} source-based engineering review\n\n**State:** ${record.engineeringState}. **Production-ready:** no; relevant live-provider, deployment and application-specific acceptance evidence remains outstanding.\n\n### Implemented and verified shared controls\n- Feature enable/disable, permission denial, unknown action and tenant offboarding freeze, tested against the complete 182-feature inventory. Optional per-action input/output schemas and resource authorization hooks are also tested; actual application policies are not generated automatically.\n${notes}\n\n**Source references:** ${record.sources.map((p) => '`' + p + '`').join(', ')}. **Tests:** \`tests/v012.test.mjs\` for shared controls and listed enhancements. Per-feature end-to-end verification is still required.\n\n**What remains:** The original P0/P1/P2 checklist above stays open until the feature's exact acceptance scenario and independent evidence are validated. Catalog registration, generated documentation and local mock tests are not closure.\n`;
  const tech = `\n## v${version} implementation cross-check\n\n${notes}\n\nSee the [release audit](../../../evidence/saas-gap-audit.json) for source references, shared contract checks and remaining feature-specific verification. The original implementation path above remains in place; the new shared controls do not replace application-defined domain policies.\n`;
  const product = `\n## v${version} acceptance update\n\nNew common acceptance requirements: denied feature calls, unauthorized actors, unknown operations, and offboarded tenant operations must all fail without side effects. For configured domain policies, unauthorized fields and rows must not be disclosed. ${implemented ? 'The specified source path received cross-cutting or feature-specific hardening; original product requirements still apply.' : 'This feature retains its prior reference implementation and still requires its feature-specific functional acceptance.'}\n`;
  const replace = (file, marker, content) => {
    const original = read(file);
    write(
      file,
      original.includes(marker)
        ? original.slice(0, original.indexOf(marker)) + content
        : original + content,
    );
  };
  replace(
    `${base}/GAPS_AND_IMPROVEMENTS.md`,
    `## v${version} source-based engineering review`,
    stamp,
  );
  replace(`${base}/TECHNICAL_SPECIFICATION.md`, `## v${version} implementation cross-check`, tech);
  replace(`${base}/PRODUCT_SPECIFICATION.md`, `## v${version} acceptance update`, product);
  return record;
});
const summary = {
  version,
  total: checks.length,
  reviewed: checks.filter((r) => r.reviewed).length,
  enhanced: checks.filter((r) => r.engineeringState !== 'baseline-reference').length,
  baseline: checks.filter((r) => r.engineeringState === 'baseline-reference').length,
  productionReady: checks.filter((r) => r.productionReady).length,
  results: checks,
};
write('docs/evidence/saas-gap-audit.json', JSON.stringify(summary, null, 2));
let table = `# SaaS 182-feature source audit — ${version}\n\nAll **${summary.reviewed}/182** dossiers reviewed and updated with shared input/output validation and authorization extension points. **${summary.enhanced}** features reference new cross-cutting/domain hardening; **${summary.baseline}** retain the original reference path. **0** features are independently certified production-ready. Shared contract tests are not 182 full end-to-end implementations.\n\nThe top unchecked P0 gap is retained for every feature. Original feature documentation remains detailed and open until each acceptance criterion is independently demonstrated. External provider integrations require merchant/cloud credentials; deployments, legal retention, real production load and independent audit cannot be truthfully closed in a local build.\n\n| Feature | Current implementation | Shared/domain enhancements | Most important remaining P0 requirement |\n|---|---|---|---|\n`;
for (const r of checks)
  table += `| [${r.id}](../features/saas/${r.id}/GAPS_AND_IMPROVEMENTS.md) ${r.name.replaceAll('|', '/')} | ${r.kind} | ${r.domains.join(', ') || 'shared only'} | ${r.blockingGap.replaceAll('|', '/')} |\n`;
write('docs/evidence/SAAS_182_GAP_AUDIT.md', table);
console.log(
  JSON.stringify(
    {
      version,
      reviewed: summary.reviewed,
      enhanced: summary.enhanced,
      baseline: summary.baseline,
      productionReady: summary.productionReady,
      codeDomainCounts: Object.fromEntries(
        Object.entries(targets).map(([k, v]) => [k, v.newIds.length]),
      ),
    },
    null,
    2,
  ),
);
