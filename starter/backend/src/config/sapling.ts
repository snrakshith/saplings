import { defineSaplingConfig } from '@saplings/sdk';

import { gatewayConfig } from './harbor.ts';
import { realmConfig } from './kingsman.ts';
import { project, tenant } from './project.ts';

export { project, tenant };

export const setup = {
  workspace: { workspace: tenant.name, project: project.name },
  flags: { flag: 'show-cloud-item', enabled: true, rollout: 100, subject: 'starter-visitor' },
  analytics: { event: 'starter.started', subject: 'starter-visitor' },
  storage: { provider: 'memory', object: 'onboarding-test.txt' },
  audit: { limit: 50 },
  notifications: {
    channel: 'inapp',
    endpoint: 'https://starter.example.invalid/webhooks/notifications',
    secretRef: 'STARTER_WEBHOOK_SECRET',
  },
  payments: {
    provider: 'custom',
    endpoint: 'https://starter.example.invalid/webhooks/payments',
    secretRef: 'PAYMENT_PROVIDER_SECRET',
  },
  billing: {
    plan: 'Starter',
    currency: 'USD',
    price: 1000,
    feature: 'reports',
    metric: 'reports.created',
    quota: 100,
  },
  workflows: { job: 'starter.report', attempts: 3 },
  governance: { collection: 'starter-reports', days: 90 },
  operations: { operation: 'starter.prepare', target: 'local-workspace', key: 'starter-check' },
};

export function starterConfig(apiPort: number) {
  return defineSaplingConfig({
    app: { ...project, environment: 'development' },
    middleware: { correlationId: true },
    realtime: { enabled: false },
    featureFlags: { enabled: true },
    analytics: { enabled: true },
    storage: { enabled: true, provider: 'memory' },
    audit: { enabled: true },
    billing: { enabled: true, currency: setup.billing.currency },
    notifications: { enabled: true, provider: 'custom' },
    payments: { enabled: true, provider: 'custom' },
    workflows: { enabled: true, maxAttempts: setup.workflows.attempts },
    services: {
      dataCollections: [setup.governance.collection],
      retentionPolicies: { [setup.governance.collection]: { days: setup.governance.days } },
    },
    platforms: {
      kingsman: { config: realmConfig() },
      harbor: gatewayConfig(apiPort, 'local'),
    },
  });
}
