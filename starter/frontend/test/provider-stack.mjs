import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { chromium } from 'playwright';

const origin = 'https://localhost:8443';
const services = '/api/starter/providers';
const accounts = JSON.parse(await readFile('starter/.starter/accounts.json', 'utf8'));
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});

async function until(work, description) {
  let lastError;
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      const result = await work();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await setTimeout(1500);
  }
  throw new Error(description, { cause: lastError });
}

async function signIn(role) {
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const account = accounts.find((entry) => entry.role === role);
  await page.goto(origin + '/login');
  await page.getByLabel('Username', { exact: true }).fill(account.username);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
  return page;
}

const grafana = 'http://127.0.0.1:3300';
const grafanaHeaders = { authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64') };
const get = (url, headers) => fetch(url, { headers, signal: AbortSignal.timeout(3000) });
const datasourcePath = (datasource, path) =>
  grafana + '/api/datasources/proxy/uid/' + encodeURIComponent(datasource.uid) + path;

try {
  const ready = await (await get(origin + '/ready')).json();
  for (const provider of ['storage', 'mail', 'valkey']) assert.equal(ready.checks[provider], true);

  const member = await signIn('member');
  const reviewer = await signIn('reviewer');
  assert.equal((await get(origin + services)).status, 401);
  await member.goto(origin + '/providers');
  const text = 'Starter object ' + randomUUID();
  await member.getByRole('textbox', { name: 'Text to store' }).fill(text);
  const uploaded = member.waitForResponse(
    (res) => res.url() === origin + services + '/storage' && res.request().method() === 'POST',
  );
  await member.getByRole('button', { name: 'Upload object' }).click();
  const created = await uploaded;
  assert.equal(created.status(), 201);
  const { id } = await created.json();
  await member.getByRole('button', { name: 'Read object' }).click();
  await member.getByText(text, { exact: true }).waitFor();
  assert.equal((await reviewer.request.get(origin + services + '/storage/' + id)).status(), 404);
  await member.getByRole('button', { name: 'Delete object' }).click();
  await member.getByText('Object deleted.', { exact: true }).waitFor();
  assert.equal((await member.request.get(origin + services + '/storage/' + id)).status(), 404);

  await member.getByRole('button', { name: 'Send test email' }).click();
  await member.getByText('Test email sent.', { exact: true }).waitFor();
  const email = accounts.find((entry) => entry.role === 'member').email;
  await until(async () => {
    const data = await (await get('http://127.0.0.1:8025/api/v1/messages')).json();
    return data.messages?.some(
      (message) =>
        message.Subject === 'Saplings Starter test notification' &&
        message.To.some((recipient) => recipient.Address === email),
    );
  }, 'Mailpit did not receive the Starter test email.');

  const job = await member.request.post(origin + '/api/starter/jobs', {
    data: {},
    headers: { origin, 'idempotency-key': randomUUID() },
  });
  assert.equal(job.status(), 202);
  const traceId = job.headers()['x-trace-id'];
  assert.match(traceId, /^[a-f0-9]{32}$/);
  const jobId = (await job.json()).id;
  await until(
    async () =>
      (await (await member.request.get(origin + '/api/starter/jobs/' + jobId)).json()).status ===
      'completed',
    'The report worker did not complete.',
  );
  const datasources = await until(async () => {
    const response = await get(grafana + '/api/datasources', grafanaHeaders);
    if (!response.ok) return;
    const list = await response.json();
    return ['tempo', 'loki', 'prometheus'].every((type) =>
      list.some((entry) => entry.type === type),
    )
      ? Object.fromEntries(list.map((entry) => [entry.type, entry]))
      : undefined;
  }, 'Grafana did not provision the telemetry sources.');
  await until(async () => {
    const response = await get(
      datasourcePath(datasources.tempo, '/api/traces/' + traceId),
      grafanaHeaders,
    );
    if (!response.ok) return;
    const content = await response.text();
    return content.includes('starter.report') && content.includes('POST /api/starter/jobs');
  }, 'Tempo did not receive the API and worker spans in one trace.');
  const range = new URLSearchParams({
    query: '{service_name=~"saplings-starter-(api|worker)"} |= "' + traceId + '"',
    start: String(BigInt(Date.now() - 300000) * 1000000n),
  });
  await until(async () => {
    const response = await get(
      datasourcePath(datasources.loki, '/loki/api/v1/query_range?' + range),
      grafanaHeaders,
    );
    if (!response.ok) return;
    const logs = JSON.stringify(await response.json());
    assert.equal(logs.includes(accounts[0].password), false);
    return logs.includes('starter.http.completed') && logs.includes('starter.report.completed');
  }, 'Loki did not receive the correlated API and worker logs.');
  for (const metric of ['starter_http_requests', 'starter_worker_jobs']) {
    await until(
      async () => {
        const query = new URLSearchParams({ query: '{__name__=~"' + metric + '(_total)?"}' });
        const response = await get(
          datasourcePath(datasources.prometheus, '/api/v1/query?' + query),
          grafanaHeaders,
        );
        return response.ok && (await response.json()).data?.result?.length > 0;
      },
      'Prometheus did not receive ' + metric + '.',
    );
  }

  console.log(
    'Verified S3-compatible storage, SMTP delivery, Valkey readiness, and correlated tracing, logs, and metrics in Grafana.',
  );
} finally {
  await browser.close();
}
