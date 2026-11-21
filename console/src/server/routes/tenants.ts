import { Router } from 'express';
import type { ConsoleStore } from '../store.js';
import { createTenantDraft, updateTenantDraft } from '../tenants/drafts.js';

export function tenantRoutes(store: ConsoleStore) {
  const router = Router();
  router.post('/projects/:projectId/tenants', (req, res) => {
    res.status(201).json(createTenantDraft(store, req.params.projectId, req.body));
  });
  router.get('/projects/:projectId/tenants/:tenantId', (req, res) => {
    res.json(store.tenant(req.params.projectId, req.params.tenantId));
  });
  router.put('/projects/:projectId/tenants/:tenantId', (req, res) => {
    const { projectId, tenantId } = req.params;
    res.json(updateTenantDraft(store, projectId, tenantId, req.body));
  });
  return router;
}
