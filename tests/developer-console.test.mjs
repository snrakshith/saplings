import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'vitest';

import { createSapling } from '../packages/sdk/dist/index.js';
import { createConsoleApp } from '../console/src/server/app.ts';
import { ConsoleStore } from '../console/src/server/store.ts';

const token = 'test-operator-token-for-console-only';
let directory;
let store;
let server;
let url;

async function start() {
  store = new ConsoleStore(join(directory, 'console.sqlite'));
  server = createConsoleApp({ store, token }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  url = 'http://127.0.0.1:' + server.address().port;
}

async function stop() {
  if (server?.listening) {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
  store?.close();
  server = store = undefined;
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'saplings-console-test-'));
  await start();
});

afterEach(async () => {
  await stop();
  await rm(directory, { recursive: true, force: true });
});

function request(path, body, method = body === undefined ? 'GET' : 'POST') {
  return fetch(url + '/api' + path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      authorization: 'Bearer ' + token,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
  });
}

async function createProject(id = 'portal') {
  const response = await request('/projects', { id, name: 'Customer portal' });
  assert.equal(response.status, 201);
}

async function newTenant() {
  const response = await request('/projects/portal/tenants', {
    id: 'north',
    name: 'North',
    mode: 'new',
    issuerBase: 'https://auth.example.com',
  });
  assert.equal(response.status, 201);
  return response.json();
}

const tenantPath = '/projects/portal/tenants/north';

test('onboards a new tenant and applies the saved route and realm through the SDK', async () => {
  await createProject();
  const { kingsman, harbor } = await newTenant();
  kingsman.spec.clients.push({
    clientId: 'portal-web',
    accessType: 'public',
    pkce: 'S256',
    grants: { authorizationCode: true },
    redirectUris: ['https://portal.example.com/callback'],
  });
  harbor.spec.upstreams.push({ name: 'api', targets: [{ target: 'api.internal:3000' }] });
  harbor.spec.services.push({
    name: 'portal',
    upstream: 'api',
    routes: [
      {
        name: 'portal-api',
        paths: ['/api'],
        pathMatch: 'prefix',
        methods: ['GET'],
        stripPath: true,
      },
    ],
  });
  const response = await request(tenantPath, { revision: 1, config: { kingsman, harbor } }, 'PUT');
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.revision, 2);

  const sdk = createSapling({
    app: { id: 'portal', environment: 'test' },
    platforms: {
      kingsman: { config: saved.kingsman },
      harbor: {
        config: saved.harbor,
        dependencies: {
          allowedUpstreamHosts: ['api.internal:3000'],
          fetch: async (url) => Response.json({ forwarded: String(url) }),
        },
      },
    },
  });
  assert.equal(sdk.kingsman.discovery().issuer, 'https://auth.example.com/realms/portal-north');
  const gatewayPort = await sdk.harbor.listen();
  try {
    const result = await fetch(`http://127.0.0.1:${gatewayPort}/api/customers`);
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { forwarded: 'http://api.internal:3000/customers' });
  } finally {
    await sdk.harbor.close();
  }

  await stop();
  await start();
  assert.deepEqual(await (await request(tenantPath)).json(), saved);
  assert.deepEqual(await (await request('/projects')).json(), [
    { id: 'portal', name: 'Customer portal', tenants: [{ id: 'north', name: 'North' }] },
  ]);
});

test('imports native documents and an exported pair without dropping advanced settings', async () => {
  await createProject();
  await createProject('another');
  const kingsman = JSON.parse(await readFile('examples/platform/RealmConfig-full.json', 'utf8'));
  const harbor = await readFile('examples/platform/GatewayConfig.yaml', 'utf8');
  const response = await request('/projects/portal/tenants', {
    id: 'north',
    name: 'North',
    mode: 'import',
    config: { kingsman, harbor },
  });
  assert.equal(response.status, 201);
  const draft = await response.json();
  assert.deepEqual(draft.kingsman, kingsman);
  assert.equal(draft.harbor.spec.services[0].routes[0].plugins[0].name, 'acl');
  assert.equal(
    draft.harbor.spec.consumers[0].credentials.keyAuth[0].key,
    '${vault://env/ACME_KEY}',
  );
  assert.equal((await request('/projects/another/tenants/north')).status, 404);

  const copy = await request('/projects/another/tenants', {
    id: 'north',
    name: 'North',
    mode: 'import',
    config: { kingsman, harbor: draft.harbor },
  });
  assert.equal(copy.status, 201);
  assert.deepEqual(await copy.json(), draft);
});

test('rejects unauthenticated requests, invalid configuration, and stale edits', async () => {
  const anonymous = await fetch(url + '/api/projects');
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.headers.get('cache-control'), 'no-store');
  const external = get(url + '/api/projects', { headers: { host: 'external.example' } });
  const [blocked] = await once(external, 'response');
  blocked.resume();
  assert.equal(blocked.statusCode, 403);
  await createProject();
  const { kingsman, harbor } = await newTenant();
  const invalid = structuredClone(kingsman);
  invalid.spec.frontend.issuer = 'http://auth.example.com/realms/portal-north';
  const rejected = await request(
    tenantPath,
    { revision: 1, config: { kingsman: invalid, harbor } },
    'PUT',
  );
  assert.equal(rejected.status, 400);
  assert.match((await rejected.json()).error, /Kingsman/);
  assert.equal((await (await request(tenantPath)).json()).revision, 1);
  const brokenGateway = structuredClone(harbor);
  brokenGateway.spec.upstreams.push({
    name: 'wrong-target',
    targets: [{ target: 'https://example.com' }],
  });
  const rejectedRoute = await request(
    tenantPath,
    { revision: 1, config: { kingsman, harbor: brokenGateway } },
    'PUT',
  );
  assert.equal(rejectedRoute.status, 400);
  assert.match((await rejectedRoute.json()).error, /Harbor/);

  const edits = await Promise.all([
    request(tenantPath, { revision: 1, config: { kingsman, harbor } }, 'PUT'),
    request(tenantPath, { revision: 1, config: { kingsman, harbor } }, 'PUT'),
  ]);
  assert.deepEqual(edits.map((response) => response.status).sort(), [200, 409]);
  const config = { kingsman, harbor: 'duplicate: 1\nduplicate: 2' };
  const badDocument = await request('/projects/portal/tenants', {
    id: 'invalid',
    name: 'Invalid',
    mode: 'import',
    config,
  });
  assert.equal(badDocument.status, 400);
  assert.equal((await request('/projects/portal/tenants/invalid')).status, 404);
});
