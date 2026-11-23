import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';

import { createConsoleApp } from '../../../console/dist/server/app.js';
import { ConsoleStore } from '../../../console/dist/server/store.js';
import { verifyProductServices } from './services-flow.mjs';

const expected = {
  kingsman: ['signingKeys', 1],
  harbor: ['status', 200],
  workspace: ['linked', true],
  flags: ['enabled', true],
  analytics: ['total', 1],
  storage: ['matches', true],
  payments: ['sameOrder', true],
  billing: ['entitled', true],
  notifications: ['signatureVerified', true],
  workflows: ['status', 'completed'],
  audit: ['latestAction', 'starter.checked'],
  governance: ['imported', 1],
  operations: ['reconciled', 'succeeded'],
};

const api = spawn(
  process.execPath,
  [fileURLToPath(new URL('../../backend/dist/server.js', import.meta.url))],
  {
    env: {
      ...process.env,
      PORT: '0',
      NODE_ENV: 'development',
      SAPLINGS_CONFIG_REVIEW: 'distinct-reviewer',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  },
);
const exited = once(api, 'exit');
let startup = '';
api.stdout.on('data', (chunk) => {
  startup += String(chunk);
});
const store = new ConsoleStore(':memory:');
let browser;
let web;
let consoleServer;
try {
  await Promise.race([
    once(api.stdout, 'data', { signal: AbortSignal.timeout(10000) }),
    exited.then(([code]) => {
      throw new Error('Starter API exited with ' + code);
    }),
  ]);
  const apiPort = Number(startup.match(/http:\/\/127\.0\.0\.1:(\d+)/)?.[1]);
  assert.ok(apiPort, 'Starter API announced a loopback port');
  const apiUrl = 'http://127.0.0.1:' + apiPort;
  web = await preview({
    configFile: false,
    root: fileURLToPath(new URL('..', import.meta.url)),
    preview: {
      host: '127.0.0.1',
      port: 0,
      proxy: { '/api': { target: apiUrl, changeOrigin: false } },
    },
  });
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const webUrl = 'http://127.0.0.1:' + web.httpServer.address().port;
  await page.goto(webUrl);
  await page.getByRole('heading', { name: 'Saplings Starter', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Capabilities', exact: true }).click();
  const { capabilities } = await (await fetch(apiUrl + '/api/starter')).json();
  assert.deepEqual(capabilities.map(({ id }) => id).sort(), Object.keys(expected).sort());

  for (const capability of capabilities) {
    const [key, value] = expected[capability.id];
    await page.getByRole('button', { name: 'Run ' + capability.title, exact: true }).click();
    const card = page.locator('#' + capability.id);
    const result = card.getByRole('status');
    await result.or(card.getByRole('alert')).waitFor();
    assert.equal(await card.getByRole('alert').count(), 0, await card.innerText());
    assert.deepEqual(JSON.parse(await result.innerText())[key], value, capability.title);
  }

  await page.setViewportSize({ width: 375, height: 812 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('link', { name: 'SDK catalog' }).click();
  await page.getByText('182 of 182 features', { exact: true }).waitFor();
  await page.getByRole('searchbox').fill('SAAS-001');
  await page.getByText('1 of 182 features', { exact: true }).waitFor();

  const token = 'starter-browser-test-console-token';
  const webRoot = fileURLToPath(new URL('../../../console/dist/web', import.meta.url));
  consoleServer = createConsoleApp({
    store,
    token,
    webRoot,
    starterPort: apiPort,
    serviceTargets: [{ origin: apiUrl, projectId: 'saplings-starter', tenantId: 'local' }],
  }).listen(0, '127.0.0.1');
  await once(consoleServer, 'listening');
  await page.goto('http://127.0.0.1:' + consoleServer.address().port);
  await page.getByLabel('Console access token').fill(token);
  await page.getByRole('button', { name: 'Unlock console' }).click();
  await page.getByRole('heading', { name: 'Local workspace', exact: true }).waitFor();
  await page.getByText('11 of 11 SDK setup drafts saved', { exact: true }).waitFor();
  const credentials = Object.fromEntries(
    Array.from(
      startup.matchAll(/^Starter (author|reviewer|member) token (\S+)$/gm),
      ([, label, value]) => [label, value],
    ),
  );
  assert.equal(
    Object.keys(credentials).length,
    3,
    'Starter issued three distinct development credentials',
  );
  await verifyProductServices({ browser, page, webUrl, apiUrl, credentials });
  assert.deepEqual(errors, []);
  console.log(
    'Verified all 13 starter workflows, SDK catalog, console discovery, config approval, and the Miner experiment in Chromium.',
  );
} finally {
  await browser?.close();
  if (consoleServer) await new Promise((resolve) => consoleServer.close(resolve));
  store.close();
  await web?.close();
  if (api.exitCode === null) api.kill();
  await exited;
}
