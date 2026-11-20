import {
  execFileSafe,
  runExternal,
  result,
  skipped,
  metrics,
  evaluateChecks,
  thresholdChecks,
  type BackendSuite,
  type CheckResult,
  type RunContext,
  type SuiteResult,
} from '@saplings/quality-core';
async function get(url: string, options?: RequestInit, timeoutMs = 15000): Promise<Response> {
  return fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
}
async function externalSuite(
  ctx: RunContext,
  name: BackendSuite,
  defaultCommand?: { command: string; args: string[] },
  engine = 'external',
): Promise<SuiteResult> {
  const started = Date.now(),
    spec = ctx.config.backend!.custom?.[name] ?? defaultCommand;
  if (!spec)
    return skipped(
      `backend:${name}`,
      engine,
      `${name} requires an application-specific command/fixture configured in backend.custom.${name}`,
    );
  const r = await runExternal(spec, ctx.config.safety?.timeoutMs ?? 300000);
  return result(
    `backend:${name}`,
    engine,
    started,
    r.code === 0 ? 'passed' : 'failed',
    r.code === 0 ? 'External scenario succeeded' : 'External scenario failed',
    { stdout: r.stdout, stderr: r.stderr },
  );
}
export async function runObservability(ctx: RunContext): Promise<SuiteResult> {
  const started = Date.now(),
    cfg = ctx.config.backend!;
  const checks: CheckResult[] = [];
  const measured: Record<string, number> = {};
  for (const [name, route] of [
    ['health', cfg.healthPath ?? '/health'],
    ['metrics', cfg.metricsPath ?? '/metrics'],
  ] as const) {
    const begin = Date.now();
    const res = await get(new URL(route, cfg.baseUrl).href);
    measured[`${name}.responseMs`] = Date.now() - begin;
    const text = await res.text();
    checks.push({
      name: `${name} endpoint returns 2xx`,
      passed: res.ok,
      detail: `HTTP ${res.status}`,
    });
    checks.push({ name: `${name} endpoint has nonempty response`, passed: text.trim().length > 0 });
    if (name === 'metrics')
      checks.push({
        name: 'Prometheus metric samples present',
        passed: /^[a-zA-Z_:][a-zA-Z0-9_:]*\{?.*\}?\s+[0-9.+eE-]+/m.test(text),
      });
  }
  checks.push(...thresholdChecks(ctx, measured));
  return result(
    'backend:observability',
    'HTTP / Prometheus',
    started,
    evaluateChecks(checks),
    'Validated operational endpoints',
    { checks, metrics: metrics(measured) },
  );
}
export async function runConcurrency(ctx: RunContext): Promise<SuiteResult> {
  const started = Date.now(),
    cfg = ctx.config.backend!,
    scenario = cfg.concurrency;
  if (!scenario)
    return skipped(
      'backend:concurrency',
      'fetch',
      'Configure backend.concurrency with idempotency criteria',
    );
  const count = Math.min(Math.max(scenario.requests ?? 10, 2), 200);
  const key = scenario.idempotencyKey ?? `quality-${crypto.randomUUID()}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (scenario.idempotencyHeader) headers[scenario.idempotencyHeader] = key;
  const requests = Array.from({ length: count }, () =>
    get(new URL(scenario.path, cfg.baseUrl).href, {
      method: scenario.method ?? 'POST',
      headers,
      body: JSON.stringify(scenario.body ?? {}),
    }),
  );
  const responses = await Promise.all(requests);
  const statuses = responses.map((r) => r.status);
  const expected = scenario.expectedStatuses ?? [200, 201, 202];
  const checks: CheckResult[] = [
    {
      name: 'Every concurrent response has an allowed status',
      passed: statuses.every((s) => expected.includes(s)),
      detail: statuses.join(','),
    },
  ];
  if (scenario.responseIdField) {
    const bodies = await Promise.all(responses.map((r) => r.json().catch(() => ({}))));
    const ids = bodies.map((body: any) =>
      scenario.responseIdField!.split('.').reduce((current: any, part) => current?.[part], body),
    );
    checks.push({
      name: `Stable idempotent ${scenario.responseIdField} under concurrency`,
      passed: ids.every((id) => id !== undefined && id === ids[0]),
      detail: `unique values: ${new Set(ids).size}`,
    });
  }
  return result(
    'backend:concurrency',
    'fetch concurrency',
    started,
    evaluateChecks(checks),
    'Completed concurrent requests with application-defined assertions',
    { checks, metrics: metrics({ 'requests.total': count }) },
  );
}
export async function runContract(ctx: RunContext): Promise<SuiteResult> {
  const schema = ctx.config.backend!.openapi;
  if (!schema) return externalSuite(ctx, 'contract', undefined, 'Schemathesis');
  return externalSuite(
    ctx,
    'contract',
    { command: 'st', args: ['run', schema, '--url', ctx.config.backend!.baseUrl] },
    'Schemathesis',
  );
}
export async function runSecurity(ctx: RunContext): Promise<SuiteResult> {
  const started = Date.now(),
    cfg = ctx.config.backend!,
    specs: Array<{ name: string; command: string; args: string[] }> = [];
  if (cfg.security?.semgrep)
    specs.push({
      name: 'semgrep',
      command: 'semgrep',
      args: ['scan', '--config', 'auto', '--error', '.'],
    });
  if (cfg.security?.trivyTarget)
    specs.push({
      name: 'trivy',
      command: 'trivy',
      args: ['fs', '--exit-code', '1', '--severity', 'HIGH,CRITICAL', cfg.security.trivyTarget],
    });
  if (cfg.security?.zapPlan)
    specs.push({
      name: 'zap',
      command: 'zap.sh',
      args: ['-cmd', '-autorun', cfg.security.zapPlan],
    });
  if (!specs.length) return externalSuite(ctx, 'security', undefined, 'Semgrep / Trivy / ZAP');
  const checks: CheckResult[] = [],
    output: string[] = [];
  for (const spec of specs) {
    const run = await execFileSafe(spec.command, spec.args, {
      timeoutMs: ctx.config.safety?.timeoutMs ?? 600000,
    });
    checks.push({ name: spec.name, passed: run.code === 0, detail: `exit ${run.code}` });
    output.push(`== ${spec.name} ==\n${run.stdout}\n${run.stderr}`);
  }
  return result(
    'backend:security',
    'Semgrep / Trivy / ZAP',
    started,
    evaluateChecks(checks),
    'Security scanners executed',
    { checks, stdout: output.join('\n') },
  );
}
export async function runCustomBackend(ctx: RunContext, name: BackendSuite): Promise<SuiteResult> {
  return externalSuite(ctx, name);
}
