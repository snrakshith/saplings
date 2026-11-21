import { defineSaplingConfig } from '@saplings/sdk';
import { localNotifications, localOperation, localPayments } from './starter/local-adapters.js';

export const project = { id: 'saplings-starter', name: 'Saplings Starter' };
export const tenant = { id: 'local', name: 'Local workspace' };

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

const realm = project.id + '-' + tenant.id;

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
    providers: { notifications: localNotifications, payments: localPayments },
    services: {
      dataCollections: [setup.governance.collection],
      retentionPolicies: { [setup.governance.collection]: { days: setup.governance.days } },
      providerOperations: { [setup.operations.operation]: localOperation },
    },
    platforms: {
      kingsman: {
        config: {
          apiVersion: 'identity.sapling.dev/v1alpha1',
          kind: 'RealmConfig',
          metadata: { name: realm, displayName: tenant.name, environment: 'development' },
          spec: {
            state: 'active',
            frontend: { issuer: 'https://localhost/realms/' + realm },
            keys: {
              providers: [
                { name: 'local', type: 'rsa-generated', algorithm: 'RS256', active: true },
              ],
            },
            tokens: {
              defaultSignatureAlgorithm: 'RS256',
              accessToken: { ttl: '5m' },
              refreshToken: { ttl: '30d', rotate: true, reuseDetection: 'revoke-family' },
            },
            sessions: { sso: { idle: '30m', max: '10h' } },
            security: { passwordPolicy: { hashAlgorithm: 'argon2id', minLength: 12 } },
            clients: [
              {
                clientId: 'starter-web',
                accessType: 'public',
                protocol: 'openid-connect',
                pkce: 'S256',
                grants: { authorizationCode: true, refreshToken: true },
                redirectUris: ['http://localhost:5173/callback'],
              },
            ],
          },
        },
      },
      harbor: {
        dependencies: { allowedUpstreamHosts: ['127.0.0.1:' + apiPort] },
        config: {
          apiVersion: 'gateway.sapling.dev/v1alpha1',
          kind: 'GatewayConfig',
          metadata: { name: realm, workspace: project.id, environment: 'development' },
          spec: {
            upstreams: [{ name: 'starter-api', targets: [{ target: '127.0.0.1:' + apiPort }] }],
            services: [
              {
                name: 'starter-api',
                upstream: 'starter-api',
                protocol: 'http',
                routes: [{ name: 'starter-api', paths: ['/api'], pathMatch: 'prefix' }],
              },
            ],
          },
        },
      },
    },
  });
}
