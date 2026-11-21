import { resolve } from 'node:path';
import express from 'express';

import { authorizeConsole, localRequestsOnly } from './middleware/access.js';
import { apiNotFound, handleError } from './middleware/errors.js';
import { projectRoutes } from './routes/projects.js';
import { setupRoutes } from './routes/setup.js';
import { tenantRoutes } from './routes/tenants.js';
import type { ConsoleStore } from './store.js';

export function createConsoleApp({
  store,
  token,
  webRoot,
}: {
  store: ConsoleStore;
  token: string;
  webRoot?: string;
}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false);
  app.use(localRequestsOnly);

  const api = express.Router();
  api.use(authorizeConsole(token));
  api.use(express.json({ limit: '8mb', inflate: false }));
  api.use(projectRoutes(store), tenantRoutes(store), setupRoutes(store));
  api.use(apiNotFound);
  app.use('/api', api);

  if (webRoot) {
    app.use(express.static(resolve(webRoot), { dotfiles: 'deny' }));
  }
  app.use(handleError);
  return app;
}
