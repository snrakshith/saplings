import { randomBytes } from 'node:crypto';
import type {
  SaasActorContext as ActorContext,
  SaasJsonRecord as JsonRecord,
  SaasStore as Store,
  SaasAuditPort as AuditPort,
} from './saas-foundation.js';
import type { Accounts } from './saas-accounts.js';
import type { AccessService } from './saas-access.js';
import { atomic, fail, hash, strings, text } from './saas-foundation.js';
interface Grant {
  id: string;
  actorId: string;
  targetId: string;
  scopes: string[];
  expires: number;
  revoked: boolean;
  reason: string;
}
/** A distinct scoped support session, never inherits target roles, and always carries original actor to audit. */
export class ImpersonationService {
  constructor(
    private store: Store,
    private accounts: Accounts,
    private access: AccessService,
    private audit: AuditPort,
    private allowed: string[] = [],
  ) {
    if (allowed.some((x) => x.includes('*') || !/^[a-z][\w-]*:read$/.test(x)))
      throw Error('Only explicit read-only support scopes are permitted');
  }
  async start(ctx: ActorContext, i: JsonRecord) {
    await this.access.require(ctx, 'support:impersonate');
    if (ctx.impersonatorId || !(await this.accounts.verifyRecentMfa(ctx, i.sessionToken)))
      return fail('Recent MFA required', 'FORBIDDEN', 403);
    const targetId = text(i.targetId),
      reason = text(i.reason, 'reason', 500),
      scopes = strings(i.scopes);
    if (
      !scopes.length ||
      scopes.some((p) => !this.allowed.includes(p)) ||
      !(await this.accounts.activeUser(ctx.tenantId, targetId))
    )
      return fail('Target or scope not permitted', 'FORBIDDEN', 403);
    await this.access.requireGrant(ctx, scopes);
    const secret = 'imp_' + randomBytes(32).toString('base64url'),
      id = hash(secret);
    await atomic(this.store, ctx.tenantId, async (tx) => {
      await tx.put<Grant>(ctx.tenantId, 'impersonations', {
        id,
        actorId: ctx.actorId,
        targetId,
        scopes,
        reason,
        expires: Date.now() + 300000,
        revoked: false,
      });
      await this.audit.record(
        ctx,
        'support.impersonation.started',
        'users',
        targetId,
        { grantId: id, reason },
        tx,
      );
    });
    return { token: secret, expiresIn: 300 };
  }
  async verify(tenantId: string, token: string): Promise<ActorContext | undefined> {
    if (!/^imp_[\w-]{43}$/.test(token)) return;
    const row = await this.store.get<Grant>(tenantId, 'impersonations', hash(token));
    if (
      !row ||
      row.revoked ||
      row.expires < Date.now() ||
      !(await this.accounts.activeUser(tenantId, row.actorId)) ||
      !(await this.accounts.activeUser(tenantId, row.targetId))
    )
      return;
    return {
      tenantId,
      actorId: row.targetId,
      impersonatorId: row.actorId,
      permissions: row.scopes.filter((p) => this.allowed.includes(p)),
      roles: [],
    };
  }
  async stop(ctx: ActorContext, token: unknown) {
    const id = hash(text(token));
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const row = await tx.get<Grant>(ctx.tenantId, 'impersonations', id);
      if (!row || row.actorId !== ctx.actorId) return fail('Grant not owned', 'FORBIDDEN', 403);
      await tx.put(ctx.tenantId, 'impersonations', { ...row, revoked: true });
      await this.audit.record(
        ctx,
        'support.impersonation.stopped',
        'users',
        row.targetId,
        { grantId: id },
        tx,
      );
      return { revoked: true };
    });
  }
}
