import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { createConsoleApp } from '../dist/server/app.js';
import { ConsoleStore } from '../dist/server/store.js';

const store = new ConsoleStore(':memory:');
const token = randomBytes(32).toString('base64url');
const webRoot = fileURLToPath(new URL('../dist/web/', import.meta.url));
const server = createConsoleApp({ store, token, webRoot }).listen(0, '127.0.0.1');
let browser;
try {
  await once(server, 'listening');
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const fill = (label, value) => page.getByLabel(label, { exact: true }).fill(value);
  const origin = 'http://127.0.0.1:' + server.address().port;

  await page.goto(origin);
  await fill('Console access token', token);
  await button('Unlock console').click();
  await button('Create project').click();
  await fill('Name', 'Customer Portal');
  await fill('Key', 'customer-portal');
  await button('Create project').click();
  await page.getByRole('heading', { name: 'Onboard a tenant' }).waitFor();
  await fill('Name', 'North');
  await fill('Key', 'north');
  await fill('Kingsman issuer base URL', 'https://auth.example.com');
  await button('Create tenant draft').click();

  await button('Manage identity').click();
  await button('Add client').click();
  await fill('Client ID', 'portal-web');
  await fill('Redirect URIs', 'https://portal.example.com/callback');
  await button('Save client').click();
  await page.getByText('Configuration saved at revision 2.').waitFor();

  await button('Harbor').click();
  await button('Add route').click();
  await fill('Service name', 'portal-api');
  await fill('Upstream target', 'api.internal:8080');
  await fill('Route name', 'customers');
  await fill('Paths', '/api/customers');
  await fill('HTTP methods', 'GET');
  await button('Save route').click();
  await page.getByText('Configuration saved at revision 3.').waitFor();

  await button('Configuration').click();
  await fill('Kingsman RealmConfig', '{}');
  await button('Validate and save configuration').click();
  await page
    .getByRole('alert')
    .filter({ hasText: /Kingsman configuration is invalid/ })
    .waitFor();
  await button('Export').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    button('Download bundle').click(),
  ]);
  assert.equal(download.suggestedFilename(), 'customer-portal-north.saplings.json');
  const bundle = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(bundle.harbor.spec.services[0].routes[0].name, 'customers');
  assert.equal(bundle.kingsman.spec.clients[0].clientId, 'portal-web');

  await page.setViewportSize({ width: 375, height: 812 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await button('Lock console').click();
  await page.getByRole('heading', { name: 'Open your workspace' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Developer console browser onboarding passed.');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  store.close();
}
