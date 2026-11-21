import type { SetupDomain } from './types.js';

export const foundation = {
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
    ) => `await sdk.flags.set(ctx, ${JSON.stringify({ key: v.flag, enabled: v.enabled, rollout: v.rollout })});
const decision = await sdk.flags.evaluate(ctx, ${JSON.stringify(v.flag)}, ${JSON.stringify(v.subject)});`,
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
    ) => `await sdk.analytics.track(ctx, ${JSON.stringify({ name: v.event, subjectId: v.subject })});
const result = await sdk.analytics.count(ctx, { name: ${JSON.stringify(v.event)} });`,
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
    example: (
      v,
    ) => `const storage = { enabled: true, provider: ${JSON.stringify(v.provider)} } as const;
await sdk.storage.upload(ctx, { key: ${JSON.stringify(v.object)}, data: new TextEncoder().encode("test") });
const result = await sdk.storage.download(ctx, ${JSON.stringify(v.object)});`,
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
    ) => `const workspace = await sdk.workspaces.create(ctx, { name: ${JSON.stringify(v.workspace)} });
const project = await sdk.projects.create(ctx, {
  name: ${JSON.stringify(v.project)},
  workspaceId: workspace.id,
});`,
  },
} satisfies Record<string, SetupDomain>;
