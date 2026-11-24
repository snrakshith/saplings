import {
  QualityOrchestrator,
  loadQualityConfig,
  BACKEND_SUITES,
  FRONTEND_SUITES,
  type ExecutionProfile,
  type SuiteId,
} from '@saplings/quality-core';
import { cliMain, registerBackend } from '@saplings/backend-quality';
import { registerFrontend } from '@saplings/frontend-quality/register';
import { execFileSafe, suiteIds } from '@saplings/quality-core';
import { existsSync, promises as fs } from 'node:fs';
const HELP = `Sapling Quality Platform — unified React + Node.js quality CLI

Usage:
  sapling quality report --file quality-results/<run>/report.json
  sapling quality legacy run --config examples/configs/legacy-backend-quality.ts
  sapling quality list
  sapling quality doctor
  sapling quality run --config sapling.config.ts --profile pr
  sapling quality run --config sapling.config.ts --suite frontend:visual
  sapling quality run --config sapling.config.ts --scope fullstack --profile release

Options:
  --config FILE          Config in TypeScript / JS / JSON (default sapling.config.ts)
  --profile NAME         pr, main, nightly, release, scheduled, all
  --suite ID[,ID]        Explicit suites (overrides profile)
  --scope NAME           frontend, backend, fullstack
  --update-baselines     Explicitly write visual snapshots (review before commit)
  --allow-destructive    Second approval needed for chaos/recovery/fault/scalability
  --dry-run              Resolve selected suites without launching external engines
  --verbose              Print per-suite summaries

Requirements: Node >=22. External engines and Playwright browsers must be installed separately.
Exit code: 0 all selected suites passed; 1 failure or skipped critical integration; 2 invalid usage.
`;
function value(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i < 0 ? undefined : args[i + 1];
}
async function main(args: string[]) {
  if (args[0] === '--') args = args.slice(1);
  const command = args[0] ?? 'help';
  if (['help', '--help', '-h'].includes(command)) {
    console.log(HELP);
    return;
  }
  if (command === 'list') {
    console.log('Backend suites:', BACKEND_SUITES.join(', '));
    console.log('Frontend suites:', FRONTEND_SUITES.join(', '));
    return;
  }
  if (command === 'doctor') {
    let missing = 0;
    for (const [engine, args] of [
      ['k6', ['version']],
      ['kubectl', ['version', '--client']],
      ['lhci', ['--version']],
      ['semgrep', ['--version']],
      ['st', ['--version']],
      ['trivy', ['--version']],
      ['zap.sh', ['-version']],
    ] as const) {
      try {
        const run = await execFileSafe(engine, [...args], { timeoutMs: 8000 });
        console.log(
          `${run.code === 0 ? 'OK' : 'WARN'} ${engine}: ${run.code === 0 ? 'ready' : 'nonzero exit'}`,
        );
        if (run.code !== 0) missing++;
      } catch {
        console.log(`MISSING ${engine} (needed only when its suite is configured)`);
        missing++;
      }
    }
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch();
      await browser.close();
      console.log('OK Playwright Chromium');
    } catch {
      console.log(
        'MISSING Playwright Chromium: run npm exec playwright@1.56.1 -- install chromium',
      );
      missing++;
    }
    console.log(
      `${missing} optional engine checks unavailable. This does not invalidate unconfigured suites.`,
    );
    return;
  }
  if (command === 'report') {
    const file = value(args, '--file');
    if (!file || !existsSync(file)) throw Error('Use report --file <report.json>');
    console.log(await fs.readFile(file, 'utf8'));
    return;
  }
  if (command === 'legacy') {
    await cliMain(args.slice(1));
    return;
  }
  if (command !== 'run') throw new Error(`Unknown command '${command}'`);
  const config = await loadQualityConfig(value(args, '--config') ?? 'sapling.config.ts');
  const profile = (value(args, '--profile') ?? 'pr') as ExecutionProfile;
  if (!['pr', 'main', 'nightly', 'release', 'scheduled', 'all'].includes(profile))
    throw new Error(`Invalid profile: ${profile}`);
  const rawSuites = value(args, '--suite');
  const scope = value(args, '--scope') ?? 'fullstack';
  if (!['frontend', 'backend', 'fullstack'].includes(scope))
    throw new Error(`Invalid scope: ${scope}`);
  const candidates = rawSuites
    ? (rawSuites.split(',').map((s) => s.trim()) as SuiteId[])
    : (config.profiles?.[profile] ?? suiteIds(config));
  const suites = candidates.filter((id) => scope === 'fullstack' || id.startsWith(`${scope}:`));
  if (!suites.length) throw new Error('No suites selected for this profile and scope');
  const orchestrator = new QualityOrchestrator();
  registerBackend(orchestrator);
  registerFrontend(orchestrator);
  const run = await orchestrator.run(config, {
    profile,
    suites,
    updateBaselines: args.includes('--update-baselines'),
    allowDestructive: args.includes('--allow-destructive'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
  });
  for (const entry of run.results) {
    console.log(
      `${entry.status === 'passed' ? 'PASS' : entry.status === 'failed' ? 'FAIL' : 'SKIP'} ${entry.suite.padEnd(30)} ${entry.summary}`,
    );
    if (args.includes('--verbose') && entry.stderr) console.error(entry.stderr.slice(-1800));
  }
  console.log(
    `\nReport: ${run.artifacts[0]}\nPassed ${run.summary.passed}; failed ${run.summary.failed}; skipped ${run.summary.skipped}`,
  );
  if (args.includes('--dry-run')) return;
  if (run.summary.failed > 0) process.exitCode = 1;
  else if (run.summary.skipped > 0) process.exitCode = 1; // fail closed; skippable suites must not be silently green
}
export async function runQualityCli(args: string[]) {
  try {
    await main(args);
  } catch (error) {
    console.error('Sapling Quality:', error instanceof Error ? error.message : error);
    process.exitCode = 2;
  }
}
