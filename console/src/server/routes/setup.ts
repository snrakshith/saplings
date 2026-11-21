import { Router } from 'express';
import { previewSetupDraft, updateSetupDraft } from '../setup/drafts.js';
import type { ConsoleStore } from '../store.js';

const setupPath = '/projects/:projectId/tenants/:tenantId/setup';

export function setupRoutes(store: ConsoleStore) {
  const router = Router();
  router.get(setupPath, (req, res) => {
    res.json(store.setup(req.params.projectId, req.params.tenantId));
  });
  router.put(`${setupPath}/:domain`, (req, res) => {
    const { projectId, tenantId, domain } = req.params;
    res.json(updateSetupDraft(store, projectId, tenantId, domain, req.body));
  });
  router.post(`${setupPath}/:domain/preview`, async (req, res) => {
    const { projectId, tenantId, domain } = req.params;
    res.json(await previewSetupDraft(store, projectId, tenantId, domain, req.body));
  });
  return router;
}
