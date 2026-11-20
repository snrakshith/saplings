import { randomUUID } from 'node:crypto';
import type { ActorContext, Store, JsonRecord } from './types.js';
import { SaplingError } from './types.js';
import { AuditService } from './audit.js';
export interface Job {
  id: string;
  type: string;
  payload: JsonRecord;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'dead';
  attempts: number;
  maxAttempts: number;
  dueAt: string;
  lastError?: string;
  createdAt: string;
}
export class JobService {
  private handlers = new Map<string, (ctx: ActorContext, payload: JsonRecord) => Promise<void>>();
  constructor(
    private store: Store,
    private audit: AuditService,
    private maxAttempts: number,
  ) {}
  register(type: string, handler: (ctx: ActorContext, payload: JsonRecord) => Promise<void>) {
    this.handlers.set(type, handler);
  }
  async enqueue(
    ctx: ActorContext,
    type: string,
    payload: JsonRecord,
    options: { dueAt?: string; maxAttempts?: number; idempotencyKey?: string } = {},
  ) {
    if (!ctx.tenantId || !ctx.actorId)
      throw new SaplingError('CONTEXT_REQUIRED', 'Verified context required');
    const id = options.idempotencyKey ? `idem:${type}:${options.idempotencyKey}` : randomUUID();
    const existing = await this.store.get<Job>(ctx.tenantId, 'jobs', id);
    if (existing) return existing;
    const row: Job = {
      id,
      type,
      payload,
      status: 'queued',
      attempts: 0,
      maxAttempts: options.maxAttempts ?? this.maxAttempts,
      dueAt: options.dueAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    if (row.maxAttempts < 1) throw new SaplingError('BAD_RETRY', 'maxAttempts must be positive');
    await this.store.put(ctx.tenantId, 'jobs', row);
    await this.audit.record(ctx, 'job.enqueued', 'jobs', id, { type });
    return row;
  }
  /** Invoke explicitly from worker. Not an automatic durable distributed queue or lease mechanism. */
  async workNext(ctx: ActorContext) {
    const jobs = await this.store.list<Job>(ctx.tenantId, 'jobs');
    const row = jobs
      .filter((j) => j.status === 'queued' && Date.parse(j.dueAt) <= Date.now())
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
    if (!row) return undefined;
    const handler = this.handlers.get(row.type);
    const running = { ...row, attempts: row.attempts + 1, status: 'running' as const };
    await this.store.put(ctx.tenantId, 'jobs', running);
    try {
      if (!handler) throw new Error(`No handler registered for ${row.type}`);
      await handler(ctx, row.payload);
      const result: Job = { ...running, status: 'completed' };
      await this.store.put(ctx.tenantId, 'jobs', result);
      await this.audit.record(ctx, 'job.completed', 'jobs', row.id);
      return result;
    } catch (e) {
      const attempts = running.attempts;
      const status = attempts >= row.maxAttempts ? 'dead' : 'queued';
      const next: Job = {
        ...running,
        status,
        lastError: e instanceof Error ? e.message.slice(0, 200) : 'Unknown failure',
        dueAt: new Date(Date.now() + Math.min(60000, 1000 * 2 ** attempts)).toISOString(),
      };
      await this.store.put(ctx.tenantId, 'jobs', next);
      await this.audit.record(ctx, `job.${status}`, 'jobs', row.id);
      return next;
    }
  }
  async list(ctx: ActorContext) {
    return this.store.list<Job>(ctx.tenantId, 'jobs');
  }
}
