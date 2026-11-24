import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { durableRealm, realmConfig } from '../dist/config/kingsman.js';
import { catalogGatewayConfig, gatewayConfig } from '../dist/config/harbor.js';

const directory = await mkdtemp(join(tmpdir(), 'starter-platforms-'));
try {
  const origin = new URL('https://workspace.example.test');
  process.env.SAPLINGS_REALM_NAME = 'custom-workspace';
  process.env.SAPLINGS_OIDC_CLIENT_ID = 'custom-client';
  const realm = realmConfig(origin);
  assert.equal(realm.spec.frontend.issuer, origin.origin + '/realms/custom-workspace');
  assert.equal(realm.spec.clients[0].clientId, 'custom-client');
  realm.spec.clients.unshift({ ...realm.spec.clients[0], clientId: 'another-client' });
  const realmPath = join(directory, 'realm.json');
  process.env.SAPLINGS_KINGSMAN_CONFIG_FILE = realmPath;
  await writeFile(realmPath, JSON.stringify(realm));
  const loaded = await durableRealm(origin);
  assert.equal(loaded.clientId, 'custom-client');
  assert.equal(loaded.redirectUri, origin.origin + '/login');
  await assert.rejects(durableRealm(new URL('https://other.example.test')), /issuer/);
  realm.spec.clients[1].enabled = false;
  await writeFile(realmPath, JSON.stringify(realm));
  await assert.rejects(durableRealm(origin), /operator client/);

  const gateway = gatewayConfig(8999, 'durable').config;
  gateway.metadata.name = 'custom-gateway';
  const gatewayPath = join(directory, 'gateway.json');
  process.env.SAPLINGS_HARBOR_CONFIG_FILE = gatewayPath;
  await writeFile(gatewayPath, JSON.stringify(gateway));
  assert.deepEqual((await catalogGatewayConfig(8999)).config, gateway);
  await assert.rejects(catalogGatewayConfig(9000), /loopback/);
  gateway.metadata.environment = 'development';
  await writeFile(gatewayPath, JSON.stringify(gateway));
  await assert.rejects(catalogGatewayConfig(8999), /production/);
  console.log('Verified custom Harbor and Kingsman policy files and deployment settings.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
