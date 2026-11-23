import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { setup } from '../sapling.config.js';
import type { StarterRuntime } from './runtime.js';

export function qualityRoutes(starter: () => Promise<StarterRuntime>): Router {
  const router = Router();
  const orders = new Map<string, { id: string; quantity: number }>();
  router.get('/api/items', async (_req, res) => {
    const { sdk, context } = await starter();
    const items = [{ id: 'a1', name: 'Quality toolkit' }];
    const { enabled } = await sdk.flags.evaluate(context, setup.flags.flag, setup.flags.subject);
    if (enabled) items.push({ id: 'b2', name: 'Sapling cloud' });
    res.json({ items });
  });
  router.get('/api/slow', async (_req, res) => {
    await new Promise((r) => setTimeout(r, 200));
    res.json({ ok: true });
  });
  router.post('/api/orders', (req, res) => {
    const key = req.header('Idempotency-Key') ?? randomUUID();
    if (!orders.has(key))
      orders.set(key, { id: randomUUID(), quantity: Number(req.body?.quantity ?? 1) });
    res.status(201).json(orders.get(key));
  });
  router.post('/api/telemetry', (req, res) => {
    if (!req.body?.type) return res.sendStatus(400);
    res.sendStatus(202);
  });
  return router;
}
