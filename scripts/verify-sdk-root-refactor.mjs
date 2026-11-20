/** Public/source layout regression: prevents accidental reintroduction of expanded folder. */
import fs from 'node:fs';
import path from 'node:path';
const root = 'packages/sdk/src',
  required = [
    'accounts',
    'analytics',
    'automation',
    'billing-policy',
    'business-workflows',
    'cashfree',
    'commerce',
    'control-plane',
    'data',
    'domain-policy',
    'federation',
    'governance',
    'http',
    'impersonation',
    'media',
    'offboarding',
    'operations',
    'primitives',
    'provider-operations',
    'provider-workflow',
    'providers',
    'razorpay-webhook',
    'recurring',
    'registry',
    'reliability',
    'security-state',
    'stripe-payment',
    'stripe-recurring',
    'totp',
    'valkey',
    'worker',
  ];
const failures = [];
if (fs.existsSync(path.join(root, 'expanded'))) failures.push('Old nested SDK directory exists');
for (const stem of required)
  if (!fs.existsSync(path.join(root, stem + '.ts')))
    failures.push('Missing flat SDK source: ' + stem);
for (const f of fs.readdirSync(root).filter((f) => f.endsWith('.ts'))) {
  const contents = fs.readFileSync(path.join(root, f), 'utf8');
  if (contents.includes("from './expanded/") || contents.includes('from "./expanded/'))
    failures.push('Stale SDK import: ' + f);
}
const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (manifest.version !== '0.17.0') failures.push('Unexpected release version');
const result = {
  version: manifest.version,
  flattenedModules: required.length,
  oldDirectoryAbsent: !fs.existsSync(path.join(root, 'expanded')),
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
