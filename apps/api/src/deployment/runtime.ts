import { createPrivateKey, createPublicKey } from 'node:crypto';
import { DrizzleStore } from '@saplings/adapter-drizzle';
import { createSapling, defineSaplingConfig } from '@saplings/sdk';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { project, starterConfig, tenant } from '../sapling.config.js';
import { durableLogin, operatorClient, operatorRedirect, starterRoles } from './login.js';
import { registerStarterReports } from './reports.js';
import { passwordHasher } from './passwords.js';
import type { DurableSettings } from './settings.js';

export async function openDurableRuntime(settings: DurableSettings) {
  const base = starterConfig(3000).platforms.kingsman.config;
  const config = {
    ...base,
    metadata: { ...base.metadata, environment: 'production' as const },
    spec: {
      ...base.spec,
      frontend: { issuer: new URL('/realms/' + base.metadata.name, settings.origin).href },
      registration: { enabled: false },
      roles: { realm: starterRoles.map((name) => ({ name })) },
      security: {
        ...base.spec.security,
        bruteForce: { enabled: true, failureFactor: 5, waitIncrement: '30s', maxWait: '15m' },
      },
      clients: [
        {
          clientId: operatorClient,
          accessType: 'public' as const,
          protocol: 'openid-connect' as const,
          pkce: 'S256' as const,
          grants: { authorizationCode: true },
          redirectUris: [operatorRedirect(settings.origin)],
        },
      ],
    },
  };
  const privateKey = createPrivateKey(settings.signingKey);
  const signingKey = { privateKey, publicKey: createPublicKey(privateKey) };
  const pool = new Pool({ connectionString: settings.databaseUrl, connectionTimeoutMillis: 2500 });
  pool.on('error', () => console.error('Starter PostgreSQL connection dropped.'));
  const store = new DrizzleStore(drizzle(pool));
  try {
    await store.health();
    const workerActor = { tenantId: tenant.id, actorId: 'starter-worker' };
    let login: ReturnType<typeof durableLogin>;
    const sdk = createSapling(
      defineSaplingConfig({
        app: { ...project, environment: 'production' },
        tenancy: { enabled: true, enforceContext: true },
        providers: { store, authentication: { verifyAccessToken: (token) => login.bearer(token) } },
        storage: { enabled: false },
        payments: { enabled: false },
        notifications: { enabled: false },
        workflows: { enabled: true },
        audit: { enabled: true },
        services: { worker: { maxPerTenant: 10 } },
        platforms: { kingsman: { config, dependencies: { passwordHasher, signingKey } } },
      }),
    );
    const identity = sdk.kingsman!;
    login = durableLogin(identity, settings.origin);
    registerStarterReports(sdk, store);
    return {
      sdk,
      store,
      identity,
      login,
      workerActor,
      async close() {
        await sdk.lifecycle.close();
        await pool.end();
      },
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

export type DurableRuntime = Awaited<ReturnType<typeof openDurableRuntime>>;
