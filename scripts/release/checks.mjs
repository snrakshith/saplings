// Evidence collection only. No secret values are printed by this runner; child logs
// can contain sensitive data and must be reviewed before sharing. No production actions.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url),
  version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const deps = (names) =>
  names.filter((name) => {
    try {
      require.resolve(name);
      return false;
    } catch {
      return true;
    }
  });
const pnpmAvailable =
  spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['--version'], {
    encoding: 'utf8',
    timeout: 10000,
  }).status === 0;
const env = (names) => names.filter((n) => !process.env[n]);
const plans = [
  ['sdk-root-refactor', ['verify:sdk-layout']],
  ['gateway-security-local', ['build:platforms', 'test:critical:local']],
  ['identity-security-local', ['build:platforms', 'test:critical:local']],
  ['tenant-export-local', ['test:critical:local']],
  ['saas-gap-audit', ['docs:verify', 'saas:audit']],
  ['platform-config', ['build:platforms', 'platform:coverage']],
  ['ui-core-build', ['build:ui-core']],
  ['ui-web-build', ['build:murphi-ui', 'test:ui']],
  [
    'ui-native-build',
    ['build:murph-appui', 'typecheck:ui'],
    ['react-native', 'react', '@types/react'],
  ],
  [
    'vitest-migration',
    ['test:vitest:verify'],
    [],
    [],
    ['vitest.config.mts', 'vitest.integration.config.mts', 'vitest.quality.config.mts'],
  ],
  ['architecture-consolidation-local', ['consolidation:verify']],
  ['vitest-runtime', ['test'], ['vitest']],
  ['vitest-coverage', ['test:coverage'], ['vitest', '@vitest/coverage-v8']],
  ['core-build', ['build']],
  ['regression', ['build:quality:local', 'test']],
  ['catalog', ['check:catalog']],
  ['technical-evaluation', ['technical:evaluate']],
  [
    'adapter-build',
    ['build:adapters'],
    [
      'pg',
      'drizzle-orm',
      '@aws-sdk/client-s3',
      '@aws-sdk/client-sesv2',
      '@aws-sdk/client-sns',
      'sharp',
      'graphql',
    ],
  ],
  [
    'quality-build',
    ['typecheck:quality', 'build:starter'],
    ['react', 'web-vitals', 'playwright', 'express', 'vite'],
  ],
  ['validation-compat', ['test:validation:compat', 'typecheck:validation:compat'], ['zod']],
  ['postgres-live', ['test:postgres'], ['pg', 'drizzle-orm'], ['TEST_DATABASE_URL']],
  ['valkey-live', ['test:valkey'], ['redis'], ['TEST_VALKEY_URL']],
  [
    'foundation-live',
    ['test:foundation:live'],
    ['ws', 'socket.io', 'socket.io-client', 'express', 'compression', 'multer'],
  ],
  [
    'provider-live',
    ['test:providers:live'],
    [],
    ['SAPLING_PROVIDER_TEST_MODULE', 'SAPLING_SANDBOX_CONFIRM'],
  ],
  ['dependency-audit', [], [], [], ['pnpm-lock.yaml']],
  [
    'react-hooks',
    ['build:hooks', 'typecheck:hooks', 'test:hooks'],
    ['react', 'react-dom/server', 'react-test-renderer', '@types/react/package.json'],
  ],
];
const manual = [
  'staging-load',
  'staging-soak',
  'restore-drill',
  'scanner-triage',
  'independent-security-audit',
  'application-authorization',
  'operations-review',
  'backend-quality-live',
  'frontend-quality-live',
  'recurring-payment-live',
  'tenant-offboarding-drill',
  'cashfree-live',
  'saas-feature-acceptance-live',
  'gateway-integration-live',
  'identity-oidc-conformance',
  'architecture-consolidation-live',
  'ui-native-live',
  'ui-accessibility-live',
];
const mode = process.argv.includes('--execute') ? 'execute' : 'preflight';
const selected = process.argv.includes('--local-only')
  ? plans.slice(0, 4)
  : [['workspace-install', [], [], [], ['pnpm-lock.yaml']], ...plans];
const dir = resolve(process.env.SAPLING_CHECK_OUTPUT ?? 'docs/evidence/checks');
mkdirSync(dir, { recursive: true });
const results = [];
for (const [id, commands, modules = [], variables = [], files = []] of selected) {
  const missing = [
    ...deps(modules).map((x) => 'package:' + x),
    ...env(variables).map((x) => 'env:' + x),
    ...files.filter((x) => !existsSync(x)).map((x) => 'file:' + x),
  ];
  if (!pnpmAvailable) missing.push('tool:pnpm');
  if (id === 'provider-live' && process.env.SAPLING_SANDBOX_CONFIRM !== 'yes')
    missing.push('approved sandbox confirmation');
  if (missing.length) {
    results.push({ id, status: 'blocked', missing });
    continue;
  }
  if (mode === 'preflight') {
    results.push({ id, status: 'ready', commands });
    continue;
  }
  const steps =
    id === 'dependency-audit'
      ? [['audit', '--audit-level=high', '--json']]
      : id === 'workspace-install'
        ? [['install', '--frozen-lockfile']]
        : commands.map((x) => ['run', x]);
  let passed = true;
  for (const args of steps) {
    const run = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, {
      encoding: 'utf8',
      timeout: 600000,
      maxBuffer: 16 * 1024 * 1024,
      shell: false,
    });
    const log = resolve(dir, `${id}-${args[1].replace(/[^a-z0-9-]/gi, '_')}.txt`);
    writeFileSync(
      log,
      (run.stdout ?? '') +
        (run.stderr ?? '') +
        (run.error ? `\n${run.error.code ?? run.error.name}\n` : ''),
    );
    if (run.status !== 0) {
      passed = false;
      break;
    }
  }
  results.push({ id, status: passed ? 'executed-pass' : 'failed', reviewRequired: true });
}
if (!process.argv.includes('--local-only'))
  for (const id of manual) results.push({ id, status: 'operator-required' });
const report = {
  version,
  mode,
  at: new Date().toISOString(),
  results,
  note: 'Execution results do not automatically close release gates. Review source-bound evidence, target and approval requirements.',
};
writeFileSync(resolve(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (results.some((r) => ['blocked', 'failed', 'operator-required'].includes(r.status)))
  process.exitCode = 1;
