import { createPrivateKey, createPublicKey } from 'node:crypto';
import { DrizzleStore } from '@saplings/adapter-drizzle';
import { createSapling, defineSaplingConfig } from '@saplings/sdk';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { project, tenant } from '../config/sapling.js';
import { durableRealm } from '../config/kingsman.js';
import { durableLogin } from './login.js';
import { registerStarterReports } from './reports.js';
import { passwordHasher } from './passwords.js';
import { objectAllowed, openStarterProviders } from './providers/runtime.js';
import type { StarterTelemetry } from './telemetry.js';
import type { DurableSettings } from './settings.js';

export async function openDurableRuntime(settings: DurableSettings, telemetry?: StarterTelemetry) {
  const realm = await durableRealm(settings.origin);
  const privateKey = createPrivateKey(settings.signingKey);
  const signingKey = { privateKey, publicKey: createPublicKey(privateKey) };
  const pool = new Pool({ connectionString: settings.databaseUrl, connectionTimeoutMillis: 2500 });
  pool.on('error', () => console.error('Starter PostgreSQL connection dropped.'));
  const store = new DrizzleStore(drizzle(pool));
  let providers: Awaited<ReturnType<typeof openStarterProviders>> | undefined;
  try {
    await store.health();
    const external = await openStarterProviders(settings, store);
    providers = external;
    const workerActor = { tenantId: tenant.id, actorId: 'starter-worker' };
    let login: ReturnType<typeof durableLogin>;
    const sdk = createSapling(
      defineSaplingConfig({
        app: { ...project, environment: 'production' },
        tenancy: { enabled: true, enforceContext: true },
        providers: {
          store,
          authentication: { verifyAccessToken: (token) => login.bearer(token) },
          storage: external.storage,
          notifications: external.notifications,
          payments: external.cashfree,
          capabilities: external.presign ? { 'SAAS-085': external.presign } : undefined,
          telemetry: telemetry && {
            log: (event) => telemetry.log({ level: event.level, event: event.event }),
          },
        },
        storage: {
          enabled: Boolean(external.storage),
          provider: 'custom',
          maxUploadBytes: 32768,
          authorizeObject: (ctx, _action, key) => objectAllowed(ctx.actorId, key),
        },
        payments: { enabled: Boolean(external.cashfree), provider: 'cashfree' },
        notifications: { enabled: Boolean(external.notifications), provider: 'custom' },
        security: { defender: { policy: { rateState: external.rateState, failureMode: 'block' } } },
        workflows: { enabled: true },
        audit: { enabled: true },
        services: {
          worker: { maxPerTenant: 10 },
          operations: { readiness: external.readiness },
          encryptionKey: external.encryptionKey,
        },
        platforms: {
          kingsman: { config: realm.config, dependencies: { passwordHasher, signingKey } },
        },
      }),
    );
    const identity = sdk.kingsman!;
    login = durableLogin(identity, realm.clientId, realm.redirectUri);
    registerStarterReports(sdk, store, settings.environment, telemetry);
    return {
      sdk,
      store,
      identity,
      login,
      workerActor,
      providers: external,
      async close() {
        await sdk.lifecycle.close();
        await Promise.allSettled([external.close(), pool.end()]);
      },
    };
  } catch (error) {
    await Promise.allSettled([providers?.close(), pool.end()]);
    throw error;
  }
}

export type DurableRuntime = Awaited<ReturnType<typeof openDurableRuntime>>;
