import { timeout } from './reliability.js';
import { randomUUID } from 'node:crypto';
import type { ActorContext, JsonRecord, Store } from './types.js';
import {
  atomic,
  fail,
  insert,
  integer,
  now,
  object,
  read,
  strings,
  text,
  requireActiveTenant,
  tenantIsActive,
} from './primitives.js';
import type { Row } from './primitives.js';
export class Automation {
  private handlers = new Map<
    string,
    (ctx: ActorContext, payload: JsonRecord, signal: AbortSignal) => Promise<unknown>
  >();
  constructor(private store: Store) {}
  registered(name: string) {
    return this.handlers.has(name);
  }
  register(
    name: string,
    handler: (ctx: ActorContext, payload: JsonRecord, signal: AbortSignal) => Promise<unknown>,
  ) {
    this.handlers.set(text(name), handler);
  }
  async enqueue(ctx: ActorContext, input: JsonRecord) {
    const type = text(input.type, 'job type'),
      key =
        input.idempotencyKey === undefined
          ? randomUUID()
          : text(input.idempotencyKey, 'idempotencyKey', 200);
    if (key.startsWith('outbox:')) return fail('Reserved job key', 'FORBIDDEN', 403);
    const dueAt = input.dueAt === undefined ? now() : new Date(text(input.dueAt)).toISOString();
    return atomic(this.store, ctx.tenantId, async (tx) => {
      await requireActiveTenant(tx, ctx.tenantId);
      const old = await tx.get<Row>(ctx.tenantId, 'durable-jobs', key);
      if (old) {
        if (
          old.type !== type ||
          JSON.stringify(old.payload) !== JSON.stringify(input.payload ?? {})
        )
          return fail('Job key conflict', 'CONFLICT', 409);
        return old;
      }
      return insert(
        tx,
        ctx,
        'durable-jobs',
        {
          type,
          payload: object(input.payload ?? {}),
          status: 'queued',
          attempts: 0,
          maxAttempts: integer(input.maxAttempts ?? 5, 'maxAttempts', 1, 20),
          dueAt,
          actorId: ctx.actorId,
        },
        key,
      );
    });
  }
  private async outboxStatus(
    tx: Store,
    ctx: ActorContext,
    job: Row,
    status: 'delivered' | 'dead' | 'relayed',
  ) {
    if (typeof job.outboxId !== 'string' || job.id !== `outbox:${job.outboxId}`) return;
    const row = await tx.get<Row>(ctx.tenantId, 'outbox', job.outboxId);
    if (row?.jobId === job.id)
      await tx.put(ctx.tenantId, 'outbox', { ...row, status, updatedAt: now() });
  }
  async claim(ctx: ActorContext, leaseMs = 60000) {
    integer(leaseMs, 'leaseMs', 100, 300000);
    return atomic(this.store, ctx.tenantId, async (tx) => {
      if (!(await tenantIsActive(tx, ctx.tenantId))) return undefined;
      const t = Date.now();
      const jobs = (
        tx.claimableJobs
          ? await tx.claimableJobs<Row>(ctx.tenantId, t, 100)
          : await tx.list<Row>(ctx.tenantId, 'durable-jobs')
      )
        .filter(
          (j) =>
            (j.status === 'queued' && Date.parse(String(j.dueAt)) <= t) ||
            (j.status === 'running' && Number(j.leaseUntil) <= t),
        )
        .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
      for (const job of jobs) {
        if (Number(job.attempts) >= Number(job.maxAttempts)) {
          await tx.put(ctx.tenantId, 'durable-jobs', {
            ...job,
            status: 'dead',
            leaseId: null,
            leaseUntil: null,
          });
          await this.outboxStatus(tx, ctx, job, 'dead');
          continue;
        }
        const next: Row = {
          ...job,
          status: 'running',
          attempts: Number(job.attempts) + 1,
          leaseId: randomUUID(),
          leaseUntil: t + leaseMs,
        };
        await tx.put(ctx.tenantId, 'durable-jobs', next);
        return next;
      }
      return undefined;
    });
  }
  async finish(ctx: ActorContext, job: Row, ok: boolean) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const current = await read(tx, ctx, 'durable-jobs', job.id);
      if (
        current.status !== 'running' ||
        current.leaseId !== job.leaseId ||
        Number(current.leaseUntil) < Date.now()
      )
        return fail('Stale lease', 'CONFLICT', 409);
      const status = ok
        ? 'completed'
        : Number(current.attempts) >= Number(current.maxAttempts)
          ? 'dead'
          : 'queued';
      const next = {
        ...current,
        status,
        leaseId: null,
        leaseUntil: null,
        dueAt: new Date(
          Date.now() + Math.min(300000, 1000 * 2 ** Number(current.attempts)),
        ).toISOString(),
        updatedAt: now(),
      };
      await tx.put(ctx.tenantId, 'durable-jobs', next);
      if (status !== 'queued')
        await this.outboxStatus(tx, ctx, current, status === 'completed' ? 'delivered' : 'dead');
      return next;
    });
  }
  async work(ctx: ActorContext, deadlineMs = 45000) {
    integer(deadlineMs, 'deadlineMs', 10, 240000);
    const job = await this.claim(ctx, deadlineMs + 15000);
    if (!job) return undefined;
    let ok = false;
    try {
      const handler = this.handlers.get(String(job.type));
      if (!handler) throw new Error('Unregistered job');
      await timeout(
        (signal) => handler({ ...ctx, correlationId: String(job.id) }, object(job.payload), signal),
        deadlineMs,
      );
      ok = true;
    } catch {
      /* retry without sensitive error text */
    }
    return this.finish(ctx, job, ok);
  }
  async requeue(ctx: ActorContext, id: unknown) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      await requireActiveTenant(tx, ctx.tenantId);
      const job = await read(tx, ctx, 'durable-jobs', id);
      if (job.status !== 'dead') return fail('Job is not dead', 'CONFLICT', 409);
      const next = { ...job, status: 'queued', attempts: 0, dueAt: now() };
      await tx.put(ctx.tenantId, 'durable-jobs', next);
      await this.outboxStatus(tx, ctx, job, 'relayed');
      return next;
    });
  }
  async approval(ctx: ActorContext, input: JsonRecord) {
    return insert(this.store, ctx, 'approvals', {
      resourceId: text(input.resourceId),
      requestedBy: ctx.actorId,
      approvers: strings(input.approvers),
      status: 'pending',
    });
  }
  async decide(ctx: ActorContext, input: JsonRecord) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const a = await read(tx, ctx, 'approvals', input.id);
      if (
        a.status !== 'pending' ||
        a.requestedBy === ctx.actorId ||
        !strings(a.approvers).includes(ctx.actorId)
      )
        return fail('Not eligible to decide', 'FORBIDDEN', 403);
      const decision = text(input.decision);
      if (!['approved', 'rejected'].includes(decision)) return fail('Invalid decision');
      await tx.put(ctx.tenantId, 'approvals', {
        ...a,
        status: decision,
        decidedBy: ctx.actorId,
        decidedAt: now(),
      });
      return insert(tx, ctx, 'approval-history', {
        approvalId: a.id,
        decision,
        actorId: ctx.actorId,
      });
    });
  }
  async outbox(ctx: ActorContext, input: JsonRecord) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      await requireActiveTenant(tx, ctx.tenantId);
      return insert(tx, ctx, 'outbox', {
        type: text(input.type),
        payload: object(input.payload),
        status: 'pending',
      });
    });
  }
  /** Atomically append event alongside local state. External delivery is at-least-once. */
  async publishWithState(
    ctx: ActorContext,
    collection: string,
    data: JsonRecord,
    event: { type: string; payload: JsonRecord },
  ) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      await requireActiveTenant(tx, ctx.tenantId);
      const row = await insert(tx, ctx, collection, data);
      await insert(tx, ctx, 'outbox', { ...event, status: 'pending', resourceId: row.id });
      return row;
    });
  }
  async rule(ctx: ActorContext, input: JsonRecord) {
    const data = object(input.data),
      field = text(input.field),
      op = text(input.op);
    if (!['eq', 'neq', 'gt', 'lt', 'in'].includes(op)) return fail('Unknown operator');
    const v = data[field],
      expected = input.value;
    return {
      matched:
        op === 'eq'
          ? v === expected
          : op === 'neq'
            ? v !== expected
            : op === 'gt'
              ? typeof v === 'number' && typeof expected === 'number' && v > expected
              : op === 'lt'
                ? typeof v === 'number' && typeof expected === 'number' && v < expected
                : Array.isArray(expected) && expected.includes(v),
    };
  }
}
