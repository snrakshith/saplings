import type { SaplingSDK } from '../index.js';
import type { ActorContext, JsonRecord } from '../types.js';
import {
  atomic,
  fail,
  hash,
  insert,
  object,
  read,
  strings,
  text,
  integer,
  tenantIsActive,
} from '../runtime/primitives.js';
import type { Row } from '../runtime/primitives.js';
import { sleep } from '../runtime/reliability.js';
export type JobHandler = (
  ctx: ActorContext,
  input: JsonRecord,
  signal: AbortSignal,
) => Promise<unknown>;
export interface WorkerSettings {
  webhooks?: Record<string, { url: string; secret: string }>;
  workflows?: Record<string, JobHandler>;
  eventHandlers?: Record<string, JobHandler>;
  dunning?: JobHandler;
  maxPerTenant?: number;
  tenantConcurrency?: number;
  deadlineMs?: number;
  requireDurableEventHandler?: boolean;
}
/** Workers use configured service identities and fixed destinations; jobs are at-least-once, not exactly-once. */
export class WorkerRuntime {
  private running = false;
  private ticking = false;
  private cursor = 0;
  constructor(
    private sdk: SaplingSDK,
    private settings: WorkerSettings = {},
  ) {
    const w = sdk.automation;
    const notify = async (c: ActorContext, i: JsonRecord) => {
      const channel = text(i.channel);
      if (!['email', 'sms', 'push'].includes(channel)) return fail('Unsupported channel');
      const feature =
        channel === 'email' ? 'SAAS-071' : channel === 'sms' ? 'SAAS-073' : 'SAAS-074';
      return sdk.capabilities.invoke(c, feature, 'send', i);
    };
    w.register('notifications.bulk', async (c, i, signal) => {
      for (const to of strings(i.recipients)) {
        if (signal.aborted) throw Error('Aborted');
        const id = hash(`${c.correlationId}:${to}`);
        if (await sdk.store.get(c.tenantId, 'worker-deliveries', id)) continue;
        await notify(c, { ...i, to, subjectId: to });
        await sdk.store.put(c.tenantId, 'worker-deliveries', { id, at: new Date().toISOString() });
      }
    });
    w.register('notification.retry', async (c, i) => notify(c, i));
    w.register('report.generate', async (c, i) => {
      const report = await sdk.analytics.count(c, i);
      const id = hash(`report:${c.correlationId}`);
      await sdk.store.put(c.tenantId, 'generated-reports', {
        id,
        report,
        at: new Date().toISOString(),
      });
      return { id };
    });
    w.register('event.dispatch', async (c, i, signal) => {
      const type = text(i.type);
      const h = this.settings.eventHandlers?.[type];
      if (h && Object.hasOwn(this.settings.eventHandlers!, type))
        return h(c, object(i.payload ?? {}), signal);
      if (this.settings.requireDurableEventHandler || sdk.config.app.environment === 'production')
        return fail('Durable event handler required', 'CONFIG_REQUIRED', 503);
      return sdk.events.emit(c, type, object(i.payload ?? {}));
    });
    w.register('webhook.deliver', async (c, i, signal) => {
      const name = text(i.destination),
        dest = this.settings.webhooks?.[name];
      if (!dest || !Object.hasOwn(this.settings.webhooks!, name))
        return fail('Webhook destination not allowlisted', 'FORBIDDEN', 403);
      const url = new URL(dest.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash)
        throw Error('Invalid webhook destination');
      const payload = JSON.stringify(i.payload ?? {});
      if (Buffer.byteLength(payload) > 1000000) throw Error('Webhook payload too large');
      const proof = sdk.webhooks.sign(payload, dest.secret);
      const r = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
        headers: {
          'content-type': 'application/json',
          'x-sapling-timestamp': String(proof.timestamp),
          'x-sapling-signature': proof.signature,
          'idempotency-key': c.correlationId ?? '',
        },
        body: payload,
      });
      await r.body?.cancel();
      if (!r.ok) throw Error(`Webhook status ${r.status}`);
      return { delivered: true };
    });
    w.register('workflow.execute', async (c, i, signal) => {
      const name = text(i.workflow),
        h = this.settings.workflows?.[name];
      if (!h || !Object.hasOwn(this.settings.workflows!, name))
        return fail('Workflow not registered', 'CONFIG_REQUIRED', 503);
      return h(c, object(i.payload ?? {}), signal);
    });
    w.register('billing.dunning', async (c, i, signal) => {
      if (this.settings.dunning) return this.settings.dunning(c, i, signal);
      return sdk.recurring.chargeDue(c, i.invoiceId, signal);
    });
    w.register('maintenance.cleanup', async (c) => sdk.accounts.cleanup(c.tenantId));
  }
  async relay(ctx: ActorContext, limit = 100) {
    const size = integer(limit, 'limit', 1, 500);
    return this.sdk.store.transaction!(ctx.tenantId, async (tx) => {
      if (!(await tenantIsActive(tx, ctx.tenantId))) return 0;
      let relayed = 0;
      const state = await tx.get<{ id: string; after?: string }>(
        ctx.tenantId,
        'worker-cursors',
        'outbox',
      );
      const page = tx.page
        ? await tx.page<Row>(ctx.tenantId, 'outbox', size, state?.after)
        : (() => {
            throw Error('Outbox requires cursor pagination');
          })();
      for (const r of page.items) {
        if (r.status !== 'pending') continue;
        const id = `outbox:${r.id}`;
        const existing = await tx.get<Row>(ctx.tenantId, 'durable-jobs', id);
        if (!existing)
          await insert(
            tx,
            ctx,
            'durable-jobs',
            {
              type: 'event.dispatch',
              payload: { type: r.type, payload: r.payload },
              outboxId: r.id,
              status: 'queued',
              attempts: 0,
              maxAttempts: 5,
              dueAt: new Date().toISOString(),
              actorId: ctx.actorId,
            },
            id,
          );
        else if (existing.outboxId !== r.id || existing.type !== 'event.dispatch')
          throw Error('Outbox job identity conflict');
        const status =
          existing?.status === 'completed'
            ? 'delivered'
            : existing?.status === 'dead'
              ? 'dead'
              : 'relayed';
        await tx.put(ctx.tenantId, 'outbox', {
          ...r,
          status,
          relayedAt: new Date().toISOString(),
          jobId: id,
        });
        relayed++;
      }
      await tx.put(ctx.tenantId, 'worker-cursors', { id: 'outbox', after: page.next });
      return relayed;
    });
  }
  async tick(tenants: ActorContext[]) {
    if (this.ticking) throw Error('Worker tick already running');
    this.ticking = true;
    try {
      const max = integer(this.settings.maxPerTenant ?? 5, 'maxPerTenant', 1, 100),
        concurrency = integer(this.settings.tenantConcurrency ?? 4, 'tenantConcurrency', 1, 32);
      const unique = [...new Map(tenants.map((c) => [c.tenantId, c])).values()];
      if (!unique.length) return 0;
      const offset = this.cursor++ % unique.length;
      const ordered = [...unique.slice(offset), ...unique.slice(0, offset)];
      let processed = 0,
        index = 0;
      const errors: unknown[] = [];
      await Promise.all(
        Array.from({ length: Math.min(concurrency, ordered.length) }, async () => {
          while (index < ordered.length) {
            const ctx = ordered[index++];
            try {
              if (!(await tenantIsActive(this.sdk.store, ctx.tenantId))) continue;
              await this.relay(ctx);
              for (let n = 0; n < max; n++) {
                const row = await this.sdk.automation.work(ctx, this.settings.deadlineMs);
                if (!row) break;
                processed++;
              }
            } catch (e) {
              errors.push(e);
            }
          }
        }),
      );
      if (errors.length) throw new AggregateError(errors, 'One or more tenant worker ticks failed');
      return processed;
    } finally {
      this.ticking = false;
    }
  }
  async run(tenants: () => Promise<ActorContext[]>, signal: AbortSignal, intervalMs = 1000) {
    if (this.running) throw Error('Worker already running');
    this.running = true;
    try {
      while (!signal.aborted && this.sdk.lifecycle.ready) {
        try {
          await this.tick(await tenants());
        } catch {
          await this.sdk.telemetry.log('error', 'worker.tick.failed');
        }
        if (!signal.aborted) await sleep(intervalMs);
      }
    } finally {
      this.running = false;
    }
  }
}
