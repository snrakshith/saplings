import { ConfigError, type Actor, type Scope } from '@saplings/remote-config';
import { Router, type Request } from 'express';

import { body, type createServiceAuth, RequestError } from './auth.js';
import type { Services } from './runtime.js';

export function configRoutes(
  services: Services,
  auth: ReturnType<typeof createServiceAuth>,
  scope: Scope,
  publicTenantId: string,
): Router {
  const router = Router();
  async function actor(req: Request, key: string): Promise<Actor> {
    const principal = await auth.identity(req, true);
    if (!principal || principal.tenantId !== scope.tenantId)
      throw new RequestError('Tenant access denied.', 403);
    const publicDocument =
      Object.hasOwn(services.definitions, key) &&
      services.definitions[key as keyof typeof services.definitions].audience === 'public';
    if (publicDocument && !principal.permissions.includes('config:public'))
      throw new RequestError('Project-level access required.', 403);
    return {
      ...scope,
      tenantId: publicDocument ? publicTenantId : scope.tenantId,
      actorId: principal.userId,
      permissions: principal.permissions,
    };
  }
  router.get('/api/config/:key', async (req, res) => {
    const principal = await auth.identity(req, true);
    if (principal?.tenantId !== scope.tenantId)
      throw new RequestError('Tenant access denied.', 403);
    res.set('Cache-Control', 'private, no-cache');
    const result = await services.config.read(scope, req.params.key, 'signed-in');
    if (!result) {
      res.sendStatus(404);
      return;
    }
    res.set('ETag', result.etag);
    if (req.get('if-none-match') === result.etag) {
      res.status(304).end();
      return;
    }
    res.json({ value: result.value, revision: result.revision });
  });
  router.get('/api/public/config/:key', async (req, res) => {
    res.set('Cache-Control', 'public, no-cache');
    const result = await services.config.read(
      { ...scope, tenantId: publicTenantId },
      req.params.key,
      'public',
    );
    if (!result) {
      res.sendStatus(404);
      return;
    }
    res.set('ETag', result.etag);
    if (req.get('if-none-match') === result.etag) {
      res.status(304).end();
      return;
    }
    res.json({ value: result.value, revision: result.revision });
  });
  router.get('/api/services/config', async (req, res) => {
    const principal = await auth.identity(req, true);
    if (!principal?.permissions.includes('config:read') || principal.tenantId !== scope.tenantId)
      throw new RequestError('Config permission denied.', 403);
    const documents = Object.entries(services.definitions)
      .filter(
        ([, value]) =>
          value.audience === 'signed-in' || principal.permissions.includes('config:public'),
      )
      .map(([key, value]) => ({ key, audience: value.audience }));
    res.json({ documents });
  });
  router.get('/api/services/config/:key', async (req, res) => {
    const { key } = req.params;
    const cursor = req.query.before;
    res.json(
      await services.config.history(
        await actor(req, key),
        key,
        cursor === undefined ? undefined : Number(cursor),
      ),
    );
  });
  router.post('/api/services/config/:key', async (req, res) => {
    const { key } = req.params;
    const principal = await actor(req, key);
    const value = body(req);
    const revision = value.revision;
    if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0)
      throw new ConfigError('A current revision is required.');
    switch (value.action) {
      case 'save':
        res.json(await services.config.saveDraft(principal, key, value.value, revision));
        break;
      case 'submit':
        res.json(await services.config.submit(principal, key, revision));
        break;
      case 'approve':
        res.json(await services.config.approve(principal, key, revision));
        break;
      case 'reject':
        res.json(await services.config.reject(principal, key, revision));
        break;
      case 'restore':
        if (typeof value.from !== 'number' || !Number.isSafeInteger(value.from) || value.from < 1)
          throw new ConfigError('Select a previously published revision.');
        res.json(await services.config.restore(principal, key, value.from, revision));
        break;
      default:
        throw new ConfigError('Unknown config action.');
    }
  });
  return router;
}
