import { createHash } from 'node:crypto';
import { Router, type Request } from 'express';
import { body, RequestError, type createServiceAuth } from '../services/auth.js';
import type { StarterReport } from './reports.js';
import type { DurableRuntime } from './runtime.js';

type ReportJob = {
  id: string;
  type: string;
  actorId: string;
  status: string;
};

export function jobRoutes(
  runtime: DurableRuntime,
  auth: ReturnType<typeof createServiceAuth>,
): Router {
  const router = Router();
  async function actor(req: Request) {
    const principal = await auth.identity(req, true);
    if (!principal?.permissions.includes('starter:jobs'))
      throw new RequestError('Report job permission required.', 403);
    return {
      tenantId: principal.tenantId,
      actorId: principal.userId,
      permissions: principal.permissions,
    };
  }
  function status({ id, status }: ReportJob) {
    return { id, status };
  }

  router.post('/api/starter/jobs', async (req, res) => {
    body(req);
    const context = await actor(req);
    const key = req.get('idempotency-key');
    if (!key || !/^[a-zA-Z0-9_-]{16,128}$/.test(key))
      throw new RequestError('A valid idempotency key is required.');
    const idempotencyKey = createHash('sha256')
      .update(JSON.stringify([context.actorId, key]))
      .digest('hex');
    const job = await runtime.sdk.automation.enqueue(context, {
      type: 'starter.report',
      idempotencyKey,
    });
    res.status(202).json(status(job as ReportJob));
  });
  router.get('/api/starter/jobs/:id', async (req, res) => {
    const context = await actor(req);
    const job = await runtime.store.get<ReportJob>(context.tenantId, 'durable-jobs', req.params.id);
    if (!job || job.type !== 'starter.report' || job.actorId !== context.actorId)
      throw new RequestError('Report job not found.', 404);
    const report = await runtime.store.get<StarterReport>(
      context.tenantId,
      'starter-reports',
      job.id,
    );
    res.json({ ...status(job), completedAt: report?.completedAt, visits: report?.visits });
  });
  return router;
}
