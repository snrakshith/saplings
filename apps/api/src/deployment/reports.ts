import type { SaplingSDK } from '@saplings/sdk';
import { createServices, starterScope } from '../services/runtime.js';

export type StarterReport = { id: string; completedAt: string; visits: number };

const scope = { ...starterScope, environment: 'production' as const };
const day = 86400000;

export function registerStarterReports(
  sdk: SaplingSDK,
  store: Parameters<typeof createServices>[0],
) {
  const { miner } = createServices(store);
  sdk.automation.register('starter.report', async (actor) => {
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
  });
}
