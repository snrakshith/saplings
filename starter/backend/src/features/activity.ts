import { Router } from 'express';
import type { SaplingSDK } from '@saplings/sdk';
import { setup } from '../config/sapling.js';
import { RequestError, type createServiceAuth } from '../services/auth.js';

export function activityRoutes(
  sdk: () => Promise<SaplingSDK>,
  auth: ReturnType<typeof createServiceAuth>,
): Router {
  const router = Router();
  router.get('/api/starter/activity', async (req, res) => {
    const user = await auth.identity(req, true);
    if (!user?.permissions.includes('audit:read'))
      throw new RequestError('Workspace audit permission required.', 403);
    const { audit } = await sdk();
    const events = await audit.list(
      { tenantId: user.tenantId, actorId: user.userId },
      setup.audit.limit,
    );
    res.json({
      events: events.map(({ id, at, action, resourceType }) => ({ id, at, action, resourceType })),
    });
  });
  return router;
}
