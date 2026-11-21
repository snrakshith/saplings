import type { SetupDomain } from './types.js';

export const operations = {
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
const signingSecret = process.env[${JSON.stringify(v.secretRef)}];
if (!signingSecret) throw new Error("Webhook signing secret is required");
const worker = {
  webhooks: {
    "onboarding-test": { url: ${JSON.stringify(v.endpoint)}, secret: signingSecret },
  },
};

// Run after wiring the worker and notifications adapter.
await sdk.notifications.send(ctx, {
  channel: ${JSON.stringify(v.channel)},
  to: testRecipient,
  body: "Saplings onboarding test",
});
await sdk.automation.enqueue(ctx, {
  type: "webhook.deliver",
  payload: { destination: "onboarding-test", payload: { type: "onboarding.test" } },
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
    example: (v) => `sdk.jobs.register(${JSON.stringify(v.job)}, handler);
await sdk.jobs.enqueue(ctx, ${JSON.stringify(v.job)}, testPayload, {
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
  dataCollections: [${JSON.stringify(v.collection)}],
  retentionPolicies: { [${JSON.stringify(v.collection)}]: { days: ${v.days} } },
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
    example: (v) => `const operationInput = { ...driverInput, target: ${JSON.stringify(v.target)} };
const operation = await sdk.providerOperations.submit(
  ctx, ${JSON.stringify(v.operation)}, ${JSON.stringify(v.key)}, operationInput,
);`,
  },
} satisfies Record<string, SetupDomain>;
