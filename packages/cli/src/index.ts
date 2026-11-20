#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { runScan, generateSarif } from '@saplings/security';
import { coverageSummary, saasFeatures, securityScanners } from '@saplings/catalog';
function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}
const command = process.argv[2] ?? 'help';
async function main() {
  if (command === 'quality') {
    const name = '@saplings/quality-cli';
    let quality: any;
    try {
      quality = await import(name);
    } catch {
      throw Error(
        'Install @saplings/quality-cli as a development dependency; or use sapling-quality directly.',
      );
    }
    await quality.main(process.argv.slice(3));
    return;
  }
  if (command === 'catalog') {
    console.log(
      JSON.stringify({ summary: coverageSummary(), saasFeatures, securityScanners }, null, 2),
    );
    return;
  }
  if (command === 'scan') {
    const path = arg('--path') ?? process.cwd();
    const url = arg('--url');
    const allow = (arg('--allow-host') ?? '').split(',').filter(Boolean);
    const output = arg('--format') ?? 'json';
    const reports = arg('--reports'),
      dns = arg('--dns-config'),
      intel = arg('--threat-intel');
    const report = await runScan({
      root: path,
      url,
      allowedHosts: allow,
      reports: reports ? JSON.parse(await fs.readFile(reports, 'utf8')) : undefined,
      dns: dns ? JSON.parse(await fs.readFile(dns, 'utf8')) : undefined,
      threatIntelligence: intel ? JSON.parse(await fs.readFile(intel, 'utf8')) : undefined,
    });
    console.log(JSON.stringify(output === 'sarif' ? generateSarif(report) : report, null, 2));
    if (
      process.argv.includes('--require-all') &&
      (report.notExecutedScannerIds.length ||
        report.failedScannerIds.length ||
        report.coverage.truncated ||
        report.coverage.findingsTruncated)
    )
      process.exitCode = 3;
    else if (report.findings.some((f) => ['high', 'critical'].includes(f.severity)))
      process.exitCode = 2;
    return;
  }
  if (command === 'doctor') {
    console.log(
      JSON.stringify(
        {
          status: 'v0.8-reference-implementation',
          warnings: [
            'No external providers or Postgres instance were validated by this CLI.',
            'In-memory state is non-durable; use transactional Postgres and shared rate state.',
            'Scanner supports static, passive, configured DNS and evidence import; no vendor check parity.',
            'Do not use raw client tenant headers as authenticated tenant identity.',
            'Configure and verify providers, resource authorization, DB RLS, WAF, testing and recovery before production.',
          ],
          coverage: coverageSummary(),
        },
        null,
        2,
      ),
    );
    return;
  }
  console.log(
    'Sapling CLI\n  catalog                         Print master feature/scanner catalog\n  scan --path . [--url URL --allow-host hostname] [--format sarif|json] [--reports FILE] [--dns-config FILE] [--threat-intel FILE] [--require-all]\n  quality [command]               Run full-stack quality (dev package)\n  doctor                          Display production-readiness warnings',
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
