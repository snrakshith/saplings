import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { request } from 'node:http';
import express from 'express';
import { createSapling, InMemoryStore } from '../../../packages/sdk/dist/index.js';
import { openStarterProviders } from '../dist/deployment/providers/runtime.js';
import { cashfreeRoutes, providerRoutes } from '../dist/deployment/providers/routes.js';
import { serviceErrors } from '../dist/services/routes.js';

const secret = randomBytes(32).toString('hex');
Object.assign(process.env, {
  CASHFREE_CLIENT_ID: 'starter-test',
  CASHFREE_CLIENT_SECRET: secret,
  CASHFREE_ENVIRONMENT: 'sandbox',
  STARTER_CHECKOUT_AMOUNT_MINOR: '1200',
  SAPLING_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
});

const store = new InMemoryStore();
const phone = '+919876543210';
const principal = {
  tenantId: 'local',
  userId: 'tester-one',
  roles: ['member'],
  permissions: ['starter:jobs'],
};
const upstream = new Map();
let creates = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));
  if (url.hostname === '127.0.0.1') return originalFetch(input, options);
  assert.equal(url.origin, 'https://sandbox.cashfree.com');
  assert.equal(options.headers['x-client-secret'], secret);
  if (options.method === 'POST' && url.pathname === '/pg/orders') {
    const order = JSON.parse(options.body);
    assert.equal(order.order_amount, 12);
    assert.equal(order.order_currency, 'INR');
    assert.equal(order.customer_details.customer_phone, phone);
    assert.equal(order.customer_details.customer_id, 'tester-one');
    assert.equal(
      order.order_meta.notify_url,
      'https://starter.example.invalid/api/webhooks/cashfree',
    );
    creates++;
    const value = { ...order, order_status: 'ACTIVE', payment_session_id: 'mock-checkout-session' };
    upstream.set(order.order_id, value);
    return Response.json(value);
  }
  const [, , , order, , payment] = url.pathname.split('/');
  assert.ok(upstream.has(order));
  assert.equal(payment, '12345');
  return Response.json({
    cf_payment_id: payment,
    order_id: order,
    is_captured: true,
    payment_status: 'SUCCESS',
    payment_amount: 12,
    payment_currency: 'INR',
  });
};

const origin = new URL('https://starter.example.invalid');
const providers = await openStarterProviders({ environment: 'staging', origin }, store);
const sdk = createSapling({
  app: { id: 'provider-test', environment: 'test' },
  providers: { store, payments: providers.cashfree },
  payments: { provider: 'cashfree', enabled: true },
});
const runtime = {
  store,
  providers,
  sdk,
  identity: {
    realm: 'test-realm',
    store: {
      async get() {
        return { enabled: true, email: 'member@example.invalid' };
      },
    },
  },
};
const app = express();
app.use(cashfreeRoutes(runtime, origin), express.json());
app.use(
  providerRoutes(runtime, {
    async identity(req) {
      return { ...principal, userId: req.get('x-test-actor') ?? principal.userId };
    },
  }),
);
app.use(serviceErrors);
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
const checkout = '/api/starter/providers/checkout';
const headers = { 'content-type': 'application/json', 'idempotency-key': randomUUID() };
const create = () =>
  originalFetch(base + checkout, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone, amountMinor: 1, tenantId: 'other' }),
  });
try {
  const first = await create();
  assert.equal(first.status, 200, await first.clone().text());
  const order = await first.json();
  assert.equal(order.checkoutSessionId, 'mock-checkout-session');
  const replay = await create();
  assert.deepEqual(await replay.json(), order);
  assert.equal(creates, 1);
  const customers = await store.list(principal.tenantId, 'starter-checkout-customers');
  assert.equal(customers.length, 1);
  assert.equal(JSON.stringify(customers).includes(phone), false);

  assert.equal(
    (
      await originalFetch(base + checkout + '/' + order.id, {
        headers: { 'x-test-actor': 'tester-two' },
      })
    ).status,
    404,
  );
  const webhook = JSON.stringify({
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    data: { order: { order_id: order.id }, payment: { cf_payment_id: 12345 } },
  });
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', secret).update(timestamp).update(webhook).digest('base64');
  const callback = (proof) =>
    new Promise((resolve, reject) => {
      const incoming = request(
        base + '/api/webhooks/cashfree',
        {
          method: 'POST',
          headers: {
            host: origin.host,
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(webhook),
            'x-webhook-timestamp': timestamp,
            'x-webhook-signature': proof,
          },
        },
        (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () =>
            resolve(new Response(Buffer.concat(chunks), { status: response.statusCode })),
          );
          response.on('error', reject);
        },
      );
      incoming.on('error', reject);
      incoming.end(webhook);
    });
  assert.equal((await callback('invalid')).status, 401);
  assert.equal((await (await callback(signature)).json()).processed, true);
  assert.equal((await (await callback(signature)).json()).duplicate, true);
  assert.equal(
    (await (await originalFetch(base + checkout + '/' + order.id)).json()).status,
    'captured',
  );
  console.log(
    'Verified checkout ownership, encrypted contact, idempotency, signed webhook, and upstream reconciliation against a Cashfree contract fixture.',
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
  await providers.close();
  await sdk.lifecycle.close();
  globalThis.fetch = originalFetch;
}
