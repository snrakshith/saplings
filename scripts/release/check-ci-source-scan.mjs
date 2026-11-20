import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateSarif, runScan } from '@saplings/security';

const root = 'packages/sdk/src';
const reviewed = JSON.parse(
  await readFile(new URL('./ci-source-scan-review.json', import.meta.url), 'utf8'),
);
const report = await runScan({ root });
console.log(JSON.stringify(generateSarif(report), null, 2));

if (
  !report.scannedFiles ||
  report.coverage.truncated ||
  report.coverage.findingsTruncated ||
  report.failedScannerIds.length
) {
  console.error('SDK source scan did not complete.');
  process.exitCode = 1;
}

for (const { checkId, location, severity, confidence } of report.findings) {
  if (severity !== 'high' && severity !== 'critical') continue;

  const entry =
    severity === 'high' && confidence === 'low'
      ? reviewed.find(
          (candidate) => candidate.checkId === checkId && candidate.location === location,
        )
      : undefined;
  if (entry) {
    const index = location.lastIndexOf(':');
    const filename = location.slice(0, index);
    const number = Number(location.slice(index + 1));
    const source = await readFile(join(root, filename), 'utf8');
    const line = source.split(/\r?\n/)[number - 1];
    if (
      line !== undefined &&
      createHash('sha256').update(line).digest('hex') === entry.lineSha256
    ) {
      console.error(`Reviewed ${checkId} at ${location}: ${entry.reason}`);
      continue;
    }
  }

  console.error(`Unreviewed ${severity} finding ${checkId} at ${location}`);
  process.exitCode = 1;
}
