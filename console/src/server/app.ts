import { createHash, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import express, { type ErrorRequestHandler } from 'express';

import { importPair, InputError, object, record, starterPair, validatePair } from './config.js';
import { domainId } from '../onboarding.js';
import { previewSetup, setupValues } from './onboarding.js';
import type { ConsoleStore } from './store.js';

const hash = (value: string) => createHash('sha256').update(value).digest();

export function createConsoleApp({
  store,
  token,
  webRoot,
}: {
  store: ConsoleStore;
  token: string;
  webRoot?: string;
}) {
  if (token.length < 32) throw new Error('SAPLINGS_CONSOLE_TOKEN must be at least 32 characters.');
  const expected = hash('Bearer ' + token);
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false);
  app.use((req, res, next) => {
    if (!/^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(req.headers.host ?? '')) {
      res.status(403).json({ error: 'Use the local console URL.' });
      return;
    }
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy':
        "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; style-src 'self' 'unsafe-inline'; form-action 'self'",
    });
    next();
  });

  const api = express.Router();
  app.use('/api', api);
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!timingSafeEqual(expected, hash(req.get('authorization') ?? ''))) {
      res.status(401).json({ error: 'Enter the access token from the console server.' });
      return;
    }
    if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) {
      res.status(415).json({ error: 'Send JSON with Content-Type application/json.' });
      return;
    }
    next();
  });
  api.use(express.json({ limit: '8mb', inflate: false }));

  api.get('/projects', (_req, res) => {
    res.json(store.projects());
  });
  api.post('/projects', (req, res) => {
    res.status(201).json(store.addProject(record(object(req.body))));
  });
  api.post('/projects/:projectId/tenants', (req, res) => {
    const project = store.project(req.params.projectId);
    const body = object(req.body);
    const tenant = record(body);
    if (body.mode !== 'new' && body.mode !== 'import')
      throw new InputError('Choose an onboarding mode.');
    const pair =
      body.mode === 'import'
        ? importPair(body.config)
        : starterPair(project, tenant, body.issuerBase);
    res.status(201).json(store.addTenant(project.id, tenant, pair));
  });
  api.get('/projects/:projectId/tenants/:tenantId', (req, res) => {
    res.json(store.tenant(req.params.projectId, req.params.tenantId));
  });
  api.put('/projects/:projectId/tenants/:tenantId', (req, res) => {
    const body = object(req.body);
    if (
      typeof body.revision !== 'number' ||
      !Number.isSafeInteger(body.revision) ||
      body.revision < 1
    )
      throw new InputError('Provide the current draft revision.');
    res.json(
      store.saveTenant(
        req.params.projectId,
        req.params.tenantId,
        body.revision,
        validatePair(body.config),
      ),
    );
  });
  const setupPath = '/projects/:projectId/tenants/:tenantId/setup';
  api.get(setupPath, (req, res) => {
    res.json(store.setup(req.params.projectId, req.params.tenantId));
  });
  api.put(`${setupPath}/:domain`, (req, res) => {
    const { projectId, tenantId, domain } = req.params;
    if (!domainId(domain)) throw new InputError('Setup area not found.', 404);
    const { revision, values } = object(req.body);
    if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0)
      throw new InputError('Provide the current setup revision.');
    res.json(store.saveSetup(projectId, tenantId, domain, revision, setupValues(domain, values)));
  });
  api.post(`${setupPath}/:domain/preview`, async (req, res) => {
    const { projectId, tenantId, domain } = req.params;
    if (!domainId(domain)) throw new InputError('Setup area not found.', 404);
    store.tenant(projectId, tenantId);
    res.json(await previewSetup(domain, tenantId, setupValues(domain, req.body)));
  });
  api.use((_req, res) => {
    res.status(404).json({ error: 'Console API endpoint not found.' });
  });

  if (webRoot) {
    app.use(express.static(resolve(webRoot), { dotfiles: 'deny' }));
  }
  const handleError: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof InputError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (
      error?.type === 'entity.parse.failed' ||
      error?.type === 'entity.too.large' ||
      error?.status === 415
    ) {
      res
        .status(error.status)
        .json({ error: 'Send a valid JSON document under 8 MB without compression.' });
      return;
    }
    console.error('Console request failed', error instanceof Error ? error.name : 'Unknown error');
    res.status(500).json({ error: 'The console could not complete this request.' });
  };
  app.use(handleError);
  return app;
}
