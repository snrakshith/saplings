import type { CheckResult, Metric, RunContext, SuiteId, SuiteResult, Status } from './types.js';
export function result(
  suite: SuiteId,
  engine: string,
  start: number,
  status: Status,
  summary: string,
  extras: Partial<SuiteResult> = {},
): SuiteResult {
  return {
    suite,
    engine,
    status,
    summary,
    startedAt: new Date(start).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    ...extras,
  };
}
export function skipped(suite: SuiteId, engine: string, reason: string): SuiteResult {
  return result(suite, engine, Date.now(), 'skipped', reason);
}
export function metrics(values: Record<string, number>): Record<string, Metric> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }]));
}
export function evaluateChecks(checks: CheckResult[]): Status {
  return checks.every((c) => c.passed) ? 'passed' : 'failed';
}
export function thresholdChecks(ctx: RunContext, measured: Record<string, number>): CheckResult[] {
  return Object.entries(ctx.config.thresholds ?? {})
    .filter(([name]) => Object.hasOwn(measured, name))
    .flatMap(([name, threshold]) => {
      const value = measured[name]!;
      const checks: CheckResult[] = [];
      if (threshold?.max !== undefined)
        checks.push({
          name: `${name} <= ${threshold.max}`,
          passed: value <= threshold.max,
          detail: String(value),
        });
      if (threshold?.min !== undefined)
        checks.push({
          name: `${name} >= ${threshold.min}`,
          passed: value >= threshold.min,
          detail: String(value),
        });
      return checks;
    });
}
export function errorResult(
  suite: SuiteId,
  engine: string,
  start: number,
  error: unknown,
): SuiteResult {
  const message = error instanceof Error ? error.message : String(error);
  return result(suite, engine, start, 'failed', message, { error: message });
}
