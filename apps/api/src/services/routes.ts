import { randomBytes } from 'node:crypto';
import { ConfigError, type ReviewPolicy, type Scope } from '@saplings/remote-config';
import { MinerError } from '@saplings/miner';
import { IdentityError } from '@saplings/kingsman';
import { SaplingError } from '@saplings/sdk';
import { Router, type ErrorRequestHandler } from 'express';

import {
  body,
  createLocalLogin,
  createServiceAuth,
  RequestError,
  type ServiceLogin,
} from './auth.js';
import { configRoutes } from './config-routes.js';
import { minerRoutes } from './miner-routes.js';
import { createServices, publicTenantId, starterScope } from './runtime.js';

const localHost = /^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/;
const loopback = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1']);
type ServiceStore = Parameters<typeof createServices>[0];

const servicePaths = [
  '/api/config',
  '/api/public/config',
  '/api/services',
  '/api/miner',
  '/api/starter/session',
  '/api/starter/operator-token',
  '/api/starter/jobs',
  '/api/starter/providers',
];

export function serviceRoutes(options: {
  store: ServiceStore;
  login: ServiceLogin;
  secret: string;
  scope: Scope;
  origin?: URL;
  reviewPolicy?: ReviewPolicy;
}): { router: Router; auth: ReturnType<typeof createServiceAuth> } {
  const { store, login, secret, scope, origin, reviewPolicy } = options;
  const router = Router();
  const auth = createServiceAuth(login, secret, Boolean(origin));
  const services = createServices(store, { reviewPolicy });
  router.use(servicePaths, (req, res, next) => {
    const host = req.get('host') ?? '';
    if (
      origin
        ? host !== origin.host
        : !loopback.has(req.socket.remoteAddress ?? '') || !localHost.test(host)
    ) {
      res.sendStatus(404);
      return;
    }
    const project = req.get('x-saplings-project');
    const tenant = req.get('x-saplings-tenant');
    if ((project && project !== scope.projectId) || (tenant && tenant !== scope.tenantId)) {
      throw new RequestError('Target scope does not match the application.', 403);
    }
    if (origin && req.get('authorization') && !req.originalUrl.startsWith('/api/services/'))
      throw new RequestError('Operator tokens are only accepted by the Console service API.', 401);
    if (origin && req.method === 'POST') {
      const consoleCall =
        req.originalUrl.startsWith('/api/services/') &&
        req.get('authorization') &&
        !req.get('origin');
      if (!consoleCall && req.get('origin') !== origin.origin)
        throw new RequestError('Cross-origin write denied.', 403);
    }
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.post('/api/starter/session', async (req, res) => {
    const input = body(req);
    if (input.logout === true) await auth.signOut(req, res);
    else await auth.signIn(req, res, input);
    res.json({ signedIn: input.logout !== true });
  });
  router.get('/api/starter/session', async (req, res) => {
    const who = await auth.identity(req, false);
    res.json({
      profile: origin ? 'durable' : 'local',
      signedIn: Boolean(who),
      canOperate: Boolean(origin && who?.permissions.includes('config:read')),
      consent: Boolean(auth.visitor(req)),
    });
  });
  if (origin)
    router.post('/api/starter/operator-token', async (req, res) => {
      body(req);
      res.json(await auth.operatorToken(req));
    });
  router.use(configRoutes(services, auth, scope, publicTenantId));
  router.use(minerRoutes(services, auth, scope));
  return { router, auth };
}

export const serviceErrors: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (
    error instanceof RequestError ||
    error instanceof MinerError ||
    error instanceof ConfigError ||
    error instanceof IdentityError
  ) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof SaplingError && error.statusCode < 500) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    res.status(400).json({ error: 'Invalid JSON request.' });
    return;
  }
  if (error instanceof Error && 'status' in error && error.status === 413) {
    res.status(413).json({ error: 'Request is too large.' });
    return;
  }
  console.error('Starter service request failed');
  res.status(500).json({ error: 'Could not complete the service request.' });
};

export function localServices(store: ServiceStore): {
  router: Router;
  credentials: ReturnType<typeof createLocalLogin>['credentials'];
} {
  const { login, credentials } = createLocalLogin(starterScope.tenantId);
  const policy = process.env.SAPLINGS_CONFIG_REVIEW;
  if (policy && policy !== 'operator' && policy !== 'distinct-reviewer')
    throw new Error('Invalid SAPLINGS_CONFIG_REVIEW');
  const routes = serviceRoutes({
    store,
    login,
    secret: randomBytes(32).toString('hex'),
    scope: starterScope,
    reviewPolicy: policy as ReviewPolicy | undefined,
  });
  return { ...routes, credentials };
}
