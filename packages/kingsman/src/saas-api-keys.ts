import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import type {
  SaasActorContext as ActorContext,
  SaasStore as Store,
  SaasAuditPort as AuditPort,
} from './saas-foundation.js';
import { SaasIdentityError as SaplingError } from './saas-foundation.js';
import { AccessService } from './saas-access.js';

export interface StoredApiKey {
  id: string;
  name: string;
  digest: string;
  scopes: string[];
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
}
export class IdentityService {
  constructor(
    private store: Store,
    private access: AccessService,
    private audit: AuditPort,
    private defaultTtlDays: number,
  ) {}
  /** Raw secret is returned once; only its SHA-256 digest is retained. */
  async createApiKey(
    ctx: ActorContext,
    input: { name: string; scopes: string[]; ttlDays?: number },
  ) {
    await this.access.requireService(ctx, 'apikeys:write');
    await this.access.requireGrant(ctx, input.scopes);
    const ttl = input.ttlDays ?? this.defaultTtlDays;
    if (!Number.isFinite(ttl) || ttl <= 0 || ttl > 3650)
      throw new SaplingError('INVALID_TTL', 'API key TTL must be in (0, 3650] days');
    const id = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    const key = `spl_${id}.${secret}`;
    const row: StoredApiKey = {
      id,
      name: input.name,
      digest: createHash('sha256').update(key).digest('hex'),
      scopes: [...new Set(input.scopes)],
      expiresAt: new Date(Date.now() + ttl * 86400000).toISOString(),
      revoked: false,
      createdAt: new Date().toISOString(),
    };
    await this.store.put(ctx.tenantId, 'apikeys', row);
    await this.audit.record(ctx, 'apikey.created', 'apikeys', id, {
      name: input.name,
      scopes: row.scopes,
    });
    return { id, secret: key, expiresAt: row.expiresAt };
  }
  async verifyApiKey(
    tenantId: string,
    key: string,
  ): Promise<{ id: string; scopes: string[] } | undefined> {
    const match = /^spl_([0-9a-f-]{36})\.([A-Za-z0-9_-]{40,50})$/.exec(key);
    if (!match) return undefined;
    const row = await this.store.get<StoredApiKey>(tenantId, 'apikeys', match[1]);
    if (!row || row.revoked || Date.parse(row.expiresAt) < Date.now()) return undefined;
    const attempted = createHash('sha256').update(key).digest();
    const expected = Buffer.from(row.digest, 'hex');
    return timingSafeEqual(attempted, expected) ? { id: row.id, scopes: row.scopes } : undefined;
  }
  async revokeApiKey(ctx: ActorContext, id: string) {
    await this.access.requireService(ctx, 'apikeys:write');
    const row = await this.store.get<StoredApiKey>(ctx.tenantId, 'apikeys', id);
    if (!row) return false;
    await this.store.put(ctx.tenantId, 'apikeys', { ...row, revoked: true });
    await this.audit.record(ctx, 'apikey.revoked', 'apikeys', id);
    return true;
  }
  async listKeys(ctx: ActorContext) {
    await this.access.requireService(ctx, 'apikeys:read');
    return (await this.store.list<StoredApiKey>(ctx.tenantId, 'apikeys')).map(
      ({ digest, ...safe }) => safe,
    );
  }
}
