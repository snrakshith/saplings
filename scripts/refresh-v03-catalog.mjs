import fs from 'node:fs';
import { createSapling } from '@saplings/sdk';
const sdk = createSapling({ app: { id: 'catalog', environment: 'development' } });
const manifest = sdk.featureManifest().sort((a, b) => a.featureId.localeCompare(b.featureId));
const original = JSON.parse(fs.readFileSync('docs/saas-features.json'));
const scanners = JSON.parse(fs.readFileSync('docs/security-scanners.json'));
if (
  manifest.length !== 182 ||
  new Set(manifest.map((x) => x.featureId)).size !== 182 ||
  original.some((f) => !manifest.some((m) => m.featureId === f.id))
)
  throw Error('Catalog/registry mismatch');
const source = fs.readFileSync('packages/security/src/scanner.ts', 'utf8');
const sourceIds = new Set(
  [...source.matchAll(/scannerId:'(SCAN-\d+)',checkId:/g)].map((m) => m[1]),
);
const passiveIds = new Set(['SCAN-03', 'SCAN-05', 'SCAN-06', 'SCAN-08', 'SCAN-38']);
const providerPaths = {
  'SAAS-010': 'OidcFederationAdapter (SAML broker)',
  'SAAS-011': 'OidcFederationAdapter',
  'SAAS-012': 'OidcFederationAdapter (social broker)',
  'SAAS-043': 'StripePaymentMethodsAdapter',
  'SAAS-050': 'CashfreeWebhookAdapter (default) / RazorpayWebhookAdapter',
  'SAAS-085': 'S3PresignAdapter',
  'SAAS-092': 'GitHubWorkflowAdapter',
  'SAAS-094': 'CloudflareCacheAdapter + GitHubWorkflowAdapter',
  'SAAS-095': 'MediaCapabilityAdapter + Sharp transformer',
  'SAAS-155': 'OtlpTraceAdapter',
  'SAAS-165': 'GitHubWorkflowAdapter',
  'SAAS-166': 'GitHubWorkflowAdapter',
  'SAAS-167': 'KubernetesScaleAdapter',
  'SAAS-168': 'GitHubWorkflowAdapter',
};
const expanded = original.map((f) => {
  const m = manifest.find((x) => x.featureId === f.id);
  return {
    ...f,
    delivery: m.kind === 'local' ? 'native' : 'adapter',
    status:
      m.kind === 'local'
        ? 'local-reference'
        : m.kind === 'hybrid'
          ? 'hybrid-reference'
          : 'provider-required',
    operations: m.actions.join('; '),
    providerPath: providerPaths[f.id] ?? '',
    limitations:
      m.note ??
      'Reference implementation; production validation and app-specific authorization pending.',
  };
});
const intelIds = new Set(['SCAN-15']);
const dnsIds = new Set(['SCAN-10', 'SCAN-21', 'SCAN-41']);
const sc = scanners.map((f) => ({
  ...f,
  delivery:
    sourceIds.has(f.id) || passiveIds.has(f.id) || dnsIds.has(f.id) || intelIds.has(f.id)
      ? 'native'
      : 'adapter',
  status:
    sourceIds.has(f.id) || passiveIds.has(f.id) || dnsIds.has(f.id) || intelIds.has(f.id)
      ? 'heuristic-or-passive'
      : 'external-adapter-required',
  execution:
    [
      sourceIds.has(f.id) ? 'static' : null,
      passiveIds.has(f.id) ? 'passive-http' : null,
      dnsIds.has(f.id) ? 'dns (configured)' : null,
      intelIds.has(f.id) ? 'offline IOC feed (configured)' : null,
    ]
      .filter(Boolean)
      .join(' + ') || 'external',
  limitations: 'Not a complete category or verified vendor parity.',
}));
const csv = (rows) =>
  [
    Object.keys(rows[0]).join(','),
    ...rows.map((row) =>
      Object.values(row)
        .map((v) => '"' + String(v ?? '').replaceAll('"', '""') + '"')
        .join(','),
    ),
  ].join('\n') + '\n';
for (const [name, rows] of [
  ['saas-features', expanded],
  ['security-scanners', sc],
]) {
  fs.writeFileSync(`docs/${name}.json`, JSON.stringify(rows, null, 2) + '\n');
  fs.writeFileSync(`docs/${name}.csv`, csv(rows));
}
fs.writeFileSync('docs/feature-operations.json', JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(
  'packages/sdk/src/feature-types.ts',
  '/** Generated from the canonical feature action inventory; checked against the runtime manifest. */\nexport interface FeatureActionMap {\n' +
    manifest
      .map(
        (m) =>
          '  ' +
          JSON.stringify(m.featureId) +
          ': ' +
          m.actions.map((a) => JSON.stringify(a)).join(' | ') +
          ';',
      )
      .join('\n') +
    '\n}\nexport type FeatureId=keyof FeatureActionMap;\nexport type FeatureAction<I extends FeatureId>=FeatureActionMap[I];\n',
);
const count = manifest.reduce((a, x) => ((a[x.kind] = (a[x.kind] ?? 0) + 1), a), {});
let doc = `# Master feature checklist — v0.17.0\n\nAll 182 original SaaS IDs and 41 original scanner IDs retained. The registry includes ${count.local} local reference mappings, ${count.hybrid} hybrid mappings and ${count.provider} provider-required mappings. A mapped ID is not proof of feature completion. Local means executable reference operations or an exported utility; hybrid means limited local behavior plus application/provider work; provider-required means an adapter must be configured (concrete adapter source is included for every provider-only ID; live provider validation is not complete).\n\n| ID | Feature | Implementation category | Registered operations |\n|---|---|---|---|\n`;
for (const f of expanded) doc += `| ${f.id} | ${f.name} | ${f.status} | ${f.operations} |\n`;
doc += '\n## Scanner categories\n\n| ID | Category | Execution |\n|---|---|---|\n';
for (const f of sc) doc += `| ${f.id} | ${f.name} | ${f.execution} |\n`;
doc += `\nStatic/passive categories: ${new Set([...sourceIds, ...passiveIds]).size}; configured DNS adds ${[...dnsIds].filter((x) => !sourceIds.has(x) && !passiveIds.has(x)).length} categories. SCAN-15 has a configured offline IOC feed; live feed sourcing and efficacy validation remain required. All categories support evidence import; an evidence import is not a scanner implementation. The original vendor 200+ check inventory is not reproduced. No scan result establishes the absence of vulnerabilities.\n\nSee GAPS_AND_IMPROVEMENTS.md for release gates.\n`;
fs.writeFileSync('docs/MASTER_FEATURE_CHECKLIST.md', doc);
const catalog = fs.readFileSync('packages/catalog/src/index.ts', 'utf8');
const first = catalog.indexOf('export const saasFeatures:');
const last = catalog.indexOf('export function coverageSummary()');
fs.writeFileSync(
  'packages/catalog/src/index.ts',
  catalog.slice(0, first) +
    `export const saasFeatures: Feature[] = ${JSON.stringify(expanded, null, 2)} as Feature[];\nexport const securityScanners: ScannerFeature[] = ${JSON.stringify(sc, null, 2)} as ScannerFeature[];\n` +
    catalog.slice(last),
);
console.log('Updated', expanded.length, 'features and', sc.length, 'scanners');
