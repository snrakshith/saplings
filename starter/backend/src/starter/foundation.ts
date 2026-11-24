import { setup } from '../config/sapling.js';
import type { Check } from './types.js';

export const foundation = {
  workspace: {
    title: 'Project and workspace setup',
    description: 'Create a tenant workspace and a project linked to it.',
    async run(sdk, ctx) {
      const workspace = await sdk.workspaces.create(ctx, { name: setup.workspace.workspace });
      const project = await sdk.projects.create(ctx, {
        name: setup.workspace.project,
        workspaceId: workspace.id,
      });
      return {
        workspace: workspace.name,
        project: project.name,
        linked: project.workspaceId === workspace.id,
      };
    },
  },
  flags: {
    title: 'Feature flags',
    description: 'Save a rollout and evaluate it for the configured subject.',
    async run(sdk, ctx) {
      const { flag, subject, enabled, rollout } = setup.flags;
      await sdk.flags.set(ctx, { key: flag, enabled, rollout });
      return { flag, subject, ...(await sdk.flags.evaluate(ctx, flag, subject)) };
    },
  },
  analytics: {
    title: 'Product analytics',
    description: 'Record a product event and count events under the current tenant.',
    async run(sdk, ctx) {
      const { event, subject } = setup.analytics;
      await sdk.analytics.track(ctx, { name: event, subjectId: subject });
      return { event, ...(await sdk.analytics.count(ctx, { name: event })) };
    },
  },
  storage: {
    title: 'File storage and media',
    description: 'Round-trip a file and its media type through the configured storage adapter.',
    async run(sdk, ctx) {
      const key = setup.storage.object;
      const text = 'Saplings Starter file';
      await sdk.storage.upload(ctx, {
        key,
        data: new TextEncoder().encode(text),
        metadata: { contentType: 'text/plain' },
      });
      const file = await sdk.storage.download(ctx, key);
      return {
        key,
        contentType: file?.metadata.contentType,
        matches: new TextDecoder().decode(file?.data) === text,
      };
    },
  },
} satisfies Record<string, Check>;
