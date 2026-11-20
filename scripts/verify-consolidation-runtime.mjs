/** Executes compiled package smoke without Vitest. Only code-level confidence, not coverage/prod certification. */
import { cases } from './consolidation-fixtures.mjs';
let passed = 0;
for (const scenario of cases) {
  try {
    await scenario.run();
    passed++;
    console.log('PASS ' + scenario.name);
  } catch (error) {
    console.error('FAIL ' + scenario.name, error);
    process.exitCode = 1;
    break;
  }
}
console.log(
  JSON.stringify(
    {
      source: 'compiled local packages',
      framework: 'Node assertions (Vitest runtime unavailable)',
      passed,
      total: cases.length,
      verifiedUnderVitest: false,
    },
    null,
    2,
  ),
);
