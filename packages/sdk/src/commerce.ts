import type { ActorContext, JsonRecord, Store } from './types.js';
import { atomic, fail, hash, insert, integer, now, read, text, update } from './primitives.js';
import type { Row } from './primitives.js';
export class Commerce {
  constructor(private store: Store) {}
  async subscribe(ctx: ActorContext, input: JsonRecord) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const plan = await read(tx, ctx, 'plans', input.planId),
        customerId = text(input.customerId, 'customerId', 200),
        days = integer(input.trialDays ?? 0, 'trialDays', 0, 365);
      const key =
        input.idempotencyKey === undefined
          ? undefined
          : hash(
              JSON.stringify([
                plan.id,
                customerId,
                text(input.idempotencyKey, 'idempotencyKey', 200),
              ]),
            );
      if (key) {
        const request = await tx.get<Row>(ctx.tenantId, 'subscription-requests', key);
        if (request) {
          if (request.trialDays !== days) return fail('Subscription key conflict', 'CONFLICT', 409);
          return read(tx, ctx, 'subscriptions', request.subscriptionId);
        }
      }
      const active = (await tx.list<Row>(ctx.tenantId, 'subscriptions')).find(
        (r) =>
          r.planId === plan.id &&
          r.customerId === customerId &&
          ['pending', 'trialing', 'active', 'past_due'].includes(String(r.status)),
      );
      if (active) {
        if (key)
          await tx.put(ctx.tenantId, 'subscription-requests', {
            id: key,
            subscriptionId: active.id,
            trialDays: days,
          });
        return active;
      }
      const sub = await insert(tx, ctx, 'subscriptions', {
        planId: plan.id,
        status: days ? 'trialing' : 'pending',
        trialEndsAt: days ? new Date(Date.now() + days * 86400000).toISOString() : null,
        customerId,
      });
      if (key)
        await tx.put(ctx.tenantId, 'subscription-requests', {
          id: key,
          subscriptionId: sub.id,
          trialDays: days,
        });
      return sub;
    });
  }
  async transition(ctx: ActorContext, id: unknown, state: unknown) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const r = await read(tx, ctx, 'subscriptions', id);
      const to = text(state, 'status');
      const legal: Record<string, string[]> = {
        pending: ['active', 'cancelled'],
        trialing: ['active', 'cancelled', 'expired'],
        active: ['past_due', 'cancelled'],
        past_due: ['active', 'cancelled'],
        expired: [],
        cancelled: [],
      };
      if (!legal[String(r.status)]?.includes(to))
        return fail('Invalid subscription transition', 'CONFLICT', 409);
      const next = { ...r, status: to, updatedAt: now() };
      await tx.put(ctx.tenantId, 'subscriptions', next);
      return next;
    });
  }
  async invoice(ctx: ActorContext, input: JsonRecord) {
    if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 500)
      return fail('Invoice lines required');
    const lines = input.lines.map((l) => {
      const v = l as JsonRecord;
      const quantity = integer(v.quantity, 'quantity', 1, 1000000),
        unitMinor = integer(v.unitMinor, 'unitMinor');
      return {
        description: text(v.description, 'description'),
        quantity,
        unitMinor,
        totalMinor: integer(quantity * unitMinor, 'line total'),
      };
    });
    const subtotal = integer(
      lines.reduce((a, l) => a + l.totalMinor, 0),
      'subtotal',
    );
    const discount = integer(input.discountMinor ?? 0, 'discountMinor', 0, subtotal),
      taxBps = integer(input.taxBps ?? 0, 'taxBps', 0, 10000);
    const tax = Number((BigInt(subtotal - discount) * BigInt(taxBps) + 5000n) / 10000n);
    const currency = text(input.currency, 'currency', 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) return fail('Invalid currency');
    const customerId = text(input.customerId, 'customerId');
    const content = {
      customerId,
      currency,
      lines,
      subtotalMinor: subtotal,
      discountMinor: discount,
      taxMinor: tax,
      totalMinor: integer(subtotal - discount + tax, 'total'),
      status: 'open',
    };
    const key =
      input.idempotencyKey === undefined
        ? undefined
        : hash(
            JSON.stringify([
              'invoice',
              ctx.tenantId,
              text(input.idempotencyKey, 'idempotencyKey', 200),
            ]),
          );
    return atomic(this.store, ctx.tenantId, async (tx) => {
      if (key) {
        const previous = await tx.get<Row>(ctx.tenantId, 'invoice-requests', key),
          fingerprint = hash(JSON.stringify(content));
        if (previous) {
          if (previous.fingerprint !== fingerprint)
            return fail('Conflicting invoice key', 'CONFLICT', 409);
          return read(tx, ctx, 'invoices', previous.invoiceId);
        }
        const invoice = await insert(tx, ctx, 'invoices', content);
        await tx.put(ctx.tenantId, 'invoice-requests', {
          id: key,
          fingerprint,
          invoiceId: invoice.id,
        });
        return invoice;
      }
      return insert(tx, ctx, 'invoices', content);
    });
  }
  async wallet(ctx: ActorContext, input: JsonRecord) {
    const id = text(input.walletId, 'walletId');
    const delta = integer(Math.abs(Number(input.deltaMinor)), 'amount', 1);
    if (typeof input.deltaMinor !== 'number') return fail('Invalid delta');
    const signed = input.deltaMinor < 0 ? -delta : delta;
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const key = text(input.idempotencyKey, 'idempotencyKey');
      const existing = await tx.get<Row>(ctx.tenantId, 'wallet-ledger', key);
      if (existing) {
        if (existing.walletId !== id || existing.deltaMinor !== signed)
          return fail('Conflicting ledger key', 'CONFLICT', 409);
        return existing;
      }
      const old = await tx.get<Row>(ctx.tenantId, 'wallets', id);
      const balance = integer(Number(old?.balanceMinor ?? 0) + signed, 'balance');
      await tx.put(ctx.tenantId, 'wallets', { id, balanceMinor: balance });
      return insert(
        tx,
        ctx,
        'wallet-ledger',
        { walletId: id, deltaMinor: signed, balanceMinor: balance },
        key,
      );
    });
  }
  async coupon(ctx: ActorContext, input: JsonRecord) {
    const code = text(input.code, 'code', 80).toUpperCase();
    return atomic(this.store, ctx.tenantId, async (tx) => {
      if (await tx.get(ctx.tenantId, 'coupons', code))
        return fail('Coupon exists', 'CONFLICT', 409);
      return insert(
        tx,
        ctx,
        'coupons',
        {
          discountBps: integer(input.discountBps, 'discountBps', 1, 10000),
          maxUses: integer(input.maxUses ?? 1, 'maxUses', 1),
          perCustomerLimit: integer(input.perCustomerLimit ?? 1, 'perCustomerLimit', 1),
          expiresAt:
            input.expiresAt === undefined ? undefined : text(input.expiresAt, 'expiresAt', 40),
          uses: 0,
        },
        code,
      );
    });
  }
  async redeem(ctx: ActorContext, input: JsonRecord) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const c = await read(tx, ctx, 'coupons', text(input.code).toUpperCase());
      const key = text(input.redemptionId, 'redemptionId'),
        customerId = text(input.customerId ?? ctx.actorId, 'customerId', 200);
      const old = await tx.get<Row>(ctx.tenantId, 'coupon-redemptions', key);
      if (old) {
        if (old.code !== c.id || old.customerId !== customerId)
          return fail('Conflicting redemption', 'CONFLICT', 409);
        return old;
      }
      if (
        c.expiresAt &&
        (!Number.isFinite(Date.parse(String(c.expiresAt))) ||
          Date.parse(String(c.expiresAt)) <= Date.now())
      )
        return fail('Coupon expired', 'CONFLICT', 409);
      const customerUses = (await tx.list<Row>(ctx.tenantId, 'coupon-redemptions')).filter(
        (r) => r.code === c.id && r.customerId === customerId,
      ).length;
      if (customerUses >= Number(c.perCustomerLimit ?? 1))
        return fail('Coupon customer limit reached', 'CONFLICT', 409);
      if (Number(c.uses) >= Number(c.maxUses)) return fail('Coupon exhausted', 'CONFLICT', 409);
      await tx.put(ctx.tenantId, 'coupons', { ...c, uses: Number(c.uses) + 1 });
      return insert(
        tx,
        ctx,
        'coupon-redemptions',
        { code: c.id, customerId, discountBps: c.discountBps },
        key,
      );
    });
  }
  async revenue(ctx: ActorContext) {
    const rows = await this.store.list<Row>(ctx.tenantId, 'invoices');
    const totals: Record<string, { open: number; paid: number }> = {};
    for (const r of rows) {
      const c = String(r.currency);
      const t = (totals[c] ??= { open: 0, paid: 0 });
      if (r.status === 'open') t.open = integer(t.open + Number(r.totalMinor), 'open revenue');
      if (r.status === 'paid') t.paid = integer(t.paid + Number(r.totalMinor), 'paid revenue');
    }
    return totals;
  }
}
