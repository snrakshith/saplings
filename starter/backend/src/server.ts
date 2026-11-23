import express from 'express';
import { createIdentityHttpHandler } from '@saplings/kingsman';
import { InMemoryStore } from '@saplings/sdk';

import { workspaceProfileRoutes } from './features/workspace-profile.js';
import { requestPolicy } from './http/request-policy.js';
import { openCatalogGateway, internalCatalogPath, sdkCatalogPath } from './platform/harbor.js';
import { jobRoutes } from './deployment/job-routes.js';
import { cashfreeRoutes, providerRoutes } from './deployment/providers/routes.js';
import { startTelemetry, type StarterTelemetry } from './deployment/telemetry.js';
import { openDurableRuntime } from './deployment/runtime.js';
import { durableSettings, starterProfile } from './deployment/settings.js';
import { localServices, serviceErrors, serviceRoutes } from './services/routes.js';
import { starterScope } from './services/runtime.js';
import { qualityRoutes } from './starter/quality-routes.js';
import { starterRoutes } from './starter/routes.js';
import { startStarterSdk } from './starter/runtime.js';

async function main(telemetry: StarterTelemetry) {
  const profile = starterProfile();
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT.');
  const settings = profile === 'durable' ? durableSettings() : undefined;
  const runtime = settings && (await openDurableRuntime(settings, telemetry));
  const app = express();
  const { diagnostics } = telemetry;
  let totalRequests = 0;
  let closing = false;
  app.disable('x-powered-by');
  app.use(...requestPolicy(settings?.origin), telemetry.http);
  app.use((req, res, next) => {
    totalRequests++;
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
    if (profile === 'local') {
      res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? 'http://localhost:5173');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
  });

  let starter: ReturnType<typeof startStarterSdk>;
  let catalogGateway: ReturnType<typeof openCatalogGateway> | undefined;
  let credentials:
    { store: InMemoryStore; values: ReturnType<typeof localServices>['credentials'] } | undefined;
  if (runtime && settings) {
    const routes = serviceRoutes({
      store: runtime.store,
      login: runtime.login,
      secret: settings.visitorSecret,
      scope: { ...starterScope, environment: settings.environment },
      origin: settings.origin,
      reviewPolicy: 'distinct-reviewer',
    });
    const issuerPath = new URL(runtime.identity.issuer).pathname;
    const oidc = createIdentityHttpHandler(runtime.identity, {
      authenticateBrowser: async (req) => routes.auth.browserSession(req),
    });
    app.use((req, res, next) => {
      if (
        (req.path === issuerPath || req.path.startsWith(issuerPath + '/')) &&
        req.get('host') === settings.origin.host
      )
        return oidc(req, res);
      next();
    });
    app.use(cashfreeRoutes(runtime, settings.origin));
    app.use(express.json({ limit: '1mb', inflate: false }));
    app.use(
      routes.router,
      jobRoutes(runtime, routes.auth, telemetry),
      providerRoutes(runtime, routes.auth),
      workspaceProfileRoutes(runtime.store, routes.auth),
    );
    app.get(internalCatalogPath, (req, res) => {
      if (req.socket.remoteAddress !== '127.0.0.1') return res.sendStatus(404);
      res.json(runtime.sdk.featureManifest());
    });
    app.get(sdkCatalogPath, async (_req, res) => {
      const gateway = await catalogGateway;
      if (!gateway) return res.sendStatus(503);
      const catalog = await gateway.read();
      res.set('X-Saplings-Gateway', 'harbor').json(catalog);
    });
  } else {
    const store = new InMemoryStore();
    const services = localServices(store);
    credentials = { store, values: services.credentials };
    app.use(express.json({ limit: '1mb' }));
    app.use(
      services.router,
      starterRoutes(() => starter),
      qualityRoutes(() => starter),
      workspaceProfileRoutes(store, services.auth),
    );
  }
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.get('/ready', async (_req, res) => {
    if (closing) return res.status(503).json({ status: 'not-ready' });
    if (runtime && !(await catalogGateway?.catch(() => undefined)))
      return res.status(503).json({ status: 'not-ready' });
    const sdk = runtime?.sdk ?? (await starter).sdk;
    const result = await sdk.readiness();
    res.status(result.status === 'ready' ? 200 : 503).json(result);
  });
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
  app.use((_req, res) => res.status(404).json({ error: 'not found' }));
  app.use(serviceErrors);

  const server = app.listen(port, profile === 'local' ? '127.0.0.1' : '0.0.0.0', () => {
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Starter API requires a TCP port.');
    const local = credentials;
    if (!local) {
      catalogGateway = openCatalogGateway(address.port, telemetry);
      void catalogGateway.then(
        () => console.log('Starter API ready on port ' + address.port),
        () => {
          console.error('Could not start the Harbor catalog route.');
          void shutdown(1);
        },
      );
      return;
    }
    starter = startStarterSdk(address.port, local.store);
    void starter.then(
      () => {
        console.log('Starter API on http://127.0.0.1:' + address.port);
        for (const credential of local.values)
          console.log('Starter ' + credential.label + ' token ' + credential.token);
      },
      () => {
        console.error('Could not start the local Starter SDK.');
        void shutdown(1);
      },
    );
  });

  async function shutdown(code: number) {
    if (closing) return;
    closing = true;
    const timeout = setTimeout(() => process.exit(1), 12000).unref();
    try {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (runtime) {
        const gateway = await catalogGateway?.catch(() => undefined);
        await gateway?.close();
        await runtime.close();
      } else if (code === 0 && starter) await (await starter).sdk.lifecycle.close();
    } catch {
      code = 1;
      console.error('Could not fully close the Starter runtime.');
    } finally {
      await telemetry.close();
      clearTimeout(timeout);
      process.exitCode = code;
    }
  }
  server.once('error', (error) => {
    console.error('Starter server could not listen', 'code' in error ? error.code : '');
    void shutdown(1);
  });
  process.once('SIGINT', () => void shutdown(0));
  process.once('SIGTERM', () => void shutdown(0));
}

let telemetry: StarterTelemetry | undefined;
try {
  telemetry = startTelemetry('api');
  await main(telemetry);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not start the Starter API.');
  process.exitCode = 1;
  await telemetry?.close();
}
