import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { parseVitestReport } from './vitest-runner.js';
import { command, safeFile } from './process.js';
import type { BackendQualityConfig, QualitySuiteConfig } from '../core/config.js';
import { thresholdFailures, type Metrics } from '../core/results.js';
const k6file = fileURLToPath(new URL('../../assets/http.k6.js', import.meta.url));
const require = createRequire(import.meta.url);
export async function external(
  c: BackendQualityConfig,
  s: QualitySuiteConfig,
): Promise<{ failures: string[]; metrics?: Metrics }> {
  const target = s.target ? c.targets[s.target] : undefined;
  const probe = s.probes?.[0] ?? { path: '/health', statuses: [200] };
  const url = target ? new URL(probe.path, target).href : '';
  const ms =
    s.timeoutMs ??
    Math.min(
      86400000,
      ((s.stages?.reduce((n, x) => n + x.seconds, 0) ?? s.durationSeconds ?? 60) + 120) * 1000,
    );
  const run = (bin: string, args: string[], env: Record<string, string> = {}) =>
    command(bin, args, ms, env);
  const check = (code: number) => ({
    failures: code === 0 ? [] : ['Engine exited with code ' + code],
  });
  const vitestFixture = async (script: string, env: Record<string, string> = {}) => {
    const file = await safeFile(script),
      root = process.cwd(),
      filter = relative(root, file);
    // Resolve the installed test runner as a package dependency, not an arbitrary shell executable.
    const cli = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
    const temp = await mkdtemp(join(tmpdir(), 'sapling-vitest-quality-'));
    const output = join(temp, 'results.json');
    try {
      const r = await run(
        process.execPath,
        [
          cli,
          'run',
          '--config',
          'vitest.quality.config.mts',
          '--reporter=json',
          '--outputFile',
          output,
          filter,
        ],
        env,
      );
      try {
        if ((await stat(output)).size > 2_000_000) return { failures: ['Vitest result too large'] };
        return parseVitestReport(JSON.parse(await readFile(output, 'utf8')), r.code);
      } catch {
        return { failures: ['Vitest did not generate a valid report (exit ' + r.code + ')'] };
      }
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  };
  switch (s.engine) {
    case 'k6': {
      const r = await run('k6', ['run', k6file], {
        SAPLING_TARGET: target!,
        SAPLING_PROBES: JSON.stringify(s.probes ?? [probe]),
        SAPLING_STAGES: JSON.stringify(
          s.stages ?? [{ concurrency: s.concurrency ?? 4, seconds: s.durationSeconds ?? 30 }],
        ),
        SAPLING_THRESHOLDS: JSON.stringify(s.thresholds ?? {}),
      });
      return check(r.code);
    }
    case 'autocannon': {
      if (probe.headers && Object.keys(probe.headers).length)
        throw Error('Use k6/native for authenticated probes (avoid command-line secrets)');
      if ((probe.statuses ?? [200]).some((x) => x !== 200))
        throw Error('Autocannon supports 200 probes only');
      const r = await run('autocannon', [
        '-j',
        '-c',
        String(s.concurrency ?? 4),
        '-d',
        String(s.durationSeconds ?? 10),
        url,
      ]);
      if (r.code) return check(r.code);
      let v;
      try {
        v = JSON.parse(r.stdout);
      } catch {
        throw Error('Invalid Autocannon JSON');
      }
      const metrics = {
        requests: Number(v.requests?.total),
        errors: Number(v.errors ?? 0) + Number(v.timeouts ?? 0) + Number(v.non2xx ?? 0),
        p95Ms: Number(v.latency?.p97_5 ?? v.latency?.p99),
        p99Ms: Number(v.latency?.p99),
        requestsPerSecond: Number(v.requests?.average),
        durationMs: Number(v.duration) * 1000,
      };
      if (Object.values(metrics).some((x) => !Number.isFinite(x) || x < 0))
        throw Error('Incomplete Autocannon metrics');
      return { metrics, failures: thresholdFailures(metrics, s.thresholds) };
    }
    case 'zap': {
      const r = await run('zap-baseline.py', ['-t', target!, '-m', '1']);
      return check(r.code);
    }
    case 'schemathesis': {
      if (!s.script) throw Error('Provide OpenAPI file');
      const file = await safeFile(s.script);
      const r = await run('schemathesis', ['run', file, '--url', target!, '--checks', 'all']);
      return check(r.code);
    }
    case 'testcontainers':
    case 'vitest':
    case 'node-test':
    case 'toxiproxy': {
      if (!s.script) throw Error('Provide operator-authored Vitest test file');
      return vitestFixture(s.script, { SAPLING_QUALITY_TARGET: target ?? '' });
    }
    case 'kubectl': {
      const ns = s.namespace!;
      if (s.replicas !== undefined) {
        if (!s.deployment) throw Error('Deployment required');
        const get = await run('kubectl', [
          '-n',
          ns,
          'get',
          'deployment',
          s.deployment,
          '-o',
          'jsonpath={.spec.replicas}',
        ]);
        const original = get.stdout.trim();
        if (get.code || !/^\d+$/.test(original))
          throw Error('Cannot determine original replica count');
        let code = 1;
        try {
          const scale = await run('kubectl', [
            '-n',
            ns,
            'scale',
            'deployment',
            s.deployment,
            '--replicas=' + s.replicas,
          ]);
          if (!scale.code) {
            const rollout = await run('kubectl', [
              '-n',
              ns,
              'rollout',
              'status',
              'deployment/' + s.deployment,
              '--timeout=120s',
            ]);
            code = rollout.code;
          }
        } finally {
          const restore = await run('kubectl', [
            '-n',
            ns,
            'scale',
            'deployment',
            s.deployment,
            '--replicas=' + original,
          ]);
          if (restore.code)
            throw Error('Replica restoration failed: operator intervention required');
          const rollout = await run('kubectl', [
            '-n',
            ns,
            'rollout',
            'status',
            'deployment/' + s.deployment,
            '--timeout=120s',
          ]);
          if (rollout.code) throw Error('Restoration rollout failed');
        }
        return check(code);
      }
      if (!s.deployment) throw Error('Deployment required');
      return check(
        (
          await run('kubectl', [
            '-n',
            ns,
            'rollout',
            'status',
            'deployment/' + s.deployment,
            '--timeout=120s',
          ])
        ).code,
      );
    }
    case 'chaos-mesh': {
      if (!s.script)
        throw Error('Provide operator-authored experiment test file with assertions and cleanup');
      return vitestFixture(s.script, {
        SAPLING_QUALITY_NAMESPACE: s.namespace!,
        SAPLING_QUALITY_TARGET: target ?? '',
      });
    }
    default:
      throw Error('Unsupported engine');
  }
}
