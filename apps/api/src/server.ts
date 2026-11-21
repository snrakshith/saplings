import express from 'express';
import { randomUUID } from 'node:crypto';
import { createNodeDiagnostics } from '@saplings/quality-node-diagnostics';
import { startStarterSdk } from './starter/runtime.js';
import { starterRoutes } from './starter/routes.js';
import { setup } from './sapling.config.js';
const app = express(),
  orders = new Map<string, { id: string; quantity: number }>(),
  diagnostics = createNodeDiagnostics();
const PORT = Number(process.env.PORT ?? 3000);
let starter: ReturnType<typeof startStarterSdk>;
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? 'http://localhost:5173');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
let totalRequests = 0;
app.use((_req, _res, next) => {
  totalRequests++;
  next();
});
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/ready', (_req, res) => res.json({ ready: true }));
app.get('/metrics', (_req, res) => {
  const stats = diagnostics.snapshot();
  res
    .type('text/plain; version=0.0.4')
    .send(
      [
        '# HELP sapling_http_requests_total Number of requests served',
        '# TYPE sapling_http_requests_total counter',
        `sapling_http_requests_total ${totalRequests}`,
        '# TYPE sapling_node_heap_used_bytes gauge',
        `sapling_node_heap_used_bytes ${stats.heapUsedMb * 1048576}`,
        '# TYPE sapling_node_event_loop_lag_p95_ms gauge',
        `sapling_node_event_loop_lag_p95_ms ${stats.eventLoopLagP95Ms}`,
      ].join('\n') + '\n',
    );
});
app.use(starterRoutes(() => starter));
app.get('/api/items', async (_req, res) => {
  const { sdk, context } = await starter;
  const items = [{ id: 'a1', name: 'Quality toolkit' }];
  const { enabled } = await sdk.flags.evaluate(context, setup.flags.flag, setup.flags.subject);
  if (enabled) items.push({ id: 'b2', name: 'Sapling cloud' });
  res.json({ items });
});
app.get('/api/slow', async (_req, res) => {
  await new Promise((r) => setTimeout(r, 200));
  res.json({ ok: true });
});
app.post('/api/orders', (req, res) => {
  const key = req.header('Idempotency-Key') ?? randomUUID();
  if (!orders.has(key))
    orders.set(key, { id: randomUUID(), quantity: Number(req.body?.quantity ?? 1) });
  res.status(201).json(orders.get(key));
});
app.post('/api/telemetry', (req, res) => {
  if (!req.body?.type) return res.sendStatus(400);
  res.sendStatus(202);
});
app.use((_req, res) => res.status(404).json({ error: 'not found' }));
const server = app.listen(PORT, () => {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Sample API requires a TCP port');
  starter = startStarterSdk(address.port);
  starter.then(
    () => console.log(`Starter API on http://127.0.0.1:${address.port}`),
    (error: unknown) => {
      console.error('Could not start the starter SDK', error);
      diagnostics.close();
      server.close();
      process.exitCode = 1;
    },
  );
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      diagnostics.close();
      process.exit(0);
    }),
  );
