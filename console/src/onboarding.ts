/** Shared form definitions for the tenant's optional SDK integrations. */
type FieldBase = { key: string; label: string; hint?: string };
export type SetupField = FieldBase &
  (
    | { type: 'key' | 'text' | 'url' | 'env'; initial: string }
    | { type: 'number'; initial: number; min: number; max: number }
    | { type: 'choice'; initial: string; options: readonly string[] }
    | { type: 'boolean'; initial: boolean }
  );
export type SetupValue = string | number | boolean;
export type SetupValues = Record<string, SetupValue>;

interface SetupDomain {
  title: string;
  summary: string;
  fields: readonly SetupField[];
  steps: readonly string[];
  example: (values: SetupValues) => string;
}

const literal = JSON.stringify;

export const domains = {
  flags: {
    title: 'Feature flags',
    summary: 'Create a starter flag and preview a subject’s rollout decision.',
    fields: [
      { key: 'flag', label: 'Flag key', type: 'key', initial: 'new-checkout' },
      { key: 'enabled', label: 'Enable flag', type: 'boolean', initial: true },
      {
        key: 'rollout',
        label: 'Rollout percentage',
        type: 'number',
        initial: 100,
        min: 0,
        max: 100,
      },
      { key: 'subject', label: 'Test subject', type: 'key', initial: 'staging-user' },
    ],
    steps: [
      'Create the flag from an authorized server context with flags:write.',
      'Evaluate it with a stable subject ID, then confirm the result in your staging app.',
    ],
    example: (
      v,
    ) => `await sdk.flags.set(ctx, ${literal({ key: v.flag, enabled: v.enabled, rollout: v.rollout })});
const decision = await sdk.flags.evaluate(ctx, ${literal(v.flag)}, ${literal(v.subject)});`,
  },
  analytics: {
    title: 'Product analytics',
    summary: 'Define a first event and verify that the SDK can record and count it.',
    fields: [
      { key: 'event', label: 'Event name', type: 'key', initial: 'onboarding.completed' },
      { key: 'subject', label: 'Test subject', type: 'key', initial: 'staging-user' },
    ],
    steps: [
      'Instrument the corresponding action on your server and use a stable subject ID.',
      'Trigger it in staging and check the event count before building funnels or retention reports.',
    ],
    example: (
      v,
    ) => `await sdk.analytics.track(ctx, ${literal({ name: v.event, subjectId: v.subject })});
const result = await sdk.analytics.count(ctx, { name: ${literal(v.event)} });`,
  },
  notifications: {
    title: 'Notifications and webhooks',
    summary: 'Prepare a notification adapter and an event delivery test.',
    fields: [
      {
        key: 'channel',
        label: 'Notification channel',
        type: 'choice',
        initial: 'email',
        options: ['email', 'sms', 'push', 'inapp'],
      },
      {
        key: 'endpoint',
        label: 'HTTPS webhook endpoint',
        type: 'url',
        initial: '',
        hint: 'Use the endpoint owned by your staging application.',
      },
      {
        key: 'secretRef',
        label: 'Signing secret environment variable',
        type: 'env',
        initial: 'WEBHOOK_SIGNING_SECRET',
      },
    ],
    steps: [
      'Supply a notifications adapter in providers.notifications and register the HTTPS endpoint with the worker.',
      'Load the signing secret in the application, send a test message, and inspect receiver logs for delivery and signature verification.',
    ],
    example: (v) => `// Supply this configuration when creating the SDK.
const signingSecret = process.env[${literal(v.secretRef)}];
if (!signingSecret) throw new Error("Webhook signing secret is required");
const worker = {
  webhooks: {
    "onboarding-test": { url: ${literal(v.endpoint)}, secret: signingSecret },
  },
};

// Run after wiring the worker and notifications adapter.
await sdk.notifications.send(ctx, {
  channel: ${literal(v.channel)},
  to: testRecipient,
  body: "Saplings onboarding test",
});
await sdk.automation.enqueue(ctx, {
  type: "webhook.deliver",
  payload: { destination: "onboarding-test", payload: { type: "onboarding.test" } },
});`,
  },
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
    example: (v) => `const payments = { enabled: true, provider: ${literal(v.provider)} } as const;
const providerSecret = process.env[${literal(v.secretRef)}];
if (!providerSecret) throw new Error("Sandbox credentials are required");
// Supply providerSecret to the selected adapter.
// Register ${literal(v.endpoint)} in the provider sandbox.

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
    ) => `const plan = await sdk.billing.createPlan(ctx, ${literal({ name: v.plan, priceMinor: v.price, currency: v.currency, features: [v.feature] })});
await sdk.billing.setQuota(ctx, ${literal(v.metric)}, ${v.quota}, "monthly");`,
  },
  storage: {
    title: 'File storage and media',
    summary: 'Choose a storage backend and define a tenant-scoped file check.',
    fields: [
      {
        key: 'provider',
        label: 'Storage backend',
        type: 'choice',
        initial: 'memory',
        options: ['memory', 'custom'],
      },
      { key: 'object', label: 'Test object key', type: 'key', initial: 'onboarding-test.txt' },
    ],
    steps: [
      'For persistent storage supply a StorageAdapter. Set tenant object authorization and configure media transforms where needed.',
      'Upload and download a test object in staging, then verify another tenant cannot read it.',
    ],
    example: (v) => `const storage = { enabled: true, provider: ${literal(v.provider)} } as const;
await sdk.storage.upload(ctx, { key: ${literal(v.object)}, data: new TextEncoder().encode("test") });
const result = await sdk.storage.download(ctx, ${literal(v.object)});`,
  },
  workspace: {
    title: 'Project and workspace setup',
    summary: 'Define the SDK workspace and project records for this tenant.',
    fields: [
      { key: 'workspace', label: 'Workspace name', type: 'text', initial: '' },
      { key: 'project', label: 'Project name', type: 'text', initial: '' },
    ],
    steps: [
      'Resolve the application tenant from trusted Kingsman membership before creating records.',
      'Use the workspace and project resource APIs with the same tenant context and verify access with a second team member.',
    ],
    example: (
      v,
    ) => `const workspace = await sdk.workspaces.create(ctx, { name: ${literal(v.workspace)} });
const project = await sdk.projects.create(ctx, {
  name: ${literal(v.project)},
  workspaceId: workspace.id,
});`,
  },
  workflows: {
    title: 'Workflows and background jobs',
    summary: 'Draft a job handler, retry policy, and first worker run.',
    fields: [
      { key: 'job', label: 'Job type', type: 'key', initial: 'reports.generate' },
      { key: 'attempts', label: 'Maximum attempts', type: 'number', initial: 3, min: 1, max: 20 },
    ],
    steps: [
      'Register a handler in your server worker and make it idempotent before enabling retries.',
      'Enqueue a staging job, verify it completes, then test how the worker records a failure.',
    ],
    example: (v) => `sdk.jobs.register(${literal(v.job)}, handler);
await sdk.jobs.enqueue(ctx, ${literal(v.job)}, testPayload, {
  maxAttempts: ${v.attempts},
  idempotencyKey: testRunId,
});
// Run this in the worker.
const job = await sdk.jobs.workNext(ctx);`,
  },
  audit: {
    title: 'Audit and activity',
    summary: 'Prepare an audit check with a tenant-scoped result limit.',
    fields: [
      {
        key: 'limit',
        label: 'Maximum events to review',
        type: 'number',
        initial: 50,
        min: 1,
        max: 500,
      },
    ],
    steps: [
      'Use an audit-enabled SDK configuration and an append-only store policy in production.',
      'Perform a known staging change and check the actor, resource, and tenant on the resulting event.',
    ],
    example: (v) => `const audit = { enabled: true };
const events = await sdk.audit.list(ctx, ${v.limit});`,
  },
  governance: {
    title: 'Data management and governance',
    summary: 'Draft a collection allowlist and a retention policy.',
    fields: [
      { key: 'collection', label: 'Collection', type: 'key', initial: 'reports' },
      { key: 'days', label: 'Retention in days', type: 'number', initial: 90, min: 1, max: 3650 },
    ],
    steps: [
      'Configure the collection’s domain authorization policy. Verify imports and exports against a staging dataset.',
      'Review legal hold and deletion rules before enabling runtime retention sweeps.',
    ],
    example: (v) => `const services = {
  dataCollections: [${literal(v.collection)}],
  retentionPolicies: { [${literal(v.collection)}]: { days: ${v.days} } },
};
const held = await sdk.governance.held(ctx);`,
  },
  operations: {
    title: 'Provider operations',
    summary: 'Prepare a named driver and an idempotency key for a staging operation.',
    fields: [
      {
        key: 'operation',
        label: 'Registered operation kind',
        type: 'key',
        initial: 'deploy.staging',
      },
      {
        key: 'target',
        label: 'Staging target identifier',
        type: 'key',
        initial: 'onboarding-sandbox',
      },
      { key: 'key', label: 'Request idempotency key', type: 'key', initial: 'onboarding-check' },
    ],
    steps: [
      'Register the vetted driver under services.providerOperations and restrict its credentials to the staging target.',
      'Submit a sandbox operation with its driver-specific input, then check status and reconciliation using the returned ID.',
    ],
    example: (v) => `const operationInput = { ...driverInput, target: ${literal(v.target)} };
const operation = await sdk.providerOperations.submit(
  ctx, ${literal(v.operation)}, ${literal(v.key)}, operationInput,
);`,
  },
} satisfies Record<string, SetupDomain>;

export type DomainId = keyof typeof domains;
export type SetupDraft = { revision: number; values: SetupValues };
export type TenantSetup = Partial<Record<DomainId, SetupDraft>>;
export type PreviewResult = { enabled: boolean; variant?: string } | { count: number };

export function domainId(value: string): value is DomainId {
  return Object.hasOwn(domains, value);
}
