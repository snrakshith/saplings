import { readFile } from 'node:fs/promises';
import type { RealmConfig, RealmClient } from './types.js';
export class IdentityError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}
export const period = (v: unknown, defaultMs: number, maxMs = 365 * 86400000) => {
  if (v === undefined) return defaultMs;
  if (typeof v !== 'string' || !/^[1-9]\d{0,7}(?:ms|s|m|h|d)$/.test(v))
    throw new IdentityError('INVALID_DURATION', 'Invalid duration');
  const unit = v.match(/(ms|s|m|h|d)$/)![1],
    m =
      Number(v.slice(0, -unit.length)) *
      { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit as 'ms' | 's' | 'm' | 'h' | 'd'];
  if (!Number.isSafeInteger(m) || m > maxMs)
    throw new IdentityError('INVALID_DURATION', 'Duration out of bounds');
  return m;
};
export function validateRealmConfig(value: unknown): RealmConfig {
  const c = value as RealmConfig;
  if (
    !c ||
    c.kind !== 'RealmConfig' ||
    c.apiVersion !== 'identity.sapling.dev/v1alpha1' ||
    !c.metadata?.name ||
    !/^[-a-z0-9]{2,100}$/.test(c.metadata.name) ||
    !c.spec?.clients ||
    !Array.isArray(c.spec.clients) ||
    !c.spec.frontend?.issuer ||
    c.spec.tokens?.defaultSignatureAlgorithm !== 'RS256'
  )
    throw new IdentityError('CONFIG_INVALID', 'RealmConfig v1alpha1 with RS256 required');
  const issuer = new URL(c.spec.frontend.issuer);
  if (
    issuer.protocol !== 'https:' ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash ||
    !issuer.pathname.endsWith('/realms/' + c.metadata.name)
  )
    throw new IdentityError('CONFIG_INVALID', 'Invalid issuer/realm URL');
  if (
    !c.spec.keys?.providers?.some(
      (p) => p.algorithm === 'RS256' && p.active && p.type === 'rsa-generated',
    ) &&
    !c.spec.keys?.providers?.some(
      (p) => p.algorithm === 'RS256' && p.active && p.type === 'rsa-imported',
    )
  )
    throw new IdentityError('CONFIG_INVALID', 'Active RS256 signing provider required');
  period(c.spec.tokens.accessToken?.ttl, 300000);
  period(c.spec.tokens.refreshToken?.ttl, 2592000000);
  period(c.spec.tokens.idToken?.ttl, 300000);
  period(c.spec.tokens.authorizationCode?.ttl, 60000);
  period(c.spec.sessions?.sso?.idle, 1800000);
  period(c.spec.sessions?.sso?.max, 36000000);
  if (
    c.spec.tokens.refreshToken.rotate !== true ||
    c.spec.tokens.refreshToken.reuseDetection !== 'revoke-family'
  )
    throw new IdentityError(
      'INSECURE_CONFIG',
      'Rotating refresh family with reuse detection required',
    );
  const policy = c.spec.security?.passwordPolicy;
  if (
    !policy ||
    policy.minLength < 10 ||
    (policy.maxLength !== undefined && policy.maxLength < policy.minLength) ||
    policy.hashAlgorithm !== 'argon2id'
  )
    throw new IdentityError('INSECURE_CONFIG', 'argon2id password policy required');
  const names = new Set<string>();
  for (const client of c.spec.clients) {
    if (
      !client.clientId ||
      names.has(client.clientId) ||
      !['public', 'confidential'].includes(client.accessType) ||
      (client.protocol && client.protocol !== 'openid-connect')
    )
      throw new IdentityError('CONFIG_INVALID', 'Invalid/duplicate client');
    names.add(client.clientId);
    if (client.grants?.password || client.grants?.deviceCode || client.grants?.tokenExchange)
      throw new IdentityError('UNSUPPORTED_GRANT', 'Password/device/token exchange not supported');
    if (
      client.accessType === 'public' &&
      (client.pkce !== 'S256' || client.grants?.clientCredentials)
    )
      throw new IdentityError(
        'INSECURE_CLIENT',
        'Public client requires S256 PKCE and no client credentials',
      );
    for (const redirect of client.redirectUris ?? []) {
      const u = new URL(redirect);
      if (
        (u.protocol !== 'https:' &&
          !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))) ||
        redirect.includes('*') ||
        u.hash ||
        u.username ||
        u.password
      )
        throw new IdentityError('INSECURE_CLIENT', 'Unsafe redirect URI');
    }
  }
  if (c.spec.state && c.spec.state !== 'active' && c.spec.state !== 'inactive')
    throw new IdentityError('CONFIG_INVALID', 'Invalid realm state');
  return c;
}
export async function loadRealmConfig(path: string): Promise<RealmConfig> {
  const raw = await readFile(path, 'utf8');
  if (Buffer.byteLength(raw) > 2_000_000)
    throw new IdentityError('CONFIG_INVALID', 'Config too large');
  return validateRealmConfig(JSON.parse(raw));
}
export function clientById(config: RealmConfig, id: string): RealmClient {
  const client = config.spec.clients.find((x) => x.clientId === id && x.enabled !== false);
  if (!client) throw new IdentityError('INVALID_CLIENT', 'Unknown or disabled client', 401);
  return client;
}
