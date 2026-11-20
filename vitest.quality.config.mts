import {defineConfig} from 'vitest/config';

/** Operator-authorized quality fixtures launched in a separate bounded process. */
export default defineConfig({
  test: {
    name: 'sapling-quality-fixture',
    include: ['**/*.test.mjs'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    isolate: true,
    testTimeout: 120_000,
    hookTimeout: 30_000,
  },
});
