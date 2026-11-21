import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { createServer, get } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'vitest';

import { capabilities } from '../apps/api/src/starter/checks.ts';
import { domains } from '../console/src/onboarding.ts';
import { startStarterSdk } from '../apps/api/src/starter/runtime.ts';
import { createSapling } from '../packages/sdk/dist/index.js';
import { createConsoleApp } from '../console/src/server/app.ts';
import { ConsoleStore } from '../console/src/server/store.ts';

const token = 'test-operator-token-for-console-only';
let directory;
let store;
let server;
let url;

async function start(starterPort) {
  store = new ConsoleStore(join(directory, 'console.sqlite'));
  server = createConsoleApp({ store, token, starterPort }).listen(0, '127.0.0.1');
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

test('saves each SDK onboarding draft by tenant and verifies flags and analytics in isolation', async () => {
  await createProject();
  const tenant = await newTenant();
  const setup = tenantPath + '/setup';
  assert.deepEqual(await (await request(setup)).json(), {});
  const drafts = {
    flags: { flag: 'new-checkout', enabled: true, rollout: 0, subject: 'staging-user' },
    analytics: { event: 'onboarding.completed', subject: 'staging-user' },
    notifications: {
      channel: 'email',
      endpoint: 'https://app.example.com/hooks/notifications',
      secretRef: 'WEBHOOK_SIGNING_SECRET',
    },
    payments: {
      provider: 'stripe',
      endpoint: 'https://app.example.com/hooks/payments',
      secretRef: 'STRIPE_SECRET',
    },
    billing: {
      plan: 'Starter',
      currency: 'USD',
      price: 1000,
      feature: 'reports',
      metric: 'reports.created',
      quota: 100,
    },
    storage: { provider: 'memory', object: 'onboarding-test.txt' },
    workspace: { workspace: 'Staging', project: 'Customer portal' },
    workflows: { job: 'reports.generate', attempts: 3 },
    audit: { limit: 50 },
    governance: { collection: 'reports', days: 90 },
    operations: { operation: 'deploy.staging', target: 'sandbox', key: 'onboarding-check' },
  };
  for (const [id, values] of Object.entries(drafts)) {
    const save = await request(setup + '/' + id, { revision: 0, values }, 'PUT');
    assert.equal(save.status, 200, id);
    assert.deepEqual(await save.json(), { revision: 1, values });
  }
  assert.deepEqual(await (await request(setup + '/flags/preview', drafts.flags)).json(), {
    enabled: false,
  });
  assert.deepEqual(
    await (await request(setup + '/flags/preview', { ...drafts.flags, rollout: 100 })).json(),
    { enabled: true },
  );
  for (let run = 0; run < 2; run++) {
    assert.deepEqual(await (await request(setup + '/analytics/preview', drafts.analytics)).json(), {
      count: 1,
    });
  }
  const stale = await request(setup + '/flags', { revision: 0, values: drafts.flags }, 'PUT');
  assert.equal(stale.status, 409);
  const updatedFlag = { ...drafts.flags, rollout: 100 };
  assert.equal(
    (await request(setup + '/flags', { revision: 1, values: updatedFlag }, 'PUT')).status,
    200,
  );
  const invalid = await request(
    setup + '/payments',
    {
      revision: 1,
      values: { ...drafts.payments, endpoint: 'https://app.example.com/hook?secret=hidden' },
    },
    'PUT',
  );
  assert.equal(invalid.status, 400);
  const extra = await request(
    setup + '/notifications',
    {
      revision: 1,
      values: { ...drafts.notifications, credential: 'value' },
    },
    'PUT',
  );
  assert.equal(extra.status, 400);
  assert.equal((await request(setup + '/payments/preview', drafts.payments)).status, 400);
  assert.equal(
    (await request(setup + '/constructor', { revision: 0, values: {} }, 'PUT')).status,
    404,
  );
  await createProject('another');
  assert.equal((await request('/projects/another/tenants/north/setup')).status, 404);
  assert.deepEqual(await (await request(tenantPath)).json(), tenant);

  await stop();
  await start();
  const stored = await (await request(setup)).json();
  assert.deepEqual(
    stored,
    Object.fromEntries(
      Object.entries({ ...drafts, flags: updatedFlag }).map(([domain, values]) => [
        domain,
        { revision: domain === 'flags' ? 2 : 1, values },
      ]),
    ),
  );
});

test('discovers the starter after startup and syncs config without replacing console edits', async () => {
  const starter = await startStarterSdk(3000);
  let manifest;
  const source = createServer((req, res) => {
    if (req.url !== '/.well-known/saplings-console.json' || !manifest) {
      res.writeHead(404).end();
      return;
    }
    const json = JSON.stringify(manifest);
    res
      .writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(json),
      })
      .end(json);
  }).listen(0, '127.0.0.1');
  await once(source, 'listening');
  const port = source.address().port;
  const { project, tenant } = starter.manifest;
  const draftPath = '/projects/' + project.id + '/tenants/' + tenant.id;
  try {
    await stop();
    await start(port);
    assert.deepEqual(await (await request('/projects')).json(), []);
    manifest = structuredClone(starter.manifest);
    assert.deepEqual(await (await request('/projects')).json(), [
      { ...project, tenants: [tenant] },
    ]);
    assert.deepEqual(await (await request('/projects')).json(), [
      { ...project, tenants: [tenant] },
    ]);
    const original = await (await request(draftPath)).json();
    assert.equal(original.revision, 1);
    assert.equal(original.kingsman.spec.clients[0].clientId, 'starter-web');
    assert.equal(original.harbor.spec.services[0].routes[0].name, 'starter-api');
    const setup = await (await request(draftPath + '/setup')).json();
    assert.deepEqual(Object.keys(setup).sort(), Object.keys(domains).sort());
    assert.deepEqual(
      capabilities.map(({ id }) => id).sort(),
      ['kingsman', 'harbor', ...Object.keys(domains)].sort(),
    );
    assert.equal(setup.flags.values.flag, 'show-cloud-item');

    const flags = { ...setup.flags.values, rollout: 25 };
    const manual = await request(draftPath + '/setup/flags', { revision: 1, values: flags }, 'PUT');
    assert.equal(manual.status, 200);

    manifest.config.harbor.spec.upstreams[0].targets[0].target = '127.0.0.1:3001';
    manifest.setup.flags.rollout = 80;
    manifest.setup.analytics.event = 'demo.updated';
    await request('/projects');
    await request('/projects');
    const synced = await (await request(draftPath)).json();
    assert.equal(synced.revision, 2);
    assert.equal(synced.harbor.spec.upstreams[0].targets[0].target, '127.0.0.1:3001');
    const syncedSetup = await (await request(draftPath + '/setup')).json();
    assert.deepEqual(syncedSetup.flags, { revision: 2, values: flags });
    assert.equal(syncedSetup.analytics.revision, 2);
    assert.equal(syncedSetup.analytics.values.event, 'demo.updated');

    const save = await request(
      draftPath,
      {
        revision: 2,
        config: { kingsman: synced.kingsman, harbor: synced.harbor },
      },
      'PUT',
    );
    assert.equal(save.status, 200);
    manifest.config.harbor.spec.upstreams[0].targets[0].target = '127.0.0.1:3002';
    await stop();
    await start(port);
    await request('/projects');
    const saved = await (await request(draftPath)).json();
    assert.equal(saved.revision, 3);
    assert.equal(saved.harbor.spec.upstreams[0].targets[0].target, '127.0.0.1:3001');
  } finally {
    await new Promise((resolve) => source.close(resolve));
  }
});

test('leaves a manually created project with the starter key under manual control', async () => {
  const { manifest } = await startStarterSdk(3000);
  await createProject(manifest.project.id);
  store.syncStarter(manifest);
  assert.deepEqual(await (await request('/projects')).json(), [
    { id: manifest.project.id, name: 'Customer portal', tenants: [] },
  ]);
});
