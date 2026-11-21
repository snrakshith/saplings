import { GatewayError, validateGatewayConfig } from '@saplings/harbor';
import { IdentityError, validateRealmConfig } from '@saplings/kingsman';
import { parseDocument } from 'yaml';

import type { ConfigPair, Project, TenantSummary } from '../contracts.js';

export class InputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InputError('Expected a JSON object.');
  return value as Record<string, unknown>;
}

export function record(value: Record<string, unknown>): Project {
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(id))
    throw new InputError('Use 1–40 lowercase letters, numbers, or hyphens for the key.');
  if (!name || name.length > 100) throw new InputError('Enter a name of up to 100 characters.');
  return { id, name };
}

function withValidation<T>(name: string, validate: () => T): T {
  try {
    return validate();
  } catch (error) {
    const detail =
      error instanceof GatewayError || error instanceof IdentityError
        ? error.message
        : 'Check the document structure and URL fields.';
    throw new InputError(name + ' configuration is invalid. ' + detail);
  }
}

export function validatePair(value: unknown): ConfigPair {
  const pair = object(value);
  const kingsman = withValidation('Kingsman', () => {
    const realm = validateRealmConfig(pair.kingsman);
    for (const client of realm.spec.clients) {
      if (
        typeof client.clientId !== 'string' ||
        (client.redirectUris !== undefined && !stringList(client.redirectUris))
      ) {
        throw new IdentityError(
          'CONFIG_INVALID',
          'Use a string client ID and a list of redirect URLs.',
        );
      }
    }
    return realm;
  });
  const harbor = withValidation('Harbor', () => {
    const gateway = validateGatewayConfig(pair.harbor);
    for (const service of gateway.spec.services) {
      if (typeof service.name !== 'string' || !Array.isArray(service.routes))
        throw new GatewayError('CONFIG_INVALID', 'Use a string service name and a list of routes.');
      for (const route of service.routes) {
        if (
          typeof route.name !== 'string' ||
          (route.methods !== undefined && !stringList(route.methods))
        )
          throw new GatewayError(
            'CONFIG_INVALID',
            'Use a string route name and a list of HTTP methods.',
          );
      }
    }
    return gateway;
  });
  return { kingsman, harbor };
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function importPair(value: unknown): ConfigPair {
  const pair = object(value);
  if (typeof pair.harbor !== 'string') return validatePair(pair);
  let harbor: unknown;
  try {
    if (Buffer.byteLength(pair.harbor) > 2_000_000) throw new Error();
    const document = parseDocument(pair.harbor, { uniqueKeys: true, strict: true });
    if (document.errors.length || document.warnings.length) throw new Error();
    harbor = document.toJS({ maxAliasCount: 0 });
  } catch {
    throw new InputError(
      'Use a single Harbor JSON or YAML document under 2 MB with unique keys and no aliases.',
    );
  }
  return validatePair({ harbor, kingsman: pair.kingsman });
}

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
