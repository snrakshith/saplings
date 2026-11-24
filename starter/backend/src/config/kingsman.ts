import { loadRealmConfig, type RealmConfig } from '@saplings/kingsman';
import { project, tenant } from './project.ts';

export const starterRoles = ['member', 'author', 'reviewer'] as const;

function webClientId(durable: boolean) {
  return process.env.SAPLINGS_OIDC_CLIENT_ID || (durable ? 'starter-console' : 'starter-web');
}

export function realmConfig(deploymentOrigin?: URL) {
  const name = process.env.SAPLINGS_REALM_NAME || project.id + '-' + tenant.id;
  const webOrigin = deploymentOrigin ?? new URL(process.env.CORS_ORIGIN ?? 'http://localhost:5173');
  const clientId = webClientId(Boolean(deploymentOrigin));
  return {
    apiVersion: 'identity.sapling.dev/v1alpha1',
    kind: 'RealmConfig',
    metadata: {
      name,
      displayName: tenant.name,
      environment: deploymentOrigin ? 'production' : 'development',
    },
    spec: {
      state: 'active',
      frontend: {
        issuer: new URL('/realms/' + name, deploymentOrigin ?? 'https://localhost').href,
      },
      keys: {
        providers: [{ name: 'local', type: 'rsa-generated', algorithm: 'RS256', active: true }],
      },
      tokens: {
        defaultSignatureAlgorithm: 'RS256',
        accessToken: { ttl: '5m' },
        refreshToken: { ttl: '30d', rotate: true, reuseDetection: 'revoke-family' },
      },
      sessions: { sso: { idle: '30m', max: '10h' } },
      security: {
        passwordPolicy: { hashAlgorithm: 'argon2id', minLength: 12 },
        ...(deploymentOrigin && {
          bruteForce: { enabled: true, failureFactor: 5, waitIncrement: '30s', maxWait: '15m' },
        }),
      },
      ...(deploymentOrigin && {
        registration: { enabled: false },
        roles: { realm: starterRoles.map((name) => ({ name })) },
      }),
      clients: [
        {
          clientId,
          accessType: 'public',
          protocol: 'openid-connect',
          pkce: 'S256',
          grants: { authorizationCode: true, refreshToken: !deploymentOrigin },
          redirectUris: [new URL(deploymentOrigin ? '/login' : '/callback', webOrigin).href],
        },
      ],
    },
  } satisfies RealmConfig;
}

export async function durableRealm(origin: URL) {
  const path = process.env.SAPLINGS_KINGSMAN_CONFIG_FILE;
  const config: RealmConfig = path ? await loadRealmConfig(path) : realmConfig(origin);
  if (
    config.metadata.environment !== 'production' ||
    config.spec.frontend.issuer !== new URL('/realms/' + config.metadata.name, origin).href ||
    config.spec.registration?.enabled !== false ||
    !config.spec.security.bruteForce?.enabled
  )
    throw new Error(
      'The durable Kingsman realm requires production policy, an issuer on APP_ORIGIN, disabled registration, and brute-force protection.',
    );
  const clientId = webClientId(true);
  const redirectUri = new URL('/login', origin).href;
  const client = config.spec.clients.find((entry) => entry.clientId === clientId);
  if (
    !client ||
    client.enabled === false ||
    client.accessType !== 'public' ||
    client.pkce !== 'S256' ||
    !client.grants?.authorizationCode ||
    !client.redirectUris?.includes(redirectUri)
  )
    throw new Error(
      'The configured Kingsman operator client must support S256 authorization code sign-in with the Starter login redirect.',
    );
  return { config, clientId, redirectUri };
}
