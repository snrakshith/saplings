import type { Finding, ScannerAdapter, ScanOptions } from './scanner.js';
import { promises as fs } from 'node:fs';
/** Import an already-produced, trusted SARIF report (e.g. SAST/IaC/SCA from CI). Does not execute commands. */
export class SarifReportAdapter implements ScannerAdapter {
  constructor(
    private scannerId: string,
    private reportPath: string,
    private maxBytes = 8_000_000,
  ) {}
  async scan(_options: Readonly<ScanOptions>): Promise<Finding[]> {
    const stat = await fs.stat(this.reportPath);
    if (!stat.isFile() || stat.size > this.maxBytes) throw new Error('Report exceeds size limit');
    const report = JSON.parse(await fs.readFile(this.reportPath, 'utf8')) as {
      runs?: { results?: any[] }[];
    };
    if (
      !Array.isArray(report.runs) ||
      !report.runs.length ||
      report.runs.some(
        (run: any) =>
          !run ||
          !Array.isArray(run.results) ||
          run.invocations?.some((i: any) => i.executionSuccessful === false),
      )
    )
      throw new Error('Invalid SARIF report');
    const output: Finding[] = [];
    for (const run of report.runs)
      for (const result of run.results ?? []) {
        if (output.length >= 2000) throw Error('SARIF finding limit exceeded');
        const checkId = String(result.ruleId ?? 'unknown').slice(0, 150);
        const location = String(
          result.locations?.[0]?.physicalLocation?.artifactLocation?.uri ?? 'external-report',
        ).slice(0, 500);
        output.push({
          id: `${this.scannerId}:${output.length + 1}`,
          scannerId: this.scannerId,
          checkId,
          severity:
            result.level === 'error' ? 'high' : result.level === 'warning' ? 'medium' : 'info',
          title: `External scanner rule ${checkId}`,
          location,
          evidence: 'Review trusted source report',
          confidence: 'medium',
          remediation: 'Review source scanner guidance and verify independently.',
        });
      }
    return output;
  }
}
