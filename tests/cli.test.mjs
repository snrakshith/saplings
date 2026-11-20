import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

const executable = fileURLToPath(new URL('../packages/cli/dist/index.js', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [executable, ...args], { encoding: 'utf8' });

test('the sapling executable exposes catalog, readiness, and quality commands', () => {
  assert.match(run('--help').stdout, /quality/);
  assert.ok(JSON.parse(run('catalog').stdout).saasFeatures.length);
  assert.ok(JSON.parse(run('doctor').stdout).warnings.length);
  assert.match(run('quality', '--help').stdout, /sapling quality run/);
  const suites = run('quality', 'list');
  assert.equal(suites.status, 0, suites.stderr);
  assert.match(suites.stdout, /Backend suites:/);
  assert.match(suites.stdout, /Frontend suites:/);
  assert.match(run('quality', 'legacy', 'list').stdout, /performance/i);
  assert.match(run('quality', 'legacy', '--help').stdout, /sapling quality legacy run/);
  const invalid = run('quality', 'unknown');
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Unknown command/);
});

test('the unified CLI writes and reads a dry-run report', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'sapling-cli-'));
  try {
    const configFile = join(outputDir, 'quality.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        name: 'cli-test',
        environment: 'local',
        outputDir,
        frontend: { baseUrl: 'http://127.0.0.1:5173', routes: ['/'] },
        profiles: { pr: ['frontend:accessibility'] },
      }),
    );
    const checked = run('quality', 'run', '--config', configFile, '--dry-run');
    assert.equal(checked.status, 0, checked.stderr);
    const [reportDir] = readdirSync(outputDir, { withFileTypes: true }).filter((f) =>
      f.isDirectory(),
    );
    const reportFile = join(outputDir, reportDir.name, 'report.json');
    const printed = run('quality', 'report', '--file', reportFile);
    assert.equal(printed.status, 0, printed.stderr);
    const report = JSON.parse(printed.stdout);
    assert.deepEqual(report, JSON.parse(readFileSync(reportFile, 'utf8')));
    assert.equal(report.results[0].suite, 'frontend:accessibility');
    assert.equal(report.results[0].status, 'skipped');
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});
