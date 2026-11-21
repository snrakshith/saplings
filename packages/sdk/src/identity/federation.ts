import { boundedResponseText } from '../http/http.js';
import { randomBytes, createHash } from 'node:crypto';
import type {
  AuthenticationAdapter,
  FeatureAdapter,
  Store,
  ActorContext,
  JsonRecord,
} from '../types.js';
import { atomic, fail, hash, object, text } from '../runtime/primitives.js';
import { EnvelopeCrypto } from '../data/data.js';
import { Bulkhead } from '../runtime/reliability.js';
const secret = () => randomBytes(32).toString('base64url') as string;
function https(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.username || u.password || u.hash)
    throw Error('Fixed HTTPS endpoint required');
  return u;
}
interface State {
  id: string;
  actorId: string;
  featureId: string;
  expires: number;
  proof: JsonRecord;
}
export interface OidcSettings {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint?: string;
  redirectUri: string;
  scope?: string;
  brokerHints?: { saml?: Record<string, string>; social?: Record<string, string> };
}
/** Authorization-code + PKCE confidential backend flow. SAML/social must be configured in a vetted OIDC identity broker.
 * Both token verifiers must pin their intended issuer/audience; ID verifier must return tenant and subject. No auto-link by email. */
export class OidcFederationAdapter implements FeatureAdapter {
  private auth: URL;
  private token: URL;
  private revoke?: URL;
  private cipher: EnvelopeCrypto;
  private bulk = new Bulkhead(16);
  constructor(
    private store: Store,
    private config: OidcSettings,
    key: Uint8Array,
    private accessVerifier: AuthenticationAdapter,
    private idVerifier: AuthenticationAdapter,
  ) {
    https(config.issuer);
    this.auth = https(config.authorizationEndpoint);
    this.token = https(config.tokenEndpoint);
    this.revoke = config.revocationEndpoint ? https(config.revocationEndpoint) : undefined;
    https(config.redirectUri);
    this.cipher = new EnvelopeCrypto(key, 'oidc-state-v1');
  }
  private async post(endpoint: URL, params: Record<string, string>) {
    return this.bulk.run(async () => {
      const body = new URLSearchParams({
        ...params,
        client_id: this.config.clientId,
        ...(this.config.clientSecret ? { client_secret: this.config.clientSecret } : {}),
      });
      const r = await fetch(endpoint, {
        method: 'POST',
        body,
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: { accept: 'application/json' },
      });
      if (!r.ok) {
        await r.body?.cancel();
        return fail('Identity provider rejected operation', 'PROVIDER_FAILED', 502);
      }
      if (r.status === 204 || endpoint === this.revoke) {
        await r.body?.cancel();
        return {};
      }
      const raw = await boundedResponseText(r, 100000);
      return object(JSON.parse(raw));
    });
  }
  private async verify(ctx: ActorContext, tokens: JsonRecord, nonce?: string) {
    const accessToken = text(tokens.access_token, 'access token', 16384);
    const access = await this.accessVerifier.verifyAccessToken(accessToken);
    if (!access || access.tenantId !== ctx.tenantId)
      return fail('Invalid federated tenant or access token', 'UNAUTHENTICATED', 401);
    if (nonce !== undefined) {
      const idToken = text(tokens.id_token, 'id token', 16384);
      const id = await this.idVerifier.verifyAccessToken(idToken);
      if (!id || id.tenantId !== access.tenantId || id.userId !== access.userId)
        return fail('Invalid ID token', 'UNAUTHENTICATED', 401);
      const claims = object(
        JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')),
      );
      if (
        claims.nonce !== nonce ||
        claims.iss !== this.config.issuer ||
        (Array.isArray(claims.aud) && claims.aud.length > 1 && claims.azp !== this.config.clientId)
      )
        return fail('OIDC nonce or issuer mismatch', 'UNAUTHENTICATED', 401);
    }
    return {
      accessToken,
      refreshToken: typeof tokens.refresh_token === 'string' ? tokens.refresh_token : undefined,
      expiresIn: tokens.expires_in,
      identity: access,
    };
  }
  async execute({ ctx, featureId, action, input }: Parameters<FeatureAdapter['execute']>[0]) {
    if (!['SAAS-010', 'SAAS-011', 'SAAS-012'].includes(featureId))
      return fail('Unsupported identity capability');
    if (action === 'metadata' && featureId === 'SAAS-010')
      return {
        brokerIssuer: this.config.issuer,
        redirectUri: this.config.redirectUri,
        mode: 'oidc-broker',
        samlMetadataManagedByBroker: true,
      };
    if (action === 'start' || action === 'authorize') {
      const hints =
        featureId === 'SAAS-010'
          ? this.config.brokerHints?.saml
          : featureId === 'SAAS-012'
            ? this.config.brokerHints?.social
            : {};
      if (!hints) return fail('Broker connection not configured', 'CONFIG_REQUIRED', 503);
      const state = secret(),
        nonce = secret(),
        verifier = secret();
      const u = new URL(this.auth);
      for (const [k, v] of Object.entries(hints)) u.searchParams.set(k, v);
      for (const [k, v] of Object.entries({
        response_type: 'code',
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        scope: this.config.scope ?? 'openid profile email',
        state,
        nonce,
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256',
      }))
        u.searchParams.set(k, v);
      await this.store.put<State>(ctx.tenantId, 'oidc-states', {
        id: hash(state),
        actorId: ctx.actorId,
        featureId,
        expires: Date.now() + 300000,
        proof: this.cipher.encrypt(ctx, JSON.stringify({ nonce, verifier })),
      });
      return { url: u.href, expiresIn: 300 };
    }
    if (action === 'callback') {
      const state = hash(text(input.state, 'state', 200));
      const saved = await atomic(this.store, ctx.tenantId, async (tx) => {
        const r = await tx.get<State>(ctx.tenantId, 'oidc-states', state);
        if (!r || r.actorId !== ctx.actorId || r.featureId !== featureId || r.expires < Date.now())
          return fail('Invalid state', 'UNAUTHENTICATED', 401);
        await tx.delete(ctx.tenantId, 'oidc-states', state);
        return object(JSON.parse(this.cipher.decrypt(ctx, r.proof)));
      });
      const tokens = await this.post(this.token, {
        grant_type: 'authorization_code',
        code: text(input.code, 'code', 4096),
        redirect_uri: this.config.redirectUri,
        code_verifier: text(saved.verifier),
      });
      return this.verify(ctx, tokens, text(saved.nonce));
    }
    if (featureId === 'SAAS-011' && action === 'refresh')
      return this.verify(
        ctx,
        await this.post(this.token, {
          grant_type: 'refresh_token',
          refresh_token: text(input.refreshToken, 'refresh token', 16384),
        }),
      );
    if (featureId === 'SAAS-011' && action === 'revoke') {
      if (!this.revoke) return fail('Revocation endpoint not configured', 'CONFIG_REQUIRED', 503);
      await this.post(this.revoke, {
        token: text(input.refreshToken, 'refresh token', 16384),
        token_type_hint: 'refresh_token',
      });
      return { revoked: true };
    }
    return fail('Unknown federation action', 'UNKNOWN_ACTION', 404);
  }
}
