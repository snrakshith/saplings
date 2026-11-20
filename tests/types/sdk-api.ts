import {
  createSapling,
  defineSaplingConfig,
  type SaplingSDK,
  type ActorContext,
  type FeatureId,
  type FeatureAction,
} from '@saplings/sdk';
const sapling: SaplingSDK = createSapling(
  defineSaplingConfig({
    app: { id: 'typed', environment: 'test' },
    services: {
      domainPolicies: {
        documents: {
          read: ['title'],
          write: ['title'],
          authorize: (ctx, action, row) => ctx.actorId.length > 0 && action === 'read' && !!row,
        },
      },
    },
  }),
);
const ctx: ActorContext = { tenantId: 't', actorId: 'a' };
async function compileOnly() {
  const doc = await sapling.domains.get(ctx, 'documents', 'd');
  const result = await sapling.domains.mutate(ctx, 'documents', 'd', 'update', { title: 'New' });
  await sapling.providerWorkflows.start(ctx, 'deploy', 'release', {});
  await sapling.invokeCapability(ctx, 'SAAS-001', 'register', { email: 'a@example.com' });
  // @ts-expect-error legacy namespace intentionally removed
  sapling.expanded.domains;
  // @ts-expect-error invalid action
  await sapling.domains.mutate(ctx, 'documents', 'd', 'patch', {});
  // @ts-expect-error invalid catalog ID
  sapling.getCapability('SAAS-999');
  // @ts-expect-error action not registered for this feature
  await sapling.invokeCapability(ctx, 'SAAS-001', 'logout', {});
  // @ts-expect-error incorrect argument type
  await sapling.providerWorkflows.advance(ctx, 42);
  void [doc, result];
}
const id: FeatureId = 'SAAS-001';
const action: FeatureAction<typeof id> = 'register';
void [compileOnly, id, action];
const cashfreeConfig = defineSaplingConfig({
  app: { id: 'typed-pay', environment: 'test' },
  payments: {
    provider: 'cashfree',
    cashfree: {
      clientId: 'test',
      clientSecret: 'test',
      customer: ({ tenantId }) => ({ id: tenantId, phone: '9999999999' }),
    },
  },
});
async function typedPayment() {
  const sdk = createSapling(cashfreeConfig);
  const r = await sdk.payments.createOrder(ctx, {
    amountMinor: 100,
    currency: 'INR',
    reference: 'r',
  });
  const checkout: string | undefined = r.checkoutSessionId;
  void checkout;
  defineSaplingConfig({
    app: { id: 'bad', environment: 'test' },
    // @ts-expect-error provider selector is a closed union
    payments: { provider: 'unknown' },
  });
  // @ts-expect-error amountMinor is numeric
  await sdk.payments.createOrder(ctx, { amountMinor: '100', currency: 'INR', reference: 'r' });
}
void typedPayment;
