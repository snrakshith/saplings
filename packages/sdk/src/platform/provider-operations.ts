import { randomUUID } from 'node:crypto';
import type { ActorContext, JsonRecord, Store } from '../types.js';
import { atomic, fail, hash, object, text, scope } from '../runtime/primitives.js';
import { timeout } from '../runtime/reliability.js';
export type ProviderState =
  'submitting' | 'accepted' | 'running' | 'succeeded' | 'failed' | 'unknown';
export interface ProviderObservation {
  state: Exclude<ProviderState, 'submitting'>;
  reference?: string;
}
export interface OperationDriver {
  submit(
    ctx: ActorContext,
    operationId: string,
    input: JsonRecord,
    signal: AbortSignal,
  ): Promise<ProviderObservation>;
  inspect(
    ctx: ActorContext,
    operationId: string,
    reference: string | undefined,
    signal: AbortSignal,
  ): Promise<ProviderObservation>;
}
interface Operation {
  id: string;
  actorId: string;
  kind: string;
  fingerprint: string;
  state: ProviderState;
  reference?: string;
  lease?: string;
  leaseUntil: number;
  updatedAt: string;
}
const collection = 'provider-operations';
const canonical = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.entries(v)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([k, x]) => [k, canonical(x)]),
        )
      : v;
/** Trusted service API. Call after operation-specific authorization; no generic public router. Unknown submissions are never automatically redispatched. */
export class ProviderOperations {
  constructor(
    private store: Store,
    private drivers: Record<string, OperationDriver>,
    private deadlineMs = 15000,
    private authorize?: (
      ctx: ActorContext,
      kind: string,
      action: 'submit' | 'read' | 'reconcile',
    ) => Promise<void>,
  ) {
    if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 10 || deadlineMs > 120000)
      throw Error('Invalid provider deadline');
  }
  private driver(kind: string) {
    if (!Object.hasOwn(this.drivers, kind))
      return fail('Provider operation not configured', 'PROVIDER_REQUIRED', 503);
    return this.drivers[kind];
  }
  private async owned(ctx: ActorContext, id: string) {
    scope(ctx);
    const row = await this.store.get<Operation>(ctx.tenantId, collection, id);
    if (!row || row.actorId !== ctx.actorId) return fail('Operation not found', 'NOT_FOUND', 404);
    return row;
  }
  private view(row: Operation) {
    return {
      id: row.id,
      kind: row.kind,
      state: row.state,
      reference: row.reference,
      updatedAt: row.updatedAt,
    };
  }
  async get(ctx: ActorContext, id: string) {
    const row = await this.owned(ctx, id);
    await this.authorize?.(ctx, row.kind, 'read');
    return this.view(row);
  }
  async submit(ctx: ActorContext, kind: string, key: string, input: JsonRecord) {
    scope(ctx);
    await this.authorize?.(ctx, kind, 'submit');
    const driver = this.driver(kind);
    text(key, 'operation key', 200);
    const payload = JSON.stringify(canonical(object(input)));
    if (Buffer.byteLength(payload) > 1000000) return fail('Operation payload too large');
    const fingerprint = hash(payload),
      id = hash(JSON.stringify([ctx.tenantId, ctx.actorId, kind, key])),
      lease = randomUUID();
    const claim = await atomic(this.store, ctx.tenantId, async (tx) => {
      const old = await tx.get<Operation>(ctx.tenantId, collection, id);
      if (old) {
        if (old.fingerprint !== fingerprint) return fail('Operation key conflict', 'CONFLICT', 409);
        return { row: old, claimed: false };
      }
      const row: Operation = {
        id,
        kind,
        actorId: ctx.actorId,
        fingerprint,
        state: 'submitting',
        lease,
        leaseUntil: Date.now() + this.deadlineMs + 5000,
        updatedAt: new Date().toISOString(),
      };
      await tx.put(ctx.tenantId, collection, row);
      return { row, claimed: true };
    });
    if (!claim.claimed) return this.view(claim.row);
    let observation: ProviderObservation;
    try {
      observation = await timeout(
        (signal) => driver.submit(ctx, id, JSON.parse(payload), signal),
        this.deadlineMs,
      );
    } catch {
      observation = { state: 'unknown' };
    }
    return this.settle(ctx, id, lease, observation);
  }
  private async settle(
    ctx: ActorContext,
    id: string,
    lease: string,
    observation: ProviderObservation,
  ) {
    return atomic(this.store, ctx.tenantId, async (tx) => {
      const current = await tx.get<Operation>(ctx.tenantId, collection, id);
      if (!current || current.actorId !== ctx.actorId)
        return fail('Operation not found', 'NOT_FOUND', 404);
      if (current.lease !== lease || current.leaseUntil < Date.now()) return this.view(current);
      const valid = ['accepted', 'running', 'succeeded', 'failed', 'unknown'].includes(
        observation?.state,
      );
      const reference = observation?.reference;
      if (reference !== undefined && (typeof reference !== 'string' || reference.length > 200))
        return fail('Invalid provider reference', 'PROVIDER_FAILED', 502);
      if (current.reference && reference && current.reference !== reference)
        return fail('Provider reference changed', 'CONFLICT', 409);
      const next: Operation = {
        ...current,
        state: valid ? observation.state : 'unknown',
        reference: reference ?? current.reference,
        lease: undefined,
        leaseUntil: 0,
        updatedAt: new Date().toISOString(),
      };
      await tx.put(ctx.tenantId, collection, next);
      return this.view(next);
    });
  }
  async reconcile(ctx: ActorContext, id: string) {
    const owned = await this.owned(ctx, id);
    await this.authorize?.(ctx, owned.kind, 'reconcile');
    const lease = randomUUID();
    const claim = await atomic(this.store, ctx.tenantId, async (tx) => {
      const row = await tx.get<Operation>(ctx.tenantId, collection, id);
      if (!row || row.actorId !== ctx.actorId) return fail('Operation not found', 'NOT_FOUND', 404);
      if (['succeeded', 'failed'].includes(row.state) || row.leaseUntil > Date.now())
        return { row, claimed: false };
      const next = { ...row, lease, leaseUntil: Date.now() + this.deadlineMs + 5000 };
      await tx.put(ctx.tenantId, collection, next);
      return { row: next, claimed: true };
    });
    if (!claim.claimed) return this.view(claim.row);
    let observation: ProviderObservation;
    try {
      observation = await timeout(
        (signal) => this.driver(claim.row.kind).inspect(ctx, id, claim.row.reference, signal),
        this.deadlineMs,
      );
    } catch {
      observation = { state: 'unknown' };
    }
    return this.settle(ctx, id, lease, observation);
  }
}
