import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { chromium } from 'playwright';
import { verifyWorkerRetry } from './durable-worker-retry.mjs';

const origin = process.env.SAPLINGS_TEST_ORIGIN ?? 'https://localhost:8443';
const accounts = JSON.parse(
  await readFile(process.env.SAPLINGS_TEST_ACCOUNTS ?? 'starter/.starter/accounts.json', 'utf8'),
);
const suffix = randomUUID().slice(0, 8);
const workspaceMessage = 'Durable workspace ' + suffix;
const api = (path, headers, data) =>
  fetch(origin + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { ...headers, ...(data !== undefined && { 'content-type': 'application/json' }) },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(6000),
  });

async function status(response, expected) {
  assert.equal(response.status, expected, await response.clone().text());
  return response;
}

async function waitFor(path, expected) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const response = await api(path).catch(() => undefined);
    if (response?.status === expected) return;
    await setTimeout(600);
  }
  throw new Error(path + ' did not return HTTP ' + expected);
}

async function login(browser, role, path = '/login') {
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const account = accounts.find((entry) => entry.role === role);
  assert.ok(account);
  await page.goto(origin + path);
  await page.getByLabel('Username', { exact: true }).fill(account.username);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
  return page;
}

async function operator(browser, role) {
  const page = await login(browser, role);
  await page.getByRole('button', { name: 'Create operator token' }).click();
  const field = page.getByRole('textbox', { name: 'Console operator token' });
  await field.waitFor();
  return { page, headers: { authorization: 'Bearer ' + (await field.inputValue()) } };
}

