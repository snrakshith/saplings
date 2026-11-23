import { Router, type RequestHandler } from 'express';

import { capabilities, runStarterCheck } from './checks.js';
import type { StarterRuntime } from './runtime.js';

const localOnly: RequestHandler = (req, res, next) => {
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
  if (
    process.env.NODE_ENV === 'production' ||
    !local ||
    !/^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(req.headers.host ?? '')
  ) {
    res.sendStatus(404);
    return;
  }
  res.set('Cache-Control', 'no-store');
  next();
};

export function starterRoutes(runtime: () => Promise<StarterRuntime>): Router {
  const router = Router();
  router.get('/.well-known/saplings-console.json', localOnly, async (_req, res) => {
    res.json((await runtime()).manifest);
  });
  router.get('/api/starter', localOnly, (_req, res) => {
    res.json({ capabilities });
  });
  router.get('/api/starter/catalog', localOnly, async (_req, res) => {
    res.json((await runtime()).sdk.featureManifest());
  });
  router.post<{ id: string }>('/api/starter/:id', localOnly, async (req, res) => {
    if (!req.is('application/json')) {
      res.status(415).json({ error: 'Send a JSON request.' });
      return;
    }
    try {
      const result = await runStarterCheck(req.params.id, await runtime());
      if (!result) {
        res.status(404).json({ error: 'Starter capability not found.' });
        return;
      }
      res.json({ result });
    } catch (error) {
      res
        .status(422)
        .json({ error: error instanceof Error ? error.message : 'Starter check failed.' });
    }
  });
  return router;
}
