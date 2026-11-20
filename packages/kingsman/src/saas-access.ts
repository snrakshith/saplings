import type { SaasActorContext as ActorContext, SaasStore as Store } from './saas-foundation.js';
import { SaasIdentityError as SaplingError } from './saas-foundation.js';
export interface Role {
  id: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}
export type AbacRule = (
  ctx: ActorContext,
  permission: string,
  resource?: Record<string, unknown>,
) => boolean | Promise<boolean>;
export class AccessService {
  private rules: AbacRule[] = [];
  constructor(
    private store: Store,
    private options: {
      enabled: boolean;
      defaultDecision: 'allow' | 'deny';
      enforceOnServices: boolean;
    },
  ) {}
  addRule(rule: AbacRule) {
    this.rules.push(rule);
  }
  async setRole(ctx: ActorContext, id: string, permissions: string[]) {
    await this.require(ctx, 'roles:write');
    if (!(await this.has(ctx, '*')))
      for (const permission of permissions)
        if (!(await this.has(ctx, permission)) || permission === '*' || permission.endsWith(':*'))
          throw new SaplingError(
            'FORBIDDEN',
            'Cannot grant permissions beyond own explicit grants',
            403,
          );
    const role: Role = {
      id,
      permissions: [...new Set(permissions)],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.store.put(ctx.tenantId, 'roles', role);
    return role;
  }
  async has(
    ctx: ActorContext,
    permission: string,
    resource?: Record<string, unknown>,
    store: Store = this.store,
  ): Promise<boolean> {
    if (!this.options.enabled) return true;
    if (!ctx.tenantId || !ctx.actorId) return false;
    const perms = new Set(ctx.permissions ?? []);
    for (const name of ctx.roles ?? []) {
      const role = await store.get<Role>(ctx.tenantId, 'roles', name);
      for (const p of role?.permissions ?? []) perms.add(p);
    }
    const matches = (p: string) =>
      perms.has('*') || perms.has(p) || perms.has(p.split(':')[0] + ':*');
    let approved = matches(permission);
    if (!approved && this.options.defaultDecision === 'allow') approved = true;
    for (const rule of this.rules) if (!(await rule(ctx, permission, resource))) return false;
    return approved;
  }
  async require(
    ctx: ActorContext,
    permission: string,
    resource?: Record<string, unknown>,
    store?: Store,
  ) {
    if (!(await this.has(ctx, permission, resource, store)))
      throw new SaplingError('FORBIDDEN', `Permission denied: ${permission}`, 403);
  }
  async requireService(
    ctx: ActorContext,
    permission: string,
    resource?: Record<string, unknown>,
    store?: Store,
  ) {
    if (this.options.enforceOnServices) await this.require(ctx, permission, resource, store);
  }
  async requireGrant(ctx: ActorContext, permissions: string[]) {
    if (await this.has(ctx, '*')) return;
    for (const p of permissions)
      if (p === '*' || p.endsWith(':*') || !(await this.has(ctx, p)))
        throw new SaplingError('FORBIDDEN', 'Cannot grant permissions beyond own grants', 403);
  }
  async requireRoleGrant(ctx: ActorContext, names: string[]) {
    await this.require(ctx, 'roles:assign');
    for (const name of names) {
      const role = await this.store.get<Role>(ctx.tenantId, 'roles', name);
      if (!role) throw new SaplingError('NOT_FOUND', 'Role not found', 404);
      await this.requireGrant(ctx, role.permissions);
    }
  }
}
