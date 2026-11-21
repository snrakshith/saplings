import { defineSaplingConfig } from '@saplings/sdk';

export const project = { id: 'sapling-fullstack-demo', name: 'Saplings Fullstack Demo' };
export const tenant = { id: 'demo', name: 'Demo workspace' };

export const setup = {
  workspace: { workspace: tenant.name, project: project.name },
  flags: { flag: 'show-cloud-item', enabled: true, rollout: 100, subject: 'demo-visitor' },
  analytics: { event: 'demo.started', subject: 'demo-visitor' },
  storage: { provider: 'memory', object: 'onboarding-test.txt' },
  audit: { limit: 50 },
};

const realm = project.id + '-' + tenant.id;

export function sampleConfig(apiPort: number) {
  return defineSaplingConfig({
    app: { ...project, environment: 'development' },
    middleware: { correlationId: true },
    realtime: { enabled: false },
    featureFlags: { enabled: true },
    analytics: { enabled: true },
    storage: { enabled: true, provider: 'memory' },
    audit: { enabled: true },
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
                { name: 'demo', type: 'rsa-generated', algorithm: 'RS256', active: true },
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
                clientId: 'demo-web',
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
        config: {
          apiVersion: 'gateway.sapling.dev/v1alpha1',
          kind: 'GatewayConfig',
          metadata: { name: realm, workspace: project.id, environment: 'development' },
          spec: {
            upstreams: [{ name: 'demo-api', targets: [{ target: '127.0.0.1:' + apiPort }] }],
            services: [
              {
                name: 'demo-api',
                upstream: 'demo-api',
                protocol: 'http',
                routes: [{ name: 'sample-api', paths: ['/api'], pathMatch: 'prefix' }],
              },
            ],
          },
        },
      },
    },
  });
}
