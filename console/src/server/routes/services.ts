import { Router, type Request, type Response } from 'express';
import { InputError } from '../input.js';

export type ServiceTarget = { origin: string; projectId: string; tenantId: string };

const targetKey = (project: string, tenant: string) => JSON.stringify([project, tenant]);
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;

export function serviceRoutes(targets: ServiceTarget[] = []) {
  const router = Router();
  const origins = new Map<string, URL>();
  for (const target of targets) {
    if (
      !target ||
      typeof target.origin !== 'string' ||
      typeof target.projectId !== 'string' ||
      !identifier.test(target.projectId) ||
      typeof target.tenantId !== 'string' ||
      !identifier.test(target.tenantId)
    )
      throw new Error('Invalid service target.');
    const origin = new URL(target.origin);
    if (
      !['https:', 'http:'].includes(origin.protocol) ||
      (origin.protocol === 'http:' && !['127.0.0.1', 'localhost'].includes(origin.hostname)) ||
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== '/'
    )
      throw new Error('Invalid service origin.');
    const key = targetKey(target.projectId, target.tenantId);
    if (origins.has(key)) throw new Error('Duplicate service target.');
    origins.set(key, origin);
  }

  const base = '/projects/:projectId/tenants/:tenantId/services';
  async function forward(req: Request, res: Response, route: string) {
    const { projectId, tenantId } = req.params;
    if (typeof projectId !== 'string' || typeof tenantId !== 'string')
      throw new InputError('Invalid service scope.', 400);
    const origin = origins.get(targetKey(projectId, tenantId));
    if (!origin) throw new InputError('This tenant has no configured service target.', 404);
    const operator = req.get('x-saplings-operator');
    if (!operator || !/^\S{16,8192}$/.test(operator))
      throw new InputError('Enter an application operator token.', 401);
    const payload = req.method === 'POST' ? JSON.stringify(req.body) : undefined;
    if (payload && Buffer.byteLength(payload) > 96 * 1024)
      throw new InputError('Service request is too large.', 413);
    const url = new URL('/api/services/' + route, origin);
    if (typeof req.query.before === 'string') url.searchParams.set('before', req.query.before);
    try {
      const response = await fetch(url, {
        method: req.method,
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
        headers: {
          Authorization: 'Bearer ' + operator,
          'x-saplings-project': projectId,
          'x-saplings-tenant': tenantId,
          'content-type': 'application/json',
        },
        body: payload,
      });
      if (!response.headers.get('content-type')?.startsWith('application/json') || !response.body)
        throw new Error('Invalid service response');
      const reader = response.body.getReader();
      const parts: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 2 * 1024 * 1024) {
          await reader.cancel();
          throw new Error('Service response too large');
        }
        parts.push(chunk.value);
      }
      res.status(response.status).json(JSON.parse(Buffer.concat(parts).toString('utf8')));
    } catch {
      throw new InputError('Application service is unavailable.', 502);
    }
  }
  router.get(`${base}/config`, (req, res) => forward(req, res, 'config'));
  router.get(`${base}/config/:key`, (req, res) =>
    forward(req, res, 'config/' + encodeURIComponent(req.params.key)),
  );
  router.post(`${base}/config/:key`, (req, res) =>
    forward(req, res, 'config/' + encodeURIComponent(req.params.key)),
  );
  router.get(`${base}/miner`, (req, res) => forward(req, res, 'miner'));
  router.post(`${base}/miner`, (req, res) => forward(req, res, 'miner'));
  return router;
}
