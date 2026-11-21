import { createEngine } from './engine.js';
import { createExperiments } from './experiments.js';
import { funnel, retention, trends } from './reports.js';
import type {
  Actor,
  Cohort,
  ExperimentRecord,
  Flag,
  MinerStore,
  SavedReport,
  Schema,
  Window,
} from './types.js';
import { collection, key, permission, reject } from './validation.js';

export { MinerError } from './validation.js';
export type * from './types.js';

export function createMiner(options: {
  store: MinerStore;
  schemas: Readonly<Record<string, Schema>>;
  retentionDays?: number;
  now?: () => number;
}) {
  const { store, schemas, retentionDays = 90, now = Date.now } = options;
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 90)
    return reject('Choose a retention policy from 1 to 90 days.');
  const engine = createEngine(store, schemas, retentionDays, now);
  function query(rows: Awaited<ReturnType<typeof engine.events>>, report: SavedReport) {
    switch (report.type) {
      case 'trend':
        return trends(rows, report.event, report.property);
      case 'funnel':
        return funnel(rows, report.steps);
      case 'retention':
        return retention(rows, report.first, report.returning, report.days);
      default:
        return reject('Unknown report type.');
    }
  }
  return {
    track: engine.track,
    identify: engine.identify,
    saveCohort: engine.saveCohort,
    deleteSubject: engine.deleteSubject,
    purge: engine.purge,
    ...createExperiments(store, engine, schemas, now),
    async report(actor: Actor, range: Window, report: SavedReport) {
      permission(actor, 'miner:read');
      return query(await engine.events(actor, range), report);
    },
    async saveReport(actor: Actor, report: SavedReport) {
      permission(actor, 'miner:admin');
      key(report.id);
      query([], report);
      await store.put(actor.tenantId, collection(actor, 'reports'), report);
      return report;
    },
    async inventory(actor: Actor) {
      permission(actor, 'miner:read');
      const list = <T>(name: string) => store.list<T>(actor.tenantId, collection(actor, name));
      const [reports, flags, experiments, cohorts] = await Promise.all([
        list<SavedReport>('reports'),
        list<Flag>('flags'),
        list<ExperimentRecord>('experiments'),
        list<Cohort>('cohorts'),
      ]);
      return { events: Object.keys(schemas), reports, flags, experiments, cohorts };
    },
    async reports(actor: Actor) {
      permission(actor, 'miner:read');
      return store.list<SavedReport>(actor.tenantId, collection(actor, 'reports'));
    },
  };
}
