import { test } from 'vitest';
import assert from 'node:assert/strict';
test('Prometheus metric exposure', async () => {
  const origin = process.env.SAPLING_QUALITY_TARGET;
  const name = process.env.QUALITY_EXPECTED_METRIC;
  if (!origin || !name || !/^[a-zA-Z_:][a-zA-Z0-9_:]*$/.test(name))
    throw Error('Configure expected metric and target');
  const r = await fetch(new URL('/metrics', origin), {
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  assert.ok(r.ok);
  assert.ok(
    (await r.text()).split('\n').some((l) => l.startsWith(name + ' ') || l.startsWith(name + '{')),
  );
});
