/** Validate the domain layout while keeping the published SDK entry point at the root. */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = 'packages/sdk/src';
const domains = {
  analytics: 'analytics.ts',
  audit: 'audit.ts',
  billing: 'billing.ts',
  capabilities: 'registry.ts',
  data: 'data.ts',
  'feature-flags': 'flags.ts',
  http: 'http.ts',
  identity: 'identity.ts',
  integrations: 'integrations.ts',
  payments: 'stripe-payment.ts',
  platform: 'provider-operations.ts',
  quality: 'quality-config.ts',
  runtime: 'store.ts',
  security: 'security-state.ts',
  storage: 'storage.ts',
  tenancy: 'resources.ts',
  workflows: 'worker.ts',
};
const entries = readdirSync(root, { withFileTypes: true });
const rootFiles = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .sort();
const failures = [];
if (rootFiles.join(',') !== 'config.ts,index.ts,types.ts')
  failures.push('Keep declarations, configuration and the entry point at the SDK source root');
if (existsSync(join(root, 'expanded'))) failures.push('Old expanded directory exists');
for (const [domain, entry] of Object.entries(domains)) {
  if (!existsSync(join(root, domain, entry)))
    failures.push('Missing SDK module ' + domain + '/' + entry);
}
console.log(JSON.stringify({ domains: Object.keys(domains), failures }, null, 2));
if (failures.length) process.exitCode = 1;
