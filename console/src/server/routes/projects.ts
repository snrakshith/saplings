import { Router } from 'express';
import { object, record } from '../input.js';
import type { ConsoleStore } from '../store.js';

export function projectRoutes(store: ConsoleStore) {
  const router = Router();
  router.get('/projects', (_req, res) => {
    res.json(store.projects());
  });
  router.post('/projects', (req, res) => {
    res.status(201).json(store.addProject(record(object(req.body))));
  });
  return router;
}
