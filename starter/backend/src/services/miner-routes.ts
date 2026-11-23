import { randomUUID } from 'node:crypto';
import type {
  Actor,
  Cohort,
  EventInput,
  Experiment,
  Flag,
  SavedReport,
  Scope,
  Window,
} from '@saplings/miner';
import { Router, type Request } from 'express';

import { body, type createServiceAuth, RequestError } from './auth.js';
import type { Services } from './runtime.js';

function document<T>(input: unknown, name: string): T {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new RequestError('Expected a ' + name + ' object.');
  return input as T;
}

export function minerRoutes(
  services: Services,
  auth: ReturnType<typeof createServiceAuth>,
  scope: Scope,
): Router {
  const router = Router();
  async function actor(req: Request, admin = false): Promise<Actor> {
    const principal = await auth.identity(req, admin);
    if (principal && principal.tenantId !== scope.tenantId)
      throw new RequestError('Tenant access denied.', 403);
    const visitor = auth.visitor(req);
    return {
      ...scope,
      subject: principal ? 'u:' + principal.userId : (visitor ?? 'a:unconsented'),
      consent: Boolean(visitor),
      permissions: principal?.permissions,
    };
  }
  router.post('/api/miner/consent', async (req, res) => {
    await actor(req);
    const { enabled } = body(req);
    if (typeof enabled !== 'boolean') throw new RequestError('Consent must be a boolean.');
    auth.consent(req, res, enabled);
    res.json({ enabled });
  });
  router.post('/api/miner/events', async (req, res) => {
    res.json(await services.miner.track(await actor(req), body(req) as EventInput));
  });
  router.post('/api/miner/server-event', async (req, res) => {
    body(req);
    res.json(
      await services.miner.track(await actor(req, true), {
        id: randomUUID(),
        name: 'starter.backend',
      }),
    );
  });
  router.post('/api/miner/identify', async (req, res) => {
    body(req);
    const principal = await actor(req, true);
    const visitor = auth.visitor(req);
    if (!visitor) throw new RequestError('Analytics consent is required.', 403);
    await services.miner.identify(principal, visitor);
    res.json({ linked: true });
  });
  router.post('/api/miner/flags/:id', async (req, res) => {
    body(req);
    res.json(await services.miner.evaluateFlag(await actor(req), req.params.id));
  });
  router.post('/api/miner/experiments/:id/assignment', async (req, res) => {
    body(req);
    res.json(await services.miner.assign(await actor(req), req.params.id));
  });
  router.post('/api/miner/experiments/:id/exposure', async (req, res) => {
    const { variant } = body(req);
    if (variant !== 'control' && variant !== 'treatment')
      throw new RequestError('Unknown experiment variant.');
    res.json(await services.miner.expose(await actor(req), req.params.id, variant));
  });
  router.get('/api/services/miner', async (req, res) => {
    res.json(await services.miner.inventory(await actor(req, true)));
  });
  router.post('/api/services/miner', async (req, res) => {
    const principal = await actor(req, true);
    const input = body(req);
    const range = { from: input.from, to: input.to, cohort: input.cohort } as Window;
    switch (input.action) {
      case 'report':
        res.json(
          await services.miner.report(
            principal,
            range,
            document<SavedReport>(input.report, 'report'),
          ),
        );
        break;
      case 'save-report':
        res.json(
          await services.miner.saveReport(principal, document<SavedReport>(input.report, 'report')),
        );
        break;
      case 'save-cohort':
        res.json(
          await services.miner.saveCohort(principal, document<Cohort>(input.cohort, 'cohort')),
        );
        break;
      case 'save-flag':
        res.json(await services.miner.setFlag(principal, document<Flag>(input.flag, 'flag')));
        break;
      case 'save-experiment':
        res.json(
          await services.miner.saveExperiment(
            principal,
            document<Experiment>(input.experiment, 'experiment'),
          ),
        );
        break;
      case 'launch':
        res.json(await services.miner.launch(principal, input.id as string));
        break;
      case 'stop':
        res.json(await services.miner.stop(principal, input.id as string));
        break;
      case 'results':
        res.json(await services.miner.results(principal, input.id as string, range));
        break;
      case 'delete-subject':
        await services.miner.deleteSubject(principal, input.subject as string);
        res.json({ deleted: true });
        break;
      case 'purge':
        await services.miner.purge(principal);
        res.json({ purged: true });
        break;
      default:
        throw new RequestError('Unknown Miner action.');
    }
  });
  return router;
}
