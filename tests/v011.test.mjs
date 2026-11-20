import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  createSapling,
  resolveSaplingConfig,
  InMemoryStore,
  CashfreeAdapter,
  RazorpayAdapter,
  StripePaymentAdapter,
} from '../packages/sdk/dist/index.js';
const app = { id: 'cashfree-test', environment: 'test' },
  ctx = { tenantId: 'tenant-a', actorId: 'billing', permissions: ['*'] },
  other = { ...ctx, tenantId: 'tenant-b' };
const cfg = {
  clientId: 'test-id',
  clientSecret: 'test-secret-not-real',
  customer: ({ tenantId }) => ({ id: tenantId, phone: '9999999999' }),
};
const input = { amountMinor: 1034, currency: 'INR', reference: 'ref', idempotencyKey: 'unique' };
const make = (store = new InMemoryStore()) =>
  createSapling({ app, payments: { cashfree: cfg }, providers: { store } });
const mock = async (fn, run) => {
  const old = globalThis.fetch;
  globalThis.fetch = fn;
  try {
    await run();
  } finally {
    globalThis.fetch = old;
  }
};
test('Cashfree preferred default, alternative explicit or injected, disabled and missing provider fail closed', async () => {
  assert.equal(resolveSaplingConfig({ app }).payments.provider, 'cashfree');
  assert.equal(
    resolveSaplingConfig({ app, payments: { provider: 'stripe' } }).payments.provider,
    'stripe',
  );
  assert.equal(
    resolveSaplingConfig({ app, providers: { payments: new RazorpayAdapter('key', 'secret') } })
      .payments.provider,
    'razorpay',
  );
  assert.throws(
    () =>
      resolveSaplingConfig({
        app,
        payments: { provider: 'cashfree' },
        providers: { payments: new StripePaymentAdapter('test') },
      }),
    /match/,
  );
  await assert.rejects(createSapling({ app }).payments.createOrder(ctx, input), {
    code: 'NOT_CONFIGURED',
  });
  await assert.rejects(
    createSapling({ app, payments: { enabled: false, cashfree: cfg } }).payments.createOrder(
      ctx,
      input,
    ),
    { code: 'NOT_CONFIGURED' },
  );
  await assert.rejects(make().payments.createOrder({ ...ctx, permissions: [] }, input), {
    code: 'FORBIDDEN',
  });
});
test('Cashfree order uses stable tenant identity, INR paise conversion, checkout session, idempotency and recovery', async () => {
  let requests = 0,
    order;
  await mock(
    async (url, opts) => {
      assert.ok(url.startsWith('https://sandbox.cashfree.com/pg/orders'));
      if (opts.method === 'POST') {
        requests++;
        order = JSON.parse(opts.body);
        assert.equal(order.order_amount, 10.34);
        assert.equal(order.customer_details.customer_id, 'tenant-a');
        assert.match(opts.headers['x-idempotency-key'], /^[a-f0-9-]{36}$/);
        throw Error('response lost');
      }
      return Response.json({
        ...order,
        order_status: 'ACTIVE',
        payment_session_id: 'session_test',
      });
    },
    async () => {
      const s = make();
      await assert.rejects(s.payments.createOrder(ctx, input), /lost/);
      await assert.rejects(s.payments.createOrder(ctx, input), { code: 'PAYMENT_PENDING' });
      const r = await s.payments.recoverOrder(ctx, input);
      assert.equal(r.checkoutSessionId, 'session_test');
      assert.equal((await s.payments.createOrder(ctx, input)).id, r.id);
      assert.equal(requests, 1);
      assert.equal((await s.store.get(ctx.tenantId, 'payment-orders', r.id)).provider, 'cashfree');
      assert.equal(await s.store.get(other.tenantId, 'payment-orders', r.id), undefined);
      await assert.rejects(s.payments.createOrder(ctx, { ...input, amountMinor: 2000 }), {
        code: 'CONFLICT',
      });
      await assert.rejects(s.payments.recoverOrder(other, input), { code: 'NOT_FOUND' });
    },
  );
});
test('Cashfree signed capture checks raw body, current timestamp, provider amount, tenant, and duplicate delivery', async () => {
  const s = make(),
    id = 'sp_order',
    pid = '12345';
  await s.store.put(ctx.tenantId, 'invoices', {
    id: 'invoice',
    status: 'open',
    totalMinor: 1034,
    currency: 'INR',
  });
  await s.store.put(ctx.tenantId, 'payment-orders', {
    id,
    provider: 'cashfree',
    amountMinor: 1034,
    currency: 'INR',
    invoiceId: 'invoice',
    status: 'ACTIVE',
  });
  let amount = 10.35;
  await mock(
    async () =>
      Response.json({
        cf_payment_id: pid,
        order_id: id,
        payment_currency: 'INR',
        payment_amount: amount,
        payment_status: 'SUCCESS',
        is_captured: true,
      }),
    async () => {
      const rawBody = JSON.stringify({
          type: 'PAYMENT_SUCCESS_WEBHOOK',
          data: { order: { order_id: id }, payment: { cf_payment_id: pid } },
        }),
        timestamp = String(Date.now()),
        signature = createHmac('sha256', cfg.clientSecret)
          .update(timestamp + rawBody)
          .digest('base64'),
        event = { rawBody, timestamp, signature };
      assert.equal(s.getCapability('SAAS-050').providerConfigured, true);
      await assert.rejects(
        s.invokeCapability(ctx, 'SAAS-050', 'reconcile', { ...event, rawBody: rawBody + ' ' }),
        { code: 'UNAUTHENTICATED' },
      );
      await assert.rejects(s.invokeCapability(other, 'SAAS-050', 'reconcile', event), {
        code: 'PAYMENT_MISMATCH',
      });
      await assert.rejects(s.invokeCapability(ctx, 'SAAS-050', 'reconcile', event), {
        code: 'PAYMENT_MISMATCH',
      });
      amount = 10.34;
      assert.equal((await s.invokeCapability(ctx, 'SAAS-050', 'reconcile', event)).processed, true);
      assert.equal((await s.invokeCapability(ctx, 'SAAS-050', 'reconcile', event)).duplicate, true);
      assert.equal((await s.store.get(ctx.tenantId, 'invoices', 'invoice')).status, 'paid');
      assert.equal(
        new CashfreeAdapter(cfg).verifyWebhook(
          rawBody,
          timestamp,
          signature,
          Number(timestamp) + 90000000,
        ),
        false,
      );
    },
  );
});
test('Cashfree refunds use verified order and reserve balance; pending reconciles once and cross-provider changes are denied', async () => {
  const s = make(),
    pid = '12345',
    id = 'sp_order';
  await s.store.put(ctx.tenantId, 'verified-payments', {
    id: pid,
    provider: 'cashfree',
    orderId: id,
    amountMinor: 1034,
    currency: 'INR',
    status: 'captured',
  });
  let refundId,
    posts = 0;
  await mock(
    async (url, opts) => {
      assert.ok(url.includes('/orders/sp_order/refunds'));
      if (opts.method === 'POST') {
        posts++;
        const b = JSON.parse(opts.body);
        refundId = b.refund_id;
        assert.equal(b.refund_amount, 5);
        return Response.json([
          {
            refund_id: refundId,
            cf_payment_id: pid,
            order_id: id,
            refund_currency: 'INR',
            refund_amount: 5,
            refund_status: 'PENDING',
          },
        ]);
      }
      return Response.json({
        refund_id: refundId,
        cf_payment_id: pid,
        order_id: id,
        refund_currency: 'INR',
        refund_amount: 5,
        refund_status: 'SUCCESS',
      });
    },
    async () => {
      const req = { paymentId: pid, amountMinor: 500, idempotencyKey: 'refund' };
      assert.equal((await s.payments.refund(ctx, req)).status, 'pending');
      await assert.rejects(
        s.payments.refund(ctx, { ...req, amountMinor: 600, idempotencyKey: 'other' }),
        { code: 'CONFLICT' },
      );
      assert.equal((await s.payments.reconcileRefund(ctx, req)).status, 'processed');
      assert.equal((await s.payments.reconcileRefund(ctx, req)).status, 'processed');
      assert.equal(posts, 1);
      assert.equal((await s.store.get(ctx.tenantId, 'verified-payments', pid)).refundedMinor, 500);
      const stripe = createSapling({
        app,
        providers: { store: s.store },
        payments: { provider: 'stripe', stripe: { secret: 'mock' } },
      });
      await assert.rejects(stripe.payments.refund(ctx, req), { code: 'PAYMENT_NOT_FOUND' });
    },
  );
});
test('Stripe selectable one-time adapter returns typed intent and reconciles captured amount (mock)', async () => {
  let id;
  await mock(
    async (url, opts) => {
      if (opts.method === 'POST') {
        id = opts.body.get('metadata[sapling_order]');
        return Response.json({
          id: 'pi_123',
          status: 'requires_payment_method',
          amount: 1034,
          currency: 'inr',
          metadata: { sapling_order: id },
          client_secret: 'pi_123_secret_mock',
        });
      }
      return Response.json({
        id: 'pi_123',
        status: 'succeeded',
        amount_received: 1034,
        currency: 'inr',
      });
    },
    async () => {
      const s = createSapling({
        app,
        payments: { provider: 'stripe', stripe: { secret: 'mock' } },
      });
      const r = await s.payments.createOrder(ctx, input);
      assert.equal(r.clientSecret, 'pi_123_secret_mock');
      assert.equal(
        (await s.payments.reconcilePayment(ctx, { orderId: r.id, paymentId: r.id })).processed,
        true,
      );
    },
  );
});
test('Cashfree validates provider amount and refuses invalid currency before network', async () => {
  const a = new CashfreeAdapter(cfg);
  await mock(
    async () => {
      throw Error('unexpected HTTP');
    },
    async () => {
      await assert.rejects(a.createOrder({ tenantId: 'a', ...input, currency: 'USD' }), /INR/);
    },
  );
  await mock(
    async (_url, opts) =>
      Response.json({
        ...JSON.parse(opts.body),
        order_amount: 1,
        order_status: 'ACTIVE',
        payment_session_id: 'session',
      }),
    async () => {
      await assert.rejects(a.createOrder({ tenantId: 'a', ...input }), {
        code: 'PAYMENT_MISMATCH',
      });
    },
  );
});
