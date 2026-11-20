import { test } from 'vitest';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
// Dedicated namespace, pre-reviewed experiment manifest with bounded duration and selector.
test('Chaos Mesh experiment lifecycle and recovery', async () => {
  const ns = process.env.SAPLING_QUALITY_NAMESPACE,
    file = process.env.QUALITY_CHAOS_MANIFEST,
    name = process.env.QUALITY_CHAOS_NAME,
    kind = process.env.QUALITY_CHAOS_KIND,
    origin = process.env.SAPLING_QUALITY_TARGET;
  if (
    !ns ||
    !file ||
    !name ||
    !kind ||
    !origin ||
    !['podchaos', 'networkchaos', 'stresschaos'].includes(kind) ||
    !/^[a-z0-9-]+$/.test(name)
  )
    throw Error('Configure dedicated namespace, approved experiment file, kind, name and target');
  const k = (...args) => exec('kubectl', ['-n', ns, ...args], { timeout: 30000 });
  const ping = async () =>
    assert.ok(
      (
        await fetch(new URL('/health', origin), {
          signal: AbortSignal.timeout(5000),
          redirect: 'error',
        })
      ).ok,
    );
  await ping();
  let created = false;
  try {
    await k('create', '-f', file);
    created = true;
    await k('wait', '--for=condition=AllInjected', '--timeout=60s', kind + '/' + name);
  } finally {
    if (created) await k('delete', kind + '/' + name, '--wait=true', '--timeout=60s');
  }
  await ping();
});
