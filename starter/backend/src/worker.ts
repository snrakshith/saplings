import { openDurableRuntime } from './deployment/runtime.js';
import { durableSettings, starterProfile } from './deployment/settings.js';
import { startTelemetry } from './deployment/telemetry.js';
import { createServices, starterScope } from './services/runtime.js';

const controller = new AbortController();
process.once('SIGINT', () => controller.abort());
process.once('SIGTERM', () => controller.abort());

let telemetry: ReturnType<typeof startTelemetry> | undefined;
try {
  if (starterProfile() !== 'durable') throw new Error('The worker requires the durable profile.');
  const settings = durableSettings();
  telemetry = startTelemetry('worker');
  const runtime = await openDurableRuntime(settings, telemetry);
  try {
    if ((await runtime.sdk.readiness()).status !== 'ready')
      throw new Error('Worker database is unavailable.');
    const { miner } = createServices(runtime.store);
    const scope = { ...starterScope, environment: settings.environment };
    let purgeAfter = 0;
    await telemetry.log({ level: 'info', event: 'starter.worker.ready' });
    await runtime.sdk.worker.run(async () => {
      if (Date.now() >= purgeAfter) {
        await miner.purge({
          ...scope,
          subject: 'u:starter-worker',
          consent: false,
          permissions: ['miner:privacy'],
        });
        purgeAfter = Date.now() + 86400000;
      }
      return [runtime.workerActor];
    }, controller.signal);
  } finally {
    await runtime.close();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not run the Starter worker.');
  process.exitCode = 1;
} finally {
  await telemetry?.close();
}
