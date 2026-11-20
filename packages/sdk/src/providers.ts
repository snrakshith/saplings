import type { ActorContext, AuthenticationAdapter, FeatureAdapter, JsonRecord } from './types.js';
import { SaplingError } from './types.js';
import { Bulkhead, CircuitBreaker, timeout } from './reliability.js';
import { fail, object, strings, text } from './primitives.js';
import { boundedResponseText } from './http.js';
/** Adapter for an existing trusted Sapling service. Endpoint is deployment configuration, never client input. */
export class HttpCapabilityAdapter implements FeatureAdapter {
  private bulkhead = new Bulkhead(32);
  private breaker = new CircuitBreaker();
  private url: URL;
  constructor(
    baseUrl: string,
    private serviceToken: () => Promise<string>,
    private allowedActions: Record<string, string[]>,
    private timeoutMs = 8000,
  ) {
    this.url = new URL(baseUrl);
    if (
      this.url.protocol !== 'https:' ||
      this.url.username ||
      this.url.password ||
      this.url.search ||
      this.url.hash
    )
      throw new Error('Provider must use a fixed HTTPS service URL');
  }
  async execute(request: {
    ctx: ActorContext;
    featureId: string;
    action: string;
    input: JsonRecord;
    options: JsonRecord;
  }) {
    if (
      !Object.hasOwn(this.allowedActions, request.featureId) ||
      !this.allowedActions[request.featureId].includes(request.action)
    )
      return fail('Provider action not allowed', 'FORBIDDEN', 403);
    return this.bulkhead.run(() =>
      this.breaker.run(() =>
        timeout(async (signal) => {
          const token = await this.serviceToken();
          if (signal.aborted) throw Error('Provider deadline');
          const endpoint = new URL(
            this.url.href.replace(/\/$/, '') +
              '/capabilities/' +
              encodeURIComponent(request.featureId) +
              '/' +
              encodeURIComponent(request.action),
          );
          const res = await fetch(endpoint, {
            method: 'POST',
            redirect: 'error',
            signal,
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: JSON.stringify({
              context: {
                tenantId: request.ctx.tenantId,
                actorId: request.ctx.actorId,
                correlationId: request.ctx.correlationId,
              },
              input: request.input,
            }),
          });
          if (!res.ok) {
            await res.body?.cancel();
            throw new SaplingError('PROVIDER_FAILED', `Provider returned ${res.status}`, 502);
          }
          const reader = res.body?.getReader();
          if (!reader) return null;
          const parts: Uint8Array[] = [];
          let size = 0;
          while (true) {
            const r = await reader.read();
            if (r.done) break;
            size += r.value.length;
            if (size > 2_000_000) {
              await reader.cancel();
              return fail('Provider response too large', 'PROVIDER_FAILED', 502);
            }
            parts.push(r.value);
          }
          return JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown;
        }, this.timeoutMs),
      ),
    );
  }
}
/** Pinned issuer/audience and JWKS URL, RS256 only; no untrusted jku or algorithm negotiation. */
export class JwksAuthenticationAdapter implements AuthenticationAdapter {
  private keys = new Map<string, CryptoKey>();
  private expires = 0;
  private loadedAt = 0;
  private refresh?: Promise<void>;
  private readonly url: URL;
  constructor(
    private options: {
      issuer: string;
      audience: string;
      jwksUrl: string;
      tenantClaim?: string;
      rolesClaim?: string;
      permissionsClaim?: string;
    },
  ) {
    this.url = new URL(options.jwksUrl);
    if (this.url.protocol !== 'https:' || this.url.username || this.url.password || this.url.hash)
      throw new Error('JWKS endpoint must use fixed HTTPS URL');
  }
  private async load() {
    if (this.refresh) return this.refresh;
    this.refresh = (async () => {
      const r = await fetch(this.url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error('JWKS unavailable');
      const body = await boundedResponseText(r, 1_000_000);
      const jwks = JSON.parse(body) as { keys: (JsonWebKey & { kid?: string })[] };
      if (!Array.isArray(jwks.keys) || jwks.keys.length > 100) throw new Error('Invalid JWKS');
      const keys = new Map<string, CryptoKey>();
      for (const jwk of jwks.keys) {
        if (
          !jwk.kid ||
          jwk.kty !== 'RSA' ||
          (jwk.alg && jwk.alg !== 'RS256') ||
          (jwk.use && jwk.use !== 'sig')
        )
          continue;
        const key = await crypto.subtle.importKey(
          'jwk',
          jwk,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['verify'],
        );
        if ((key.algorithm as RsaHashedKeyAlgorithm).modulusLength < 2048) continue;
        if (keys.has(jwk.kid)) throw new Error('Duplicate key ID');
        keys.set(jwk.kid, key);
      }
      this.keys = keys;
      this.loadedAt = Date.now();
      this.expires = this.loadedAt + 300000;
    })();
    try {
      await this.refresh;
    } finally {
      this.refresh = undefined;
    }
  }
  async verifyAccessToken(token: string) {
    try {
      if (token.length > 16384 || !/^[-\w]+\.[-\w]+\.[-\w]+$/.test(token)) return;
      const [h, p, s] = token.split('.');
      const header = object(JSON.parse(Buffer.from(h, 'base64url').toString('utf8'))),
        claims = object(JSON.parse(Buffer.from(p, 'base64url').toString('utf8')));
      if (
        header.alg !== 'RS256' ||
        header.crit !== undefined ||
        typeof header.kid !== 'string' ||
        header.kid.length > 200
      )
        return;
      const now = Date.now() / 1000;
      if (
        claims.iss !== this.options.issuer ||
        !(
          claims.aud === this.options.audience ||
          (Array.isArray(claims.aud) && claims.aud.includes(this.options.audience))
        ) ||
        typeof claims.exp !== 'number' ||
        claims.exp <= now ||
        (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > now + 30))
      )
        return;
      if (Date.now() > this.expires) await this.load();
      if (!this.keys.has(header.kid) && Date.now() - this.loadedAt > 30000) await this.load();
      const key = this.keys.get(header.kid);
      if (
        !key ||
        !(await crypto.subtle.verify(
          'RSASSA-PKCS1-v1_5',
          key,
          Buffer.from(s, 'base64url'),
          new TextEncoder().encode(h + '.' + p),
        ))
      )
        return;
      const tenantId = text(claims[this.options.tenantClaim ?? 'tenant_id'], 'tenant', 200);
      if (tenantId.startsWith('__sapling_')) return;
      return {
        tenantId,
        userId: text(claims.sub, 'subject', 200),
        roles: strings(claims[this.options.rolesClaim ?? 'roles'] ?? []),
        permissions: strings(claims[this.options.permissionsClaim ?? 'permissions'] ?? []),
      };
    } catch {
      return undefined;
    }
  }
}
