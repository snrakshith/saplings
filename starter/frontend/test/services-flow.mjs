import assert from 'node:assert/strict';

export async function verifyProductServices({ browser, page, webUrl, apiUrl, credentials }) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const button = (name) => page.getByRole('button', { name, exact: true });
  async function operator(token, name) {
    await page.getByLabel('Application operator token').fill(token);
    await button(name).click();
  }

  await button('Remote Config').click();
  await operator(credentials.author, 'Connect service');
  assert.equal((await fetch(apiUrl + '/api/public/config/welcome')).status, 404);
  const draft = page.getByLabel('Draft JSON');
  await draft.fill('{"message":"Published starter welcome"}');
  await page
    .getByRole('region', { name: 'Changes from published JSON' })
    .getByText('Added message')
    .waitFor();
  await button('Save draft').click();
  await button('Submit for review').click();
  await button('Approve and publish').waitFor();
  assert.equal(await draft.getAttribute('readonly'), '');
  await button('Approve and publish').click();
  await page
    .getByRole('alert')
    .getByText(/distinct from the author/)
    .waitFor();
  await operator(credentials.reviewer, 'Switch operator');
  await button('Approve and publish').click();
  await page.getByText(/Published revision 1/).waitFor();
  const published = await fetch(apiUrl + '/api/public/config/welcome');
  const tag = published.headers.get('etag');
  assert.ok(tag);
  assert.equal(
    (await fetch(apiUrl + '/api/public/config/welcome', { headers: { 'If-None-Match': tag } }))
      .status,
    304,
  );

  await operator(credentials.author, 'Switch operator');
  await page.getByLabel('Document').selectOption('workspace');
  await draft.fill('{"message":"Private workspace settings"}');
  await button('Save draft').click();
  await button('Submit for review').click();
  await button('Approve and publish').waitFor();
  await operator(credentials.reviewer, 'Switch operator');
  await page.getByLabel('Document').selectOption('workspace');
  await button('Approve and publish').click();
  await page.getByText(/Published revision 1/).waitFor();
  assert.equal((await fetch(apiUrl + '/api/config/workspace')).status, 401);
  assert.equal((await fetch(apiUrl + '/api/public/config/workspace')).status, 404);

  await button('Miner').click();
  await operator(credentials.author, 'Connect service');
  await button('Save feature flag').click();
  await page.getByLabel('Experiment flag').selectOption('starter-banner');
  await button('Save experiment draft').click();
  await button('Launch experiment').click();
  await page.getByText('onboarding · running', { exact: true }).waitFor();

  const visitor = await browser.newPage();
  try {
    await visitor.goto(webUrl + '/services');
    await visitor.getByText('Published starter welcome', { exact: true }).waitFor();
    assert.equal(await visitor.getByText('Private workspace settings', { exact: true }).count(), 0);
    await visitor.getByRole('button', { name: 'Allow analytics' }).click();
    await visitor.getByText('Analytics consent saved.', { exact: true }).waitFor();
    await visitor.getByRole('button', { name: 'Record browser event' }).click();
    await visitor.getByText('Browser event recorded.', { exact: true }).waitFor();
    await visitor.getByLabel('Starter member token').fill(credentials.member);
    await visitor.getByRole('button', { name: 'Sign in', exact: true }).click();
    await visitor.getByText('Private workspace settings', { exact: true }).waitFor();
    await visitor.getByText('Signed in and linked anonymous events.', { exact: true }).waitFor();
    await visitor.getByRole('button', { name: 'Record server event' }).click();
    await visitor.getByText('Server event recorded.', { exact: true }).waitFor();
    await visitor.getByRole('button', { name: 'Evaluate flag' }).click();
    await visitor.getByText('Flag enabled.', { exact: true }).waitFor();
    await visitor.getByRole('button', { name: 'Run experiment journey' }).click();
    await visitor.getByText(/Exposure and conversion recorded/).waitFor();

    await button('View results').click();
    const results = page.getByRole('region', { name: 'Miner results' });
    await results.getByRole('columnheader', { name: 'Conversion rate' }).waitFor();
    const variants = await results.getByRole('row').all();
    const converted = await Promise.all(
      variants.slice(1).map(async (row) => Number(await row.getByRole('cell').nth(1).innerText())),
    );
    assert.equal(
      converted.reduce((total, count) => total + count, 0),
      1,
    );
    await page.getByLabel('Event', { exact: true }).fill('starter.viewed');
    await button('Save and run report').click();
    await results.getByText('1 event · 1 unique subject', { exact: true }).waitFor();
    await visitor.getByRole('button', { name: 'Sign out' }).click();
    await visitor.getByText('Signed out.', { exact: true }).waitFor();
    assert.equal(await visitor.getByText('Private workspace settings', { exact: true }).count(), 0);
  } finally {
    await visitor.close();
  }
}
