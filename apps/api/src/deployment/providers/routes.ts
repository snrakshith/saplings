import { createHash, randomUUID } from 'node:crypto';
import express, { Router, type Request } from 'express';
import type { ActorContext, JsonRecord } from '@saplings/sdk';
import type { RealmUser } from '@saplings/kingsman';
import { tenant } from '../../sapling.config.js';
import { body, RequestError, type createServiceAuth } from '../../services/auth.js';
import type { DurableRuntime } from '../runtime.js';
import { objectPrefix } from './runtime.js';

const prefix = '/api/starter/providers';
const objectId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;

export function providerRoutes(
  runtime: DurableRuntime,
  auth: ReturnType<typeof createServiceAuth>,
): Router {
  const { sdk, providers } = runtime;
  const router = Router();

  async function actor(req: Request, ...permissions: string[]): Promise<ActorContext> {
    const principal = await auth.identity(req, true);
    if (
      !principal ||
      principal.tenantId !== tenant.id ||
      !principal.permissions.includes('starter:jobs')
    )
      throw new RequestError('Starter membership required.', 403);
    return { tenantId: principal.tenantId, actorId: principal.userId, permissions };
  }
  async function account(ctx: ActorContext) {
    const user = await runtime.identity.store.get<RealmUser>(
      runtime.identity.realm,
      'users',
      ctx.actorId,
    );
    if (!user?.enabled) throw new RequestError('Account is unavailable.', 403);
    return user;
  }
  async function limit(ctx: ActorContext, operation: string, max: number) {
    const count = await providers.rateState.increment(
      JSON.stringify([ctx.tenantId, ctx.actorId, operation]),
      60000,
    );
    if (count.count > max) throw new RequestError('Try again in a minute.', 429);
  }
  function key(ctx: ActorContext, id: string | string[]) {
    if (typeof id !== 'string' || !objectId.test(id))
      throw new RequestError('Object not found.', 404);
    return objectPrefix(ctx.actorId) + id + '.txt';
  }
  function requireStorage() {
    if (!providers.storage)
      throw new RequestError('Configure S3 storage to try this workflow.', 503);
  }

  router.get(prefix, async (req, res) => {
    await actor(req);
    res.json({
      storage: Boolean(providers.storage),
      signedDownloads: Boolean(providers.presign),
      notifications: providers.delivery,
      checkout: providers.checkout,
    });
  });
  router.post(prefix + '/storage', async (req, res) => {
    requireStorage();
    const ctx = await actor(req, 'storage:write');
    const { text } = body(req);
    if (typeof text !== 'string' || !text.trim() || Buffer.byteLength(text) > 32768)
      throw new RequestError('Enter up to 32 KiB of plain text.');
    await limit(ctx, 'storage', 20);
    const id = randomUUID();
    const result = await sdk.storage.upload(ctx, {
      key: key(ctx, id),
      data: Buffer.from(text),
      metadata: { texttype: 'plain' },
    });
    res.status(201).json({ id, bytes: result.size });
  });
  router.get(prefix + '/storage/:id', async (req, res) => {
    requireStorage();
    const ctx = await actor(req, 'storage:read');
    const result = await sdk.storage.download(ctx, key(ctx, req.params.id));
    if (!result) throw new RequestError('Object not found.', 404);
    res.json({ text: Buffer.from(result.data).toString('utf8') });
  });
  router.get(prefix + '/storage/:id/link', async (req, res) => {
    if (!providers.presign)
      throw new RequestError('Signed downloads require an AWS-hosted bucket.', 503);
    const ctx = await actor(req, 'storage:read');
    const objectKey = key(ctx, req.params.id);
    if (!(await sdk.storage.download(ctx, objectKey)))
      throw new RequestError('Object not found.', 404);
    const result = await providers.presign.execute({
      ctx,
      featureId: 'SAAS-085',
      action: 'sign',
      input: { key: objectKey, expiresIn: 60 },
      options: {},
    });
    res.json(result);
  });
  router.post(prefix + '/storage/:id/delete', async (req, res) => {
    requireStorage();
    body(req);
    const ctx = await actor(req, 'storage:delete');
    await sdk.storage.delete(ctx, key(ctx, req.params.id));
    res.json({ deleted: true });
  });
  router.post(prefix + '/notification', async (req, res) => {
    if (!providers.notifications)
      throw new RequestError('Configure a notification provider first.', 503);
    body(req);
    const ctx = await actor(req);
    await limit(ctx, 'notification', 2);
    const user = await account(ctx);
    const result = await sdk.notifications.send(ctx, {
      channel: 'email',
      to: user.email,
      subject: 'Saplings Starter test notification',
      body: 'The Saplings Starter delivered this message using your configured email provider.',
    });
    res.json({ status: result.status });
  });
  router.post(prefix + '/checkout', async (req, res) => {
    if (!providers.checkout) throw new RequestError('Configure Cashfree to try checkout.', 503);
    const ctx = await actor(req, 'payments:write');
    const { phone, recover } = body(req);
    const idempotency = req.get('idempotency-key');
    if (
      typeof phone !== 'string' ||
      !/^\+?[0-9]{8,15}$/.test(phone) ||
      !idempotency ||
      !/^[a-zA-Z0-9_-]{16,128}$/.test(idempotency)
    )
      throw new RequestError('Enter a valid phone number and idempotency key.');
    await account(ctx);
    await limit(ctx, 'checkout', 8);
    const idempotencyKey = createHash('sha256')
      .update(JSON.stringify([ctx.actorId, idempotency]))
      .digest('hex');
    // Persist the verified account data for this checkout once so retries cannot change the customer.
    await runtime.store.transaction(ctx.tenantId, async (tx) => {
      const collection = 'starter-checkout-customers';
      const existing = await tx.get<{ contact: JsonRecord }>(
        ctx.tenantId,
        collection,
        idempotencyKey,
      );
      if (existing && providers.checkoutCrypto!.decrypt(ctx, existing.contact) !== phone)
        throw new RequestError('Use the same phone number for this checkout request.', 409);
      if (!existing)
        await tx.put(ctx.tenantId, collection, {
          id: idempotencyKey,
          actorId: ctx.actorId,
          contact: providers.checkoutCrypto!.encrypt(ctx, phone),
        });
    });
    const order = {
      currency: 'INR',
      amountMinor: providers.checkout.amountMinor,
      reference: idempotencyKey,
      idempotencyKey,
    };
    const result =
      recover === true
        ? await sdk.payments.recoverOrder(ctx, order)
        : await sdk.payments.createOrder(ctx, order);
    res.json({ id: result.id, status: result.status, checkoutSessionId: result.checkoutSessionId });
  });
  router.get(prefix + '/checkout/:id', async (req, res) => {
    const ctx = await actor(req);
    const { id } = req.params;
    if (typeof id !== 'string' || !/^sp_[a-f0-9]{40}$/.test(id))
      throw new RequestError('Order not found.', 404);
    const order = await runtime.store.get<{ id: string; status: string; reference: string }>(
      ctx.tenantId,
      'payment-orders',
      id,
    );
    const owner =
      order &&
      (await runtime.store.get<{ actorId: string }>(
        ctx.tenantId,
        'starter-checkout-customers',
        order.reference,
      ));
    if (!order || owner?.actorId !== ctx.actorId) throw new RequestError('Order not found.', 404);
    res.json({ id: order.id, status: order.status });
  });
  return router;
}

export function cashfreeRoutes(runtime: DurableRuntime, origin: URL): Router {
  const router = Router();
  const webhook = runtime.providers.webhook;
  if (!webhook) return router;
  router.post(
    '/api/webhooks/cashfree',
    express.raw({ type: 'application/json', limit: '256kb', inflate: false }),
    async (req, res) => {
      if (req.get('host') !== origin.host) return res.sendStatus(404);
      if (!Buffer.isBuffer(req.body)) throw new RequestError('Send a JSON webhook.', 415);
      const timestamp = req.get('x-webhook-timestamp');
      const signature = req.get('x-webhook-signature');
      if (!timestamp || !signature) throw new RequestError('Invalid Cashfree signature.', 401);
      const result = await webhook.execute({
        ctx: { tenantId: tenant.id, actorId: 'starter-cashfree-webhook' },
        featureId: 'SAAS-050',
        action: 'reconcile',
        input: { rawBody: req.body.toString('utf8'), timestamp, signature },
        options: {},
      });
      res.json(result);
    },
  );
  return router;
}
