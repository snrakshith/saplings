import { setup } from '../config/sapling.js';
import type { Check } from './types.js';

export const commerce = {
  payments: {
    title: 'Payments',
    description: 'Create a sandbox order and confirm an idempotent retry returns the same order.',
    async run(sdk, ctx) {
      const input = {
        amountMinor: setup.billing.price,
        currency: setup.billing.currency,
        reference: 'starter-order',
        idempotencyKey: 'starter-order',
      };
      const order = await sdk.payments.createOrder(ctx, input);
      const replay = await sdk.payments.createOrder(ctx, input);
      return { provider: order.provider, status: order.status, sameOrder: order.id === replay.id };
    },
  },
  billing: {
    title: 'Billing and subscriptions',
    description: 'Create a plan, grant its entitlement, and meter one unit against its quota.',
    async run(sdk, ctx) {
      const { plan, price, currency, feature, metric, quota } = setup.billing;
      await sdk.billing.createPlan(ctx, {
        name: plan,
        priceMinor: price,
        currency,
        features: [feature],
      });
      await sdk.billing.setQuota(ctx, metric, quota);
      await sdk.billing.setEntitlement(ctx, feature, true);
      await sdk.billing.meter(ctx, metric, 1, 'monthly', 'starter-usage');
      return {
        plan,
        entitled: await sdk.billing.hasEntitlement(ctx, feature),
        ...(await sdk.billing.getUsage(ctx, metric)),
      };
    },
  },
} satisfies Record<string, Check>;
