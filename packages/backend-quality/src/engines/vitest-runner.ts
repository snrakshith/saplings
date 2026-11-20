/** Validate a Vitest JSON reporter artifact. Never accept exit code 0 alone as proof of tests. */
export interface VitestSummary {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  testResults: { status: string; assertionResults: { status: string }[] }[];
}
function count(x: unknown): x is number {
  return Number.isSafeInteger(x) && (x as number) >= 0;
}
export function parseVitestReport(input: unknown, exitCode: number): { failures: string[] } {
  const x = input as Partial<VitestSummary> | null;
  if (
    !x ||
    typeof x !== 'object' ||
    !count(x.numTotalTests) ||
    !count(x.numPassedTests) ||
    !count(x.numFailedTests) ||
    !count(x.numPendingTests) ||
    !count(x.numTodoTests) ||
    typeof x.success !== 'boolean' ||
    !Array.isArray(x.testResults)
  ) {
    return { failures: ['Missing or malformed Vitest JSON report'] };
  }
  if (x.numTotalTests !== x.numPassedTests + x.numFailedTests + x.numPendingTests + x.numTodoTests)
    return { failures: ['Vitest report count mismatch'] };
  if (
    exitCode !== 0 ||
    x.success !== true ||
    x.numTotalTests < 1 ||
    x.testResults.length < 1 ||
    x.testResults.reduce(
      (sum, f) => sum + (Array.isArray(f?.assertionResults) ? f.assertionResults.length : 0),
      0,
    ) !== x.numTotalTests ||
    x.numPassedTests !== x.numTotalTests ||
    x.numFailedTests ||
    x.numPendingTests ||
    x.numTodoTests ||
    x.testResults.some(
      (f) =>
        f?.status !== 'passed' ||
        !Array.isArray(f.assertionResults) ||
        f.assertionResults.some((a) => a?.status !== 'passed'),
    )
  ) {
    return {
      failures: [
        `Vitest failed, skipped or incomplete (${x.numPassedTests}/${x.numTotalTests} passed; exit ${exitCode})`,
      ],
    };
  }
  return { failures: [] };
}
