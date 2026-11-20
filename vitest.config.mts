import {defineConfig} from 'vitest/config';

/** SDK core regression suite. Live DB/cloud suites and UI hooks run separately. */
export default defineConfig({
  test: {
    name: 'sapling-sdk',
    include: ['tests/*.test.mjs'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    environment: 'node',
    pool: 'forks',
    maxWorkers: 2,
    fileParallelism: true,
    isolate: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      enabled: false,
      reportsDirectory: './coverage',
      reporter: ['text-summary', 'json-summary', 'lcov', 'html'],
      // Tests import tsc-emitted NodeNext modules; measure what actually executes.
      // TypeScript source maps are emitted by the workspace build.
      include: ['packages/**/dist/**/*.{js,mjs}'],
      exclude: ['**/*.d.ts', '**/*.test.*', '**/node_modules/**'],
      // Baseline first; CI records real percentages. No invented thresholds.
    },
  },
});
