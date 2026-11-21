import { resolve } from 'node:path';
import express from 'express';

import { starterDiscovery } from './discovery/starter.js';
import { authorizeConsole, localRequestsOnly } from './middleware/access.js';
import { apiNotFound, handleError } from './middleware/errors.js';
import { projectRoutes } from './routes/projects.js';
import { serviceRoutes, type ServiceTarget } from './routes/services.js';
import { setupRoutes } from './routes/setup.js';
import { tenantRoutes } from './routes/tenants.js';
import type { ConsoleStore } from './store.js';

export function createConsoleApp({
  store,
  token,
  webRoot,
  starterPort,
  serviceTargets,
}: {
  store: ConsoleStore;
  token: string;
  webRoot?: string;
  starterPort?: number;
  serviceTargets?: ServiceTarget[];
}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false);
  app.use(localRequestsOnly);

  const api = express.Router();
  api.use(authorizeConsole(token));
  api.use(express.json({ limit: '8mb', inflate: false }));
  const discover = starterPort === undefined ? undefined : starterDiscovery(store, starterPort);
  api.use(
    projectRoutes(store, discover),
    tenantRoutes(store),
    setupRoutes(store),
    serviceRoutes(serviceTargets),
  );
  api.use(apiNotFound);
  app.use('/api', api);

  if (webRoot) {
    app.use(express.static(resolve(webRoot), { dotfiles: 'deny' }));
  }
  app.use(handleError);
  return app;
}
