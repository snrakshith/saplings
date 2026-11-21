import { randomUUID } from 'node:crypto';
import type { ActorContext, Store, JsonRecord } from '../types.js';
import {
  atomic,
  fail,
  hash,
  insert,
  integer,
  now,
  read,
  text,
  update,
  page,
} from '../runtime/primitives.js';
import type { Row } from '../runtime/primitives.js';
/** Provider must support idempotent charge attempts and return verified terminal outcomes only. */
export interface RecurringGateway {
  charge(request: {
    tenantId: string;
    customerId: string;
    invoiceId: string;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
    signal?: AbortSignal;
  }): Promise<{ status: 'paid' | 'declined' | 'pending' | 'requires_action'; reference: string }>;
}
export interface RecurringSettings {
  gateway?: RecurringGateway;
  retryDays?: number[];
}
const DAY = 86400000;
/** Fixed-day billing intervals, not calendar-month proration. All amounts are integer minor units. */
export class RecurringBilling {
  private delays: number[];
  constructor(
    private store: Store,
    private settings: RecurringSettings = {},
  ) {
    this.delays = settings.retryDays ?? [1, 3, 7];
    if (
      this.delays.length > 10 ||
      this.delays.some((x) => !Number.isSafeInteger(x) || x < 1 || x > 90)
    )
      throw Error('Invalid dunning retry policy');
  }
  async schedule(ctx: ActorContext, input: JsonRecord) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const sub = await read(tx, ctx, 'subscriptions', input.id);
      if (!['active', 'trialing'].includes(String(sub.status)))
        return fail('Subscription is not billable', 'CONFLICT', 409);
      const plan = await read(tx, ctx, 'plans', sub.planId);
      const days = integer(input.intervalDays, 'intervalDays', 1, 366);
      const first = new Date(text(input.firstDueAt, 'firstDueAt')).getTime();
      if (!Number.isFinite(first) || first < Date.now() - DAY || first > Date.now() + 366 * DAY)
        return fail('Invalid first due date');
      if (sub.status === 'trialing' && first < Date.parse(String(sub.trialEndsAt)))
        return fail('Cannot charge before trial ends');
      const price = integer(plan.priceMinor, 'plan price');
      const currency = text(plan.currency, 'currency', 3).toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) return fail('Invalid currency');
      const old = await tx.get<Row>(ctx.tenantId, 'billing-schedules', sub.id);
      if (old) return fail('Schedule already exists', 'CONFLICT', 409);
      return insert(
        tx,
        ctx,
        'billing-schedules',
        {
          subscriptionId: sub.id,
          customerId: text(sub.customerId),
          currency,
          amountMinor: price,
          intervalDays: days,
          nextDueAt: first,
          status: 'active',
        },
        sub.id,
      );
    });
  }
  /** Create at most one invoice for a schedule period; repeated scheduler calls do not duplicate invoices. */
  async issueDue(ctx: ActorContext, id: unknown, at = Date.now()) {
    integer(at, 'at');
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const profile = await tx.get<Row>(ctx.tenantId, 'tenant-profile', 'profile');
      if (profile && profile.status !== 'active') return { status: 'not_due' };
      const schedule = await read(tx, ctx, 'billing-schedules', id);
      const sub = await read(tx, ctx, 'subscriptions', schedule.subscriptionId);
      if (
        schedule.status !== 'active' ||
        !['active', 'trialing', 'past_due'].includes(String(sub.status)) ||
        Number(schedule.nextDueAt) > at
      )
        return { status: 'not_due' };
      const period = integer(schedule.nextDueAt, 'dueAt');
      const invoiceId = hash(`renewal:${schedule.id}:${period}`);
      const prior = await tx.get<Row>(ctx.tenantId, 'invoices', invoiceId);
      if (prior) return prior;
      const amount = integer(schedule.amountMinor, 'amount');
      const invoice = await insert(
        tx,
        ctx,
        'invoices',
        {
          customerId: schedule.customerId,
          subscriptionId: sub.id,
          scheduleId: schedule.id,
          periodStart: period,
          currency: schedule.currency,
          subtotalMinor: amount,
          discountMinor: 0,
          taxMinor: 0,
          totalMinor: amount,
          status: amount === 0 ? 'paid' : 'open',
        },
        invoiceId,
      );
      await insert(
        tx,
        ctx,
        'billing-attempts',
        { invoiceId, attempt: 0, status: amount === 0 ? 'paid' : 'due', nextAttemptAt: period },
        invoiceId,
      );
      await tx.put(ctx.tenantId, 'billing-schedules', {
        ...schedule,
        nextDueAt: period + integer(schedule.intervalDays, 'intervalDays', 1, 366) * DAY,
        updatedAt: now(),
      });
      if (amount === 0 && ['trialing', 'past_due'].includes(String(sub.status)))
        await tx.put(ctx.tenantId, 'subscriptions', { ...sub, status: 'active', updatedAt: now() });
      return invoice;
    });
  }
  /** Only a verified paid outcome closes the invoice; ambiguous outcomes reuse the same idempotency key. */
  async chargeDue(ctx: ActorContext, invoiceId: unknown, signal?: AbortSignal) {
    if (signal?.aborted) throw Error('Aborted');
    const gateway = this.settings.gateway;
    if (!gateway) return fail('Recurring gateway required', 'PROVIDER_REQUIRED', 503);
    const id = text(invoiceId, 'invoiceId', 200);
    const claim = await atomic(this.store, ctx.tenantId, async (tx) => {
      const profile = await tx.get<Row>(ctx.tenantId, 'tenant-profile', 'profile');
      if (profile && profile.status !== 'active') return undefined;
      const attempt = await read(tx, ctx, 'billing-attempts', id),
        invoice = await read(tx, ctx, 'invoices', id);
      const sub = await read(tx, ctx, 'subscriptions', invoice.subscriptionId);
      if (!['active', 'trialing', 'past_due'].includes(String(sub.status))) return undefined;
      if (
        !['due', 'pending'].includes(String(attempt.status)) ||
        Number(attempt.nextAttemptAt) > Date.now() ||
        invoice.status !== 'open'
      )
        return undefined;
      const n = integer(attempt.attempt, 'attempt', 0, 20);
      const key = hash(`charge:${ctx.tenantId}:${id}:${n}`);
      const lease = randomUUID();
      await tx.put(ctx.tenantId, 'billing-attempts', {
        ...attempt,
        status: 'pending',
        nextAttemptAt: Date.now() + 60000,
        idempotencyKey: key,
        lease,
      });
      return { invoice, n, key, lease };
    });
    if (!claim) return { status: 'not_due' };
    const { invoice, n, key, lease } = claim;
    const result = await gateway.charge({
      tenantId: ctx.tenantId,
      customerId: text(invoice.customerId),
      invoiceId: id,
      amountMinor: integer(invoice.totalMinor, 'amount'),
      currency: text(invoice.currency),
      idempotencyKey: key,
      signal,
    });
    if (!['paid', 'declined', 'pending', 'requires_action'].includes(result.status))
      return fail('Invalid gateway result', 'PROVIDER_FAILED', 502);
    text(result.reference, 'reference', 200);
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const a = await read(tx, ctx, 'billing-attempts', id);
      if (a.idempotencyKey !== key || a.lease !== lease || a.status !== 'pending')
        return { status: 'stale' };
      const inv = await read(tx, ctx, 'invoices', id),
        sub = await read(tx, ctx, 'subscriptions', inv.subscriptionId);
      if (result.status === 'paid') {
        await tx.put(ctx.tenantId, 'invoices', {
          ...inv,
          status: 'paid',
          paidAt: now(),
          providerReference: result.reference,
        });
        if (['trialing', 'past_due'].includes(String(sub.status)))
          await tx.put(ctx.tenantId, 'subscriptions', {
            ...sub,
            status: 'active',
            updatedAt: now(),
          });
      } else if (
        result.status === 'declined' &&
        ['trialing', 'active'].includes(String(sub.status))
      )
        await tx.put(ctx.tenantId, 'subscriptions', {
          ...sub,
          status: 'past_due',
          updatedAt: now(),
        });
      const status =
        result.status === 'declined'
          ? n < this.delays.length
            ? 'due'
            : 'exhausted'
          : result.status === 'requires_action' && a.wakeRequested === true
            ? 'pending'
            : result.status;
      const nextAttemptAt =
        result.status === 'declined' && n < this.delays.length
          ? Date.now() + this.delays[n] * DAY
          : Date.now() + 60000;
      await tx.put(ctx.tenantId, 'billing-attempts', {
        ...a,
        status,
        lease: null,
        wakeRequested: false,
        attempt: result.status === 'declined' ? n + 1 : n,
        nextAttemptAt,
        reference: result.reference,
        updatedAt: now(),
      });
      return { status, reference: result.reference };
    });
  }
  /** Trusted billing service: request polling of an existing customer-action attempt, never create a new charge. */
  async resume(ctx: ActorContext, invoiceId: unknown) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const a = await read(tx, ctx, 'billing-attempts', invoiceId);
      if (a.status !== 'requires_action' || a.lease || !a.idempotencyKey)
        return fail('No customer action awaiting reconciliation', 'CONFLICT', 409);
      const next = { ...a, status: 'pending', nextAttemptAt: Date.now(), updatedAt: now() };
      await tx.put(ctx.tenantId, 'billing-attempts', next);
      return { status: next.status };
    });
  }
  /** Bounded scheduler page; caller persists/rotates cursors and repeats. No network inside store transaction. */
  async sweep(ctx: ActorContext, input: JsonRecord = {}, signal?: AbortSignal) {
    const limit = integer(input.limit ?? 50, 'limit', 1, 100);
    const schedules = await page(this.store, ctx, 'billing-schedules', {
      limit,
      after: input.scheduleAfter,
    });
    let issued = 0,
      charged = 0,
      errors = 0;
    for (const schedule of schedules.items) {
      if (signal?.aborted) throw Error('Aborted');
      try {
        const result = await this.issueDue(ctx, schedule.id);
        if ('id' in result) issued++;
      } catch {
        errors++;
      }
    }
    const attempts = await page(this.store, ctx, 'billing-attempts', {
      limit,
      after: input.attemptAfter,
    });
    for (const attempt of attempts.items) {
      if (signal?.aborted) throw Error('Aborted');
      if (
        !['due', 'pending'].includes(String(attempt.status)) ||
        Number(attempt.nextAttemptAt) > Date.now()
      )
        continue;
      try {
        const result = await this.chargeDue(ctx, attempt.id, signal);
        if (!['not_due', 'stale'].includes(result.status)) charged++;
      } catch {
        errors++;
      }
    }
    return { issued, charged, errors, scheduleAfter: schedules.next, attemptAfter: attempts.next };
  }
  async cancel(ctx: ActorContext, id: unknown) {
    return update(this.store, ctx, 'billing-schedules', id, { status: 'cancelled' });
  }
}
