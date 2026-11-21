import { Router } from 'express';
import { object, record } from '../input.js';
import type { ConsoleStore } from '../store.js';

export function projectRoutes(store: ConsoleStore, discoverSample?: () => Promise<void>) {
  const router = Router();
  router.get('/projects', async (_req, res) => {
    await discoverSample?.();
    res.json(store.projects());
  });
  router.post('/projects', (req, res) => {
    res.status(201).json(store.addProject(record(object(req.body))));
  });
  return router;
}
