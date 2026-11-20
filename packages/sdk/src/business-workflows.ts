import type { ActorContext, JsonRecord, Store } from './types.js';
import type { AccessService } from './access.js';
import type { AuditService } from './audit.js';
import { atomic, fail, insert, now, read, scope, text } from './primitives.js';
import type { Row } from './primitives.js';
/** Explicit domain state machines for high-risk catalog mutations; not a substitute for application policy. */
export class BusinessWorkflows {
  constructor(
    private store: Store,
    private access: AccessService,
    private audit: AuditService,
  ) {}
  private async activeUser(tx: Store, ctx: ActorContext, id: unknown) {
    const user = await read(tx, ctx, 'users', text(id, 'user ID', 200));
    if (user.disabled || user.verified !== true)
      return fail('Verified active user required', 'FORBIDDEN', 403);
    return user;
  }
  async task(ctx: ActorContext, action: 'create' | 'assign' | 'complete', input: JsonRecord) {
    scope(ctx);
    return atomic(this.store, ctx.tenantId, async (tx) => {
      if (action === 'create') {
        await this.access.requireService(ctx, 'tasks:create', undefined, tx);
        const assignee = await this.activeUser(tx, ctx, input.assigneeId);
        const row = await insert(tx, ctx, 'tasks', {
          title: text(input.title, 'title', 500),
          assigneeId: assignee.id,
          creatorId: ctx.actorId,
          status: 'open',
        });
        await this.audit.record(ctx, 'task.created', 'tasks', row.id, undefined, tx);
        return row;
      }
      const row = await read(tx, ctx, 'tasks', input.id);
      if (row.status === 'completed' || row.status === 'cancelled')
        return fail('Task is terminal', 'CONFLICT', 409);
      if (row.creatorId !== ctx.actorId && row.assigneeId !== ctx.actorId)
        await this.access.require(ctx, 'tasks:manage', row, tx);
      if (action === 'assign') {
        const target = await this.activeUser(tx, ctx, input.assigneeId);
        const next = { ...row, assigneeId: target.id, updatedAt: now() };
        await tx.put(ctx.tenantId, 'tasks', next);
        await this.audit.record(
          ctx,
          'task.assigned',
          'tasks',
          row.id,
          { assigneeId: target.id },
          tx,
        );
        return next;
      }
      const next = {
        ...row,
        status: 'completed',
        completedBy: ctx.actorId,
        completedAt: now(),
        updatedAt: now(),
      };
      await tx.put(ctx.tenantId, 'tasks', next);
      await this.audit.record(ctx, 'task.completed', 'tasks', row.id, undefined, tx);
      return next;
    });
  }
  async ticket(ctx: ActorContext, action: 'create' | 'update', input: JsonRecord) {
    scope(ctx);
    return atomic(this.store, ctx.tenantId, async (tx) => {
      if (action === 'create') {
        const row = await insert(tx, ctx, 'tickets', {
          subject: text(input.subject, 'subject', 500),
          body: text(input.body, 'body', 10000),
          status: 'open',
          requester: ctx.actorId,
        });
        await this.audit.record(ctx, 'ticket.created', 'tickets', row.id, undefined, tx);
        return row;
      }
      const row = await read(tx, ctx, 'tickets', input.id),
        nextState = text(input.status, 'status', 30),
        transitions: Record<string, string[]> = {
          open: ['pending', 'resolved', 'closed'],
          pending: ['open', 'resolved', 'closed'],
          resolved: ['open', 'closed'],
          closed: [],
        };
      if (!transitions[String(row.status)]?.includes(nextState))
        return fail('Invalid ticket transition', 'CONFLICT', 409);
      await this.access.require(ctx, 'tickets:manage', row, tx);
      const next = { ...row, status: nextState, updatedBy: ctx.actorId, updatedAt: now() };
      await tx.put(ctx.tenantId, 'tickets', next);
      await this.audit.record(
        ctx,
        'ticket.transition',
        'tickets',
        row.id,
        { from: row.status, to: nextState },
        tx,
      );
      return next;
    });
  }
  async transfer(ctx: ActorContext, input: JsonRecord) {
    scope(ctx);
    const collection = text(input.collection, 'collection', 100),
      id = text(input.id, 'id', 200),
      targetId = text(input.ownerId, 'owner ID', 200);
    if (
      ![
        'organizations',
        'workspaces',
        'projects',
        'teams',
        'documents',
        'tasks',
        'contacts',
      ].includes(collection)
    )
      return fail('Ownership transfer collection not supported', 'FORBIDDEN', 403);
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const profile = await tx.get<Row>(ctx.tenantId, 'tenant-profile', 'profile');
      if (profile && profile.status !== 'active')
        return fail('Tenant frozen', 'TENANT_FROZEN', 403);
      const resource = await read(tx, ctx, collection, id);
      if (!resource.ownerId) return fail('Resource has no owner', 'CONFLICT', 409);
      if (resource.ownerId === targetId) return fail('Owner unchanged', 'CONFLICT', 409);
      if (input.expectedOwnerId !== undefined && input.expectedOwnerId !== resource.ownerId)
        return fail('Owner changed', 'CONFLICT', 409);
      if (resource.ownerId !== ctx.actorId)
        await this.access.require(ctx, `${collection}:transfer`, resource, tx);
      await this.activeUser(tx, ctx, targetId);
      if ((await tx.get<Row>(ctx.tenantId, 'legal-holds', 'current'))?.active === true)
        return fail('Legal hold active', 'LEGAL_HOLD', 409);
      const org = resource.organizationId ?? resource.orgId;
      if (org) {
        const memberships = await tx.list<Row>(ctx.tenantId, 'memberships');
        if (
          !memberships.some(
            (r) =>
              r.userId === targetId &&
              r.status === 'active' &&
              (r.organizationId === org || r.orgId === org),
          )
        )
          return fail('Target lacks organization membership', 'FORBIDDEN', 403);
      }
      const next = { ...resource, ownerId: targetId, updatedAt: now(), transferredBy: ctx.actorId };
      await tx.put(ctx.tenantId, collection, next);
      const ev = await insert(tx, ctx, 'ownership-transfers', {
        collection,
        resourceId: id,
        previousOwnerId: resource.ownerId,
        newOwnerId: targetId,
        actorId: ctx.actorId,
        reason: text(input.reason, 'reason', 500),
      });
      await this.audit.record(
        ctx,
        'ownership.transferred',
        collection,
        id,
        { previousOwnerId: resource.ownerId, newOwnerId: targetId, transferId: ev.id },
        tx,
      );
      return next;
    });
  }
}
