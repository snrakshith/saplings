import { test } from 'vitest';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
test('operator-approved restore drill and business invariant', async () => {
  const script = process.env.QUALITY_RESTORE_TEST_MODULE;
  if (!script) throw Error('Provide independent restore module with RPO/RTO and data checks');
  const { run } = await import(new URL('file://' + script).href);
  const r = await run();
  assert.equal(r.restored, true);
  assert.equal(r.invariantsPassed, true);
  assert.ok(Number.isFinite(r.rpoSeconds) && Number.isFinite(r.rtoSeconds));
  assert.ok(r.rpoSeconds <= Number(process.env.QUALITY_MAX_RPO_SECONDS ?? 60));
  assert.ok(r.rtoSeconds <= Number(process.env.QUALITY_MAX_RTO_SECONDS ?? 300));
});
