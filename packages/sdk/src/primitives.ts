import { randomUUID, createHash, createHmac } from 'node:crypto';
import type { ActorContext, JsonRecord, Store } from './types.js';
import { SaplingError } from './types.js';
export const now = () => new Date().toISOString();
export const fail = (message: string, code = 'INVALID_INPUT', status = 400): never => {
  throw new SaplingError(code, message, status);
};
export function text(x: unknown, name = 'value', max = 4096): string {
  if (typeof x !== 'string' || !x.trim() || x.length > max)
    return fail(`${name} must be a nonempty string (max ${max})`);
  return x;
}
export function integer(
  x: unknown,
  name = 'value',
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (typeof x !== 'number' || !Number.isSafeInteger(x) || x < min || x > max)
    return fail(`${name} must be an integer from ${min} to ${max}`);
  return x;
}
export function object(x: unknown): JsonRecord {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return fail('Expected an object');
  let nodes = 0;
  const visit = (v: unknown, depth: number): void => {
    if (++nodes > 50000 || depth > 32) return fail('Object exceeds structural limits');
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      for (const item of v) visit(item, depth + 1);
      return;
    }
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return fail('Expected plain JSON object');
    for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(v))) {
      if (['__proto__', 'constructor', 'prototype'].includes(k) || !('value' in d))
        return fail('Unsafe object property');
      visit(d.value, depth + 1);
    }
  };
  visit(x, 0);
  return x as JsonRecord;
}
export function strings(x: unknown): string[] {
  if (!Array.isArray(x) || x.length > 1000) return fail('Expected a bounded string array');
  return x.map((s) => text(s));
}
export function scope(ctx: ActorContext) {
  text(ctx.tenantId, 'tenantId', 200);
  text(ctx.actorId, 'actorId', 200);
  if (ctx.tenantId.startsWith('__sapling_')) fail('Reserved tenant namespace', 'FORBIDDEN', 403);
}
export function hash(s: string) {
  return createHash('sha256').update(s).digest('hex') as string;
}
export async function atomic<T>(
  store: Store,
  tenant: string,
  fn: (tx: Store) => Promise<T>,
): Promise<T> {
  if (!store.transaction) return fail('Transactional store required', 'TRANSACTION_REQUIRED', 503);
  return store.transaction(tenant, fn);
}
export type Row = JsonRecord & { id: string; createdAt?: string; updatedAt?: string };
export async function read(
  store: Store,
  ctx: ActorContext,
  collection: string,
  id: unknown,
): Promise<Row> {
  const row = await store.get<Row>(ctx.tenantId, collection, text(id, 'id', 200));
  return row ?? fail('Resource not found', 'NOT_FOUND', 404);
}
export async function insert(
  store: Store,
  ctx: ActorContext,
  collection: string,
  data: JsonRecord,
  id = randomUUID(),
): Promise<Row> {
  scope(ctx);
  const row = { ...data, id, createdAt: now(), updatedAt: now() };
  await store.put(ctx.tenantId, collection, row);
  return row;
}
export async function update(
  store: Store,
  ctx: ActorContext,
  collection: string,
  id: unknown,
  changes: JsonRecord,
): Promise<Row> {
  return atomic(store, ctx.tenantId, async (tx) => {
    const old = await read(tx, ctx, collection, id);
    const row = { ...old, ...changes, id: old.id, createdAt: old.createdAt, updatedAt: now() };
    await tx.put(ctx.tenantId, collection, row);
    return row;
  });
}
export async function page(
  store: Store,
  ctx: ActorContext,
  collection: string,
  input: JsonRecord = {},
) {
  const limit = integer(input.limit ?? 50, 'limit', 1, 500);
  const after = input.after === undefined ? undefined : text(input.after, 'after');
  if (store.page) return store.page<Row>(ctx.tenantId, collection, limit, after);
  const rows = (await store.list<Row>(ctx.tenantId, collection))
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((r) => !after || r.id > after)
    .slice(0, limit + 1);
  return {
    items: rows.slice(0, limit),
    next: rows.length > limit ? rows[limit - 1].id : undefined,
  };
}
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 12) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 1000).map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        /password|secret|token|authorization|cookie|api.?key|card.?number|digest/i.test(k)
          ? '[REDACTED]'
          : redact(v, depth + 1),
      ]),
    );
  return value;
}
export function sign(payload: string, key: string) {
  return createHmac('sha256', key).update(payload).digest('hex') as string;
}
