import type { SetupDomain } from './types.js';

export const commerce = {
  payments: {
    title: 'Payments',
    summary: 'Prepare a sandbox payment integration and callback verification.',
    fields: [
      {
        key: 'provider',
        label: 'Payment provider',
        type: 'choice',
        initial: 'stripe',
        options: ['stripe', 'cashfree', 'razorpay', 'custom'],
      },
      { key: 'endpoint', label: 'HTTPS payment callback', type: 'url', initial: '' },
      {
        key: 'secretRef',
        label: 'Provider secret environment variable',
        type: 'env',
        initial: 'PAYMENT_PROVIDER_SECRET',
      },
    ],
    steps: [
      'Connect the provider using its sandbox credentials. Supply provider options or the matching PaymentAdapter in your SDK configuration.',
      'Register the callback in the sandbox dashboard. Verify signatures using the raw request body and replay a test event to check idempotency.',
    ],
    example: (
      v,
    ) => `const payments = { enabled: true, provider: ${JSON.stringify(v.provider)} } as const;
const providerSecret = process.env[${JSON.stringify(v.secretRef)}];
if (!providerSecret) throw new Error("Sandbox credentials are required");
// Supply providerSecret to the selected adapter.
// Register ${JSON.stringify(v.endpoint)} in the provider sandbox.

const order = await sdk.payments.createOrder(ctx, {
  amountMinor: sandboxAmount,
  currency: sandboxCurrency,
  reference: testRunId,
  idempotencyKey: testRunId,
});`,
  },
  billing: {
    title: 'Billing and subscriptions',
    summary: 'Draft a plan and quota for a product’s first subscription.',
    fields: [
      { key: 'plan', label: 'Plan name', type: 'text', initial: 'Starter' },
      {
        key: 'currency',
        label: 'Currency',
        type: 'choice',
        initial: 'USD',
        options: ['USD', 'EUR', 'GBP', 'INR'],
      },
      {
        key: 'price',
        label: 'Price in minor units',
        type: 'number',
        initial: 1000,
        min: 0,
        max: 1000000000,
      },
      { key: 'feature', label: 'Included feature key', type: 'key', initial: 'reports' },
      { key: 'metric', label: 'Usage metric', type: 'key', initial: 'reports.created' },
      {
        key: 'quota',
        label: 'Monthly limit',
        type: 'number',
        initial: 100,
        min: 0,
        max: 1000000000,
      },
    ],
    steps: [
      'Create the plan and set its quota with a billing administrator context in staging.',
      'Preview the plan and test subscriptions, invoice generation, and entitlement changes with a staging tenant.',
    ],
    example: (
      v,
    ) => `const plan = await sdk.billing.createPlan(ctx, ${JSON.stringify({ name: v.plan, priceMinor: v.price, currency: v.currency, features: [v.feature] })});
await sdk.billing.setQuota(ctx, ${JSON.stringify(v.metric)}, ${v.quota}, "monthly");`,
  },
} satisfies Record<string, SetupDomain>;
