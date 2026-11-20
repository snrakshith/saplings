import { atomic, hash, text, now } from './primitives.js';
import { randomUUID } from 'node:crypto';
import type { ActorContext, Store } from './types.js';
import { SaplingError } from './types.js';
import { AccessService } from './access.js';
import { AuditService } from './audit.js';
interface Usage {
  id: string;
  quantity: number;
  period: string;
  updatedAt: string;
}
interface Quota {
  id: string;
  limit: number;
  period: string;
  updatedAt: string;
}
export class BillingService {
  constructor(
    private store: Store,
    private access: AccessService,
    private audit: AuditService,
  ) {}
  async setQuota(ctx: ActorContext, metric: string, limit: number, period = 'monthly') {
    await this.access.requireService(ctx, 'billing:write');
    if (!Number.isSafeInteger(limit) || limit < 0)
      throw new SaplingError('BAD_QUOTA', 'Quota must be a nonnegative safe integer');
    const row: Quota = {
      id: `${period}:${metric}`,
      limit,
      period,
      updatedAt: new Date().toISOString(),
    };
    await atomic(this.store, ctx.tenantId, async (tx) => {
      await tx.put(ctx.tenantId, 'quotas', row);
      await this.audit.record(ctx, 'quota.updated', 'quotas', row.id, { limit }, tx);
    });
    return row;
  }
  async getUsage(ctx: ActorContext, metric: string, period = 'monthly') {
    await this.access.requireService(ctx, 'billing:read');
    const id = `${period}:${metric}`;
    const [usage, quota] = await Promise.all([
      this.store.get<Usage>(ctx.tenantId, 'usage', id),
      this.store.get<Quota>(ctx.tenantId, 'quotas', id),
    ]);
    return {
      metric,
      period,
      quantity: usage?.quantity ?? 0,
      limit: quota?.limit ?? null,
      remaining: quota ? Math.max(0, quota.limit - (usage?.quantity ?? 0)) : null,
    };
  }
  /** Demo-only read-modify-write; requires atomic store operations for concurrent production metering. */
  async meter(
    ctx: ActorContext,
    metric: string,
    quantity = 1,
    period = 'monthly',
    eventId?: string,
  ) {
    await this.access.requireService(ctx, 'billing:meter');
    if (!Number.isSafeInteger(quantity) || quantity <= 0)
      throw new SaplingError('BAD_USAGE', 'Meter increments must be positive safe integers');
    text(metric, 'metric', 100);
    text(period, 'period', 100);
    if (eventId !== undefined) text(eventId, 'event ID', 200);
    const id = `${period}:${metric}`;
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const eventKey = eventId ? hash(JSON.stringify([metric, period, eventId])) : undefined;
      if (eventKey) {
        const old = await tx.get<{ quantity: number; increment: number; id: string }>(
          ctx.tenantId,
          'usage-events',
          eventKey,
        );
        if (old) {
          if (old.increment !== quantity)
            throw new SaplingError('CONFLICT', 'Conflicting usage event', 409);
          const quota = await tx.get<Quota>(ctx.tenantId, 'quotas', id);
          return {
            metric,
            period,
            quantity: old.quantity,
            limit: quota?.limit ?? null,
            replayed: true,
          };
        }
      }
      const usage = await tx.get<Usage>(ctx.tenantId, 'usage', id);
      const quota = await tx.get<Quota>(ctx.tenantId, 'quotas', id);
      const next = (usage?.quantity ?? 0) + quantity;
      if (!Number.isSafeInteger(next))
        throw new SaplingError('BAD_USAGE', 'Usage counter overflow');
      if (quota && next > quota.limit)
        throw new SaplingError('QUOTA_EXCEEDED', `Quota exceeded for ${metric}`, 429);
      await tx.put(ctx.tenantId, 'usage', {
        id,
        quantity: next,
        period,
        updatedAt: new Date().toISOString(),
      });
      if (eventKey)
        await tx.put(ctx.tenantId, 'usage-events', {
          id: eventKey,
          metric,
          period,
          eventId,
          increment: quantity,
          quantity: next,
          createdAt: now(),
        });
      await this.audit.record(ctx, 'usage.metered', 'usage', id, { quantity }, tx);
      return { metric, period, quantity: next, limit: quota?.limit ?? null };
    });
  }
  async createPlan(
    ctx: ActorContext,
    input: { name: string; priceMinor: number; currency: string; features: string[] },
  ) {
    await this.access.requireService(ctx, 'plans:write');
    if (!Number.isSafeInteger(input.priceMinor) || input.priceMinor < 0)
      throw new SaplingError('BAD_PRICE', 'Invalid price');
    const plan = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    await this.store.put(ctx.tenantId, 'plans', plan);
    return plan;
  }
  async hasEntitlement(ctx: ActorContext, feature: string) {
    const ent = await this.store.get<{ id: string; enabled: boolean }>(
      ctx.tenantId,
      'entitlements',
      feature,
    );
    return ent?.enabled ?? false;
  }
  async setEntitlement(ctx: ActorContext, feature: string, enabled: boolean) {
    await this.access.requireService(ctx, 'billing:write');
    await atomic(this.store, ctx.tenantId, async (tx) => {
      await tx.put(ctx.tenantId, 'entitlements', { id: feature, enabled });
      await this.audit.record(ctx, 'entitlement.changed', 'entitlements', feature, { enabled }, tx);
    });
  }
}
