import type { ActorContext, createSapling } from '@saplings/sdk';

export type Check = {
  title: string;
  description: string;
  run: (
    sdk: ReturnType<typeof createSapling>,
    ctx: ActorContext,
  ) => Promise<Record<string, unknown>>;
};
