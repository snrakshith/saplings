import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { createConsoleApp } from '../dist/server/app.js';
import { ConsoleStore } from '../dist/server/store.js';
import { domains } from '../dist/onboarding.js';

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
  const progress = page.getByRole('progressbar', { name: 'SDK setup drafts saved' });
  await page.getByText('0 of 11 SDK setup drafts saved', { exact: true }).waitFor();
  assert.equal(await progress.getAttribute('max'), '11');
  for (const { title } of Object.values(domains)) {
    await button('Set up ' + title).waitFor();
  }

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

  await button('Kingsman').click();
  await button('Edit portal-web').click();
  await fill('Redirect URIs', 'https://portal.example.com/new-callback');
  await button('Save client').click();
  await page.getByText('Configuration saved at revision 4.').waitFor();
  await button('Edit portal-web').click();
  assert.equal(
    await page.getByLabel('Redirect URIs', { exact: true }).inputValue(),
    'https://portal.example.com/new-callback',
  );
  await button('Remove client from draft').click();
  await page.getByText('Configuration saved at revision 5.').waitFor();
  await page.getByText('Register a client when your application needs to sign users in.').waitFor();

  await button('Harbor').click();
  await button('Edit customers').click();
  await fill('Paths', '/api/accounts');
  await button('Save route').click();
  await page.getByText('Configuration saved at revision 6.').waitFor();
  await page.getByText('/api/accounts · GET · exact', { exact: true }).waitFor();
  await button('Edit customers').click();
  await button('Remove route from draft').click();
  await page.getByText('Configuration saved at revision 7.').waitFor();
  await page.getByText('No routes saved.', { exact: false }).waitFor();

  await button('Onboarding').click();
  await button('Continue with Project and workspace setup').click();
  await fill('Workspace name', 'Staging');
  await fill('Project name', 'Customer Portal');
  await button('Save setup draft').click();
  await button('Continue with Feature flags').click();
  await fill('Flag key', 'beta-access');
  await fill('Rollout percentage', '0');
  await button('Save setup draft').click();
  await button('Run SDK preview').click();
  await page.getByText('Preview decision: disabled').waitFor();
  await button('Continue with Product analytics').click();
  await button('Save setup draft').click();
  await button('Run SDK preview').click();
  await page.getByText('Events recorded in preview: 1').waitFor();
  await button('Back to onboarding').click();
  await page.getByText('3 of 11 SDK setup drafts saved', { exact: true }).waitFor();

  const remaining = [
    ['storage'],
    ['payments', 'HTTPS payment callback', 'https://app.example.com/hooks/payments'],
    ['billing'],
    ['notifications', 'HTTPS webhook endpoint', 'https://app.example.com/hooks/notify'],
    ['workflows'],
    ['audit'],
    ['governance'],
    ['operations'],
  ];
  for (const [id, label, endpoint] of remaining) {
    await button('Set up ' + domains[id].title).click();
    if (label) await fill(label, endpoint);
    await button('Save setup draft').click();
    await page.getByText('Setup draft saved.').waitFor();
    await button('Back to onboarding').click();
  }

  await page.getByText('11 of 11 SDK setup drafts saved', { exact: true }).waitFor();
  await button('Reload saved draft').click();
  await page.getByText('11 of 11 SDK setup drafts saved', { exact: true }).waitFor();
  assert.equal(await progress.getAttribute('value'), '11');
  await page.getByText(/All drafts are saved/).waitFor();
  const [setupDownload] = await Promise.all([
    page.waitForEvent('download'),
    button('Download setup drafts').click(),
  ]);
  const setup = JSON.parse(await readFile(await setupDownload.path(), 'utf8'));
  assert.equal(Object.keys(setup.setup).length, 11);
  assert.equal(setup.setup.flags.values.flag, 'beta-access');
  assert.equal(setup.setup.analytics.values.event, 'onboarding.completed');

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
