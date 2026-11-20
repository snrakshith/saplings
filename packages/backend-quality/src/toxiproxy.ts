import {
  assertTargetAllowed,
  result,
  skipped,
  type RunContext,
  type SuiteResult,
  type CheckResult,
} from '@saplings/quality-core';
/** Injects latency into an existing Toxiproxy proxy, verifies the probe and removes the toxic in finally. */
export async function runToxiproxy(ctx: RunContext): Promise<SuiteResult> {
  const started = Date.now(),
    cfg = ctx.config.backend!,
    options = cfg.resilience;
  if (!options?.toxiproxyUrl || !options.proxyName)
    return skipped(
      'backend:resilience',
      'Toxiproxy',
      'Set resilience.toxiproxyUrl and proxyName; dependencies must route via the proxy',
    );
  assertTargetAllowed(ctx.config, options.toxiproxyUrl);
  const prefix = `${options.toxiproxyUrl.replace(/\/$/, '')}/proxies/${encodeURIComponent(options.proxyName)}/toxics`;
  const toxicName = `sapling-quality-${Date.now()}`;
  let created = false;
  const checks: CheckResult[] = [];
  const latency = options.latencyMs ?? 1000;
  try {
    const createdResponse = await fetch(prefix, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: toxicName,
        type: 'latency',
        stream: 'downstream',
        toxicity: 1,
        attributes: { latency, jitter: 0 },
      }),
    });
    if (!createdResponse.ok)
      throw new Error(
        `Could not inject toxic: HTTP ${createdResponse.status} ${await createdResponse.text()}`,
      );
    created = true;
    const now = Date.now();
    const check = await fetch(
      new URL(options.probePath ?? cfg.healthPath ?? '/health', cfg.baseUrl),
      { redirect: 'error', signal: AbortSignal.timeout(15000) },
    ).catch(() => null);
    const elapsed = Date.now() - now;
    // Successful probe or expected application failure is recorded. This is a fault-injection result, not a guarantee of graceful degradation.
    checks.push({
      name: 'Dependency fault injection and probe completed',
      passed: check !== null && (options.expectedStatuses ?? [200]).includes(check.status),
      detail: `HTTP ${check?.status ?? 'timeout'}, elapsed ${elapsed}ms`,
    });
  } finally {
    if (created) {
      const cleaned = await fetch(`${prefix}/${encodeURIComponent(toxicName)}`, {
        method: 'DELETE',
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);
      checks.push({
        name: 'Injected toxic removed',
        passed: cleaned?.ok === true,
        detail: `HTTP ${cleaned?.status ?? 'failed'}`,
      });
    }
  }
  return result(
    'backend:resilience',
    'Toxiproxy',
    started,
    checks.every((c) => c.passed) ? 'passed' : 'failed',
    'Injected and cleaned network fault; app-specific degradation assertions should be added',
    { checks },
  );
}
