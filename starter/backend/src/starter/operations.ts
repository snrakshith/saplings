import { randomBytes } from 'node:crypto';
import { setup } from '../config/sapling.js';
import type { Check } from './types.js';

export const operations = {
  notifications: {
    title: 'Notifications and webhooks',
    description: 'Send a local in-app notification and verify an SDK-signed webhook payload.',
    async run(sdk, ctx) {
      const message = await sdk.notifications.send(ctx, {
        channel: 'inapp',
        to: ctx.actorId,
        body: 'Workspace ready',
      });
      const body = JSON.stringify({ type: 'workspace.ready' });
      const secret = randomBytes(32).toString('hex');
      const { timestamp, signature } = sdk.webhooks.sign(body, secret);
      return {
        delivery: message.status,
        signatureVerified: sdk.webhooks.verify(body, secret, timestamp, signature),
      };
    },
  },
  workflows: {
    title: 'Workflows and background jobs',
    description: 'Queue a report job and process it with a registered handler.',
    async run(sdk, ctx) {
      const { job, attempts } = setup.workflows;
      sdk.jobs.register(job, async (jobContext) => {
        await sdk.audit.record(jobContext, 'starter.report.generated', 'jobs', job);
      });
      await sdk.jobs.enqueue(
        ctx,
        job,
        {},
        { maxAttempts: attempts, idempotencyKey: 'starter-report' },
      );
      const result = await sdk.jobs.workNext(ctx);
      const events = await sdk.audit.list(ctx);
      return {
        job,
        status: result?.status,
        reportRecorded: events.some((event) => event.action === 'starter.report.generated'),
      };
    },
  },
  audit: {
    title: 'Audit and activity',
    description: 'Record an administrative action and read it from the tenant audit history.',
    async run(sdk, ctx) {
      await sdk.audit.record(ctx, 'starter.checked', 'workspace');
      const events = await sdk.audit.list(ctx, setup.audit.limit);
      return { entries: events.length, latestAction: events[0]?.action, actor: events[0]?.actorId };
    },
  },
  governance: {
    title: 'Data management and governance',
    description: 'Import and export an allowed record and inspect the tenant’s legal hold.',
    async run(sdk, ctx) {
      const { collection, days } = setup.governance;
      const imported = await sdk.data.import(ctx, {
        collection,
        rows: [{ title: 'Starter report' }],
      });
      const exported = await sdk.data.export(ctx, { collection });
      return {
        imported: imported.imported,
        exported: exported.rows.length,
        retentionDays: days,
        legalHold: await sdk.governance.held(ctx),
      };
    },
  },
  operations: {
    title: 'Provider operations',
    description: 'Submit a local driver operation and reconcile its result.',
    async run(sdk, ctx) {
      const { operation, key, target } = setup.operations;
      const pending = await sdk.providerOperations.submit(ctx, operation, key, { target });
      const result = await sdk.providerOperations.reconcile(ctx, pending.id);
      return { operation, target, submitted: pending.state, reconciled: result.state };
    },
  },
} satisfies Record<string, Check>;
