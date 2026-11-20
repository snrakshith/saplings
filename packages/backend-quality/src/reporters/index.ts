import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { QualityReport } from '../core/results.js';
const esc = (x: string) =>
  x.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export async function writeReports(r: QualityReport, dir: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'quality.json'), JSON.stringify(r, null, 2) + '\n');
  await writeFile(
    join(dir, 'quality.junit.xml'),
    `<?xml version="1.0"?><testsuite name="sapling-backend-quality" tests="${r.results.length}" failures="${r.results.filter((x) => x.status !== 'passed').length}">${r.results.map((x) => `<testcase classname="${esc(x.category)}" name="${esc(x.id)}" time="${x.durationMs / 1000}">${x.status === 'passed' ? '' : `<failure message="${esc(x.reason ?? x.status)}"/>`}</testcase>`).join('')}</testsuite>\n`,
  );
}
