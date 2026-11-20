import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config.mts';

/** Explicit execution only. DB, Valkey, AWS, transport and React deps may be absent. */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      name: 'sapling-integration',
      include: ['tests/integration/**/*.test.mjs'],
      fileParallelism: false,
      maxWorkers: 1,
      testTimeout: 120_000,
      hookTimeout: 60_000,
    },
  }),
);
