import { randomBytes } from 'node:crypto';
import { ConfigError, type ReviewPolicy } from '@saplings/remote-config';
import { MinerError } from '@saplings/miner';
import { InMemoryStore } from '@saplings/sdk';
import { Router, type ErrorRequestHandler } from 'express';

import { body, createLocalLogin, createServiceAuth, RequestError } from './auth.js';
import { configRoutes } from './config-routes.js';
import { minerRoutes } from './miner-routes.js';
import { createServices, publicTenantId, starterScope } from './runtime.js';

const localHost = /^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;
const loopback = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1']);

export function localServices(store = new InMemoryStore()): {
  router: Router;
  credentials: ReturnType<typeof createLocalLogin>['credentials'];
} {
  const login = createLocalLogin(starterScope.tenantId);
  const policy = process.env.SAPLINGS_CONFIG_REVIEW;
  if (policy && policy !== 'operator' && policy !== 'distinct-reviewer')
    throw new Error('Invalid SAPLINGS_CONFIG_REVIEW');
  const router = Router();
  const auth = createServiceAuth(login.authentication, randomBytes(32).toString('hex'));
  const services = createServices(store, {
    reviewPolicy: policy as ReviewPolicy | undefined,
  });
  router.use(
    ['/api/config', '/api/public/config', '/api/services', '/api/miner', '/api/starter/session'],
    (req, res, next) => {
      if (
        process.env.NODE_ENV === 'production' ||
        !loopback.has(req.socket.remoteAddress ?? '') ||
        !localHost.test(req.get('host') ?? '')
      ) {
        res.sendStatus(404);
        return;
      }
      if (
        req.path.startsWith('/api/services') ||
        req.get('x-saplings-project') ||
        req.get('x-saplings-tenant')
      ) {
        const project = req.get('x-saplings-project');
        const tenant = req.get('x-saplings-tenant');
        if (
          (project && project !== starterScope.projectId) ||
          (tenant && tenant !== starterScope.tenantId)
        ) {
          res.status(403).json({ error: 'Target scope does not match the application.' });
          return;
        }
      }
      res.set('Cache-Control', 'no-store');
      next();
    },
  );
  router.post('/api/starter/session', async (req, res) => {
    const input = body(req);
    if (input.logout === true) auth.signOut(res);
    else await auth.signIn(res, input.token);
    res.json({ signedIn: input.logout !== true });
  });
  router.get('/api/starter/session', async (req, res) => {
    res.json({
      signedIn: Boolean(await auth.identity(req, false)),
      consent: Boolean(auth.visitor(req)),
    });
  });
  router.use(configRoutes(services, auth, starterScope, publicTenantId));
  router.use(minerRoutes(services, auth, starterScope));
  const errors: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (
      error instanceof RequestError ||
      error instanceof MinerError ||
      error instanceof ConfigError
    ) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Starter service request failed');
    res.status(500).json({ error: 'Could not complete the service request.' });
  };
  router.use(errors);
  return { router, credentials: login.credentials };
}
