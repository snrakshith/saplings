import { createSapling } from '@saplings/sdk';
import type { RequestHandler } from 'express';

import { project, sampleConfig, setup, tenant } from './sapling.config.js';

export async function startSampleSdk(port: number) {
  const config = sampleConfig(port);
  const sdk = createSapling(config);
  const context = {
    tenantId: tenant.id,
    actorId: 'demo-app',
    permissions: ['flags:write'],
  };
  const { flag, enabled, rollout } = setup.flags;
  await sdk.flags.set(context, { key: flag, enabled, rollout });
  await sdk.analytics.track(context, {
    name: setup.analytics.event,
    subjectId: setup.analytics.subject,
  });
  return {
    sdk,
    context,
    manifest: {
      version: 1,
      project,
      tenant,
      config: {
        kingsman: config.platforms.kingsman.config,
        harbor: config.platforms.harbor.config,
      },
      setup,
    },
  };
}

export function sampleManifest(sample: () => ReturnType<typeof startSampleSdk>): RequestHandler {
  return async (req, res) => {
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
    if (!local || !/^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(req.headers.host ?? '')) {
      res.sendStatus(404);
      return;
    }
    res.set('Cache-Control', 'no-store').json((await sample()).manifest);
  };
}
