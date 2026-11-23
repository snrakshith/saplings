import type { SaplingSDK } from '@saplings/sdk';
import type { StarterTelemetry } from './telemetry.js';
import { createServices, starterScope } from '../services/runtime.js';

export type StarterReport = { id: string; completedAt: string; visits: number };

const day = 86400000;

export function registerStarterReports(
  sdk: SaplingSDK,
  store: Parameters<typeof createServices>[0],
  environment: 'staging' | 'production',
  telemetry?: StarterTelemetry,
) {
  const { miner } = createServices(store);
  const scope = { ...starterScope, environment };
  sdk.automation.register('starter.report', async (actor, job) => {
    async function generate() {
      const id = actor.correlationId;
      if (!id || actor.tenantId !== scope.tenantId)
        throw new Error('Invalid Starter report context.');
      const collection = 'starter-reports';
      const previous = await store.get<StarterReport>(scope.tenantId, collection, id);
      if (previous) return previous;
      const now = Date.now();
      const result = await miner.report(
        { ...scope, subject: 'u:starter-worker', consent: false, permissions: ['miner:read'] },
        { from: now - day, to: now + 1 },
        { id: 'starter-report', type: 'trend', event: 'starter.viewed' },
      );
      if (!('total' in result)) throw new Error('Unexpected Miner report type.');
      const report = { id, completedAt: new Date(now).toISOString(), visits: result.total };
      return store.transaction(scope.tenantId, async (tx) => {
        const existing = await tx.get<StarterReport>(scope.tenantId, collection, id);
        if (existing) return existing;
        await tx.put(scope.tenantId, collection, report);
        return report;
      });
    }
    return telemetry
      ? telemetry.report(
          typeof job.traceparent === 'string' ? job.traceparent : undefined,
          generate,
        )
      : generate();
  });
}
