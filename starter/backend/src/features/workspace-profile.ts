import { requireAuth, validate, type Request as SaplingsRequest } from '@saplings/middleware';
import type { Store } from '@saplings/sdk';
import { unique } from '@saplings/utils';
import { z } from '@saplings/validations';
import { Router } from 'express';
import { body, type createServiceAuth } from '../services/auth.js';

const path = '/api/starter/profile';
const collection = 'starter-member-profiles';
const profileInput = z.strictObject({
  displayName: z.string().trim().min(1).max(64),
  interests: z.array(z.enum(['identity', 'observability', 'providers'])).max(8),
});
type Profile = z.infer<typeof profileInput>;

export function workspaceProfileRoutes(
  store: Store,
  auth: ReturnType<typeof createServiceAuth>,
): Router {
  const router = Router();
  router.use(path, async (req, _res, next) => {
    const user = await auth.identity(req, false);
    if (user) (req as SaplingsRequest).sapling = user;
    next();
  });
  router.use(path, requireAuth());
  router.get(path, async (req, res) => {
    const { userId, tenantId } = (req as SaplingsRequest).sapling!;
    const saved = await store.get<Profile>(tenantId!, collection, userId!);
    res.json(
      saved
        ? { displayName: saved.displayName, interests: saved.interests }
        : { displayName: '', interests: [] },
    );
  });
  router.post(
    path,
    (req, _res, next) => {
      body(req);
      next();
    },
    validate({ body: profileInput }),
    async (req, res) => {
      const { sapling, validated } = req as SaplingsRequest;
      const { userId, tenantId } = sapling!;
      const input = validated!.body as Profile;
      const profile = { displayName: input.displayName, interests: unique(input.interests) };
      await store.put(tenantId!, collection, { id: userId!, ...profile });
      res.json(profile);
    },
  );
  return router;
}