function actorWrite(page, path, payload, headers = {}) {
  return page.request.post(origin + path, { data: payload, headers: { origin, ...headers } });
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
try {
  await waitFor('/ready', 200);
  for (const removed of ['/api/items', '/api/slow', '/.well-known/saplings-console.json'])
    await status(await api(removed), 404);

  const catalogResponse = await status(await api('/api/starter/catalog'), 200);
  assert.equal(catalogResponse.headers.get('x-saplings-gateway'), 'harbor');
  assert.match(catalogResponse.headers.get('x-request-id'), /^[a-f0-9-]{36}$/);
  assert.ok((await catalogResponse.json()).some((entry) => entry.featureId === 'SAAS-001'));
  await status(await api('/internal/api/starter/catalog'), 404);
  await status(await api('/api/starter/profile'), 401);

  const member = await login(browser, 'member');
  const sessionCookie = (await member.context().cookies()).find(
    (cookie) => cookie.name === '__Host-saplings-starter-session',
  );
  assert.ok(sessionCookie?.httpOnly && sessionCookie.secure && sessionCookie.sameSite === 'Strict');
  assert.equal(await member.getByRole('button', { name: 'Create operator token' }).count(), 0);
  assert.equal((await actorWrite(member, '/api/starter/operator-token', {})).status(), 403);
  const rejectedOrigin = await actorWrite(
    member,
    '/api/miner/consent',
    { enabled: true },
    { origin: 'https://invalid.example' },
  );
  assert.equal(rejectedOrigin.status(), 403);
  assert.equal((await rejectedOrigin.json()).error.code, 'REQUEST_BLOCKED');

  const author = await operator(browser, 'author');
  const reviewer = await operator(browser, 'reviewer');
  await status(
    await api('/api/services/config', { 'x-saplings-tenant': 'other', ...author.headers }),
    403,
  );
  await status(await api('/api/starter/jobs/missing', author.headers), 401);
  assert.equal((await member.request.get(origin + '/api/services/config')).status(), 403);
  await status(await api('/api/config/workspace'), 401);

  for (const [key, message] of [
    ['welcome', 'Durable welcome ' + suffix],
    ['workspace', workspaceMessage],
  ]) {
    const route = '/api/services/config/' + key;
    const old = await (await status(await api(route, author.headers), 200)).json();
    const saved = await (
      await status(
        await api(route, author.headers, {
          action: 'save',
          value: { message },
          revision: old.latest,
        }),
        200,
      )
    ).json();
    const revision = saved.number;
    await status(await api(route, author.headers, { action: 'submit', revision }), 200);
    await status(await api(route, author.headers, { action: 'approve', revision }), 403);
    await status(await api(route, reviewer.headers, { action: 'approve', revision }), 200);
  }
  const published = await status(await api('/api/public/config/welcome'), 200);
  assert.ok(published.headers.has('etag'));
  await status(
    await api('/api/public/config/welcome', { 'if-none-match': published.headers.get('etag') }),
    304,
  );

  await member.goto(origin + '/services');
  await member.getByText(workspaceMessage, { exact: true }).waitFor();
  await member.getByRole('button', { name: 'Allow analytics' }).click();
  await member.getByText('Analytics consent saved.', { exact: true }).waitFor();
  await member.getByRole('button', { name: 'Record browser event' }).click();
  await member.getByText('Browser event recorded.', { exact: true }).waitFor();

  await member.goto(origin + '/dashboard');
  await member.getByLabel('Display name').fill('Starter ' + suffix);
  await member.getByLabel('Observability', { exact: true }).check();
  await member.getByRole('button', { name: 'Save profile' }).click();
  await member.getByText('Workspace profile saved.', { exact: true }).waitFor();
  assert.equal(
    (await actorWrite(member, '/api/starter/profile', { displayName: ' ' })).status(),
    422,
  );
  const profiled = await actorWrite(member, '/api/starter/profile', {
    displayName: ' Starter ' + suffix + ' ',
    interests: ['observability', 'observability'],
  });
  assert.equal(profiled.status(), 200);
  assert.deepEqual(await profiled.json(), {
    displayName: 'Starter ' + suffix,
    interests: ['observability'],
  });

  await member.getByRole('button', { name: 'Queue report' }).click();
  await member.getByRole('status').filter({ hasText: 'Report status completed' }).waitFor();
  const idempotency = { 'idempotency-key': randomUUID() };
  const queued = await actorWrite(member, '/api/starter/jobs', {}, idempotency);
  assert.equal(queued.status(), 202);
  const { id } = await queued.json();
  assert.equal(
    (await (await actorWrite(member, '/api/starter/jobs', {}, idempotency)).json()).id,
    id,
  );
  const jobPath = '/api/starter/jobs/' + id;
  assert.equal((await reviewer.page.request.get(origin + jobPath)).status(), 404);
  let job;
  for (let attempt = 0; attempt < 20; attempt++) {
    job = await (await member.request.get(origin + jobPath)).json();
    if (job.status === 'completed') break;
    await setTimeout(500);
  }
  assert.equal(job.status, 'completed');
  assert.ok(job.completedAt);
  assert.ok(job.visits >= 1);
  if (process.env.SAPLINGS_TEST_RUNTIME_DATABASE_URL) {
    await verifyWorkerRetry(process.env.SAPLINGS_TEST_RUNTIME_DATABASE_URL, id, async () =>
      (await member.request.get(origin + jobPath)).json(),
    );
  }

  const report = {
    action: 'report',
    from: Date.now() - 60_000,
    to: Date.now() + 60_000,
    report: { id: 'smoke', type: 'trend', event: 'starter.viewed' },
  };
  const countEvents = async () =>
    (await (await status(await api('/api/services/miner', author.headers, report), 200)).json())
      .total;
  const total = await countEvents();
  assert.ok(total >= 1);

  const compose = (...args) =>
    execFileSync(
      'docker',
      [
        'compose',
        '--project-directory',
        '.',
        '--env-file',
        'starter/.starter/compose.env',
        '-f',
        'starter/deploy/compose.yaml',
        '--profile',
        'starter',
        ...args,
      ],
      { stdio: 'inherit' },
    );
  if (process.env.SAPLINGS_TEST_COMPOSE === '1') {
    compose('restart', 'api', 'worker');
    await waitFor('/ready', 200);
  }
  await member.reload();
  assert.equal(await member.getByLabel('Display name').inputValue(), 'Starter ' + suffix);
  await member.getByRole('status').filter({ hasText: 'Report status completed' }).waitFor();
  assert.deepEqual(await (await member.request.get(origin + jobPath)).json(), job);
  assert.equal(
    (await (await member.request.get(origin + '/api/config/workspace')).json()).value.message,
    workspaceMessage,
  );
  assert.equal(await countEvents(), total);

  await status(await api('/api/services/config', reviewer.headers), 200);
  assert.equal(
    (await actorWrite(reviewer.page, '/api/starter/session', { logout: true })).status(),
    200,
  );
  await status(await api('/api/services/config', reviewer.headers), 401);
  assert.equal((await actorWrite(member, '/api/starter/session', { logout: true })).status(), 200);
  assert.equal((await member.request.get(origin + '/api/config/workspace')).status(), 401);
  if (process.env.SAPLINGS_TEST_COMPOSE === '1') {
    compose('stop', 'postgres');
    await waitFor('/ready', 503);
  }
  console.log(
    'Verified the durable Starter over HTTPS with Kingsman, PostgreSQL, Remote Config, Miner, and report jobs.',
  );
} finally {
  await browser.close();
}
