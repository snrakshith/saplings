import type { ConfigPair, Project, TenantSummary } from '../../contracts.js';
import { InputError } from '../input.js';
import { validatePair } from './platform-config.js';

export function starterPair(project: Project, tenant: TenantSummary, issuerBase: unknown) {
  const realmName = project.id + '-' + tenant.id;
  let base: URL;
  try {
    if (typeof issuerBase !== 'string' || issuerBase.length > 500) throw new Error();
    base = new URL(issuerBase);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
      throw new Error();
  } catch {
    throw new InputError('Enter an HTTPS issuer base URL without credentials, query, or fragment.');
  }

  const pair: ConfigPair = {
    kingsman: {
      apiVersion: 'identity.sapling.dev/v1alpha1',
      kind: 'RealmConfig',
      metadata: { name: realmName, displayName: tenant.name, environment: 'development' },
      spec: {
        state: 'active',
        frontend: { issuer: base.href.replace(/\/+$/, '') + '/realms/' + realmName },
        keys: {
          providers: [
            {
              name: 'primary',
              type: 'rsa-generated',
              algorithm: 'RS256',
              keySize: 2048,
              active: true,
            },
          ],
        },
        tokens: {
          defaultSignatureAlgorithm: 'RS256',
          accessToken: { ttl: '5m' },
          refreshToken: { ttl: '30d', rotate: true, reuseDetection: 'revoke-family' },
        },
        sessions: { sso: { idle: '30m', max: '10h' } },
        security: { passwordPolicy: { hashAlgorithm: 'argon2id', minLength: 12, maxLength: 128 } },
        clients: [],
      },
    },
    harbor: {
      apiVersion: 'gateway.sapling.dev/v1alpha1',
      kind: 'GatewayConfig',
      metadata: { name: realmName, workspace: project.id, environment: 'development' },
      spec: { upstreams: [], services: [] },
    },
  };
  return validatePair(pair);
}
