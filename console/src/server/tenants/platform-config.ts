import { GatewayError, validateGatewayConfig } from '@saplings/harbor';
import { IdentityError, validateRealmConfig } from '@saplings/kingsman';
import { parseDocument } from 'yaml';
import type { ConfigPair } from '../../contracts.js';
import { InputError, object } from '../input.js';

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
