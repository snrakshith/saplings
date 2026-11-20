import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {RunReport,SuiteResult} from './types.js';
function xmlEscape(s:string):string{return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
function esc(s:string):string{return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function junit(results:SuiteResult[]):string {
 const failed=results.filter(r=>r.status==='failed').length;
 return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="Sapling Quality" tests="${results.length}" failures="${failed}" skipped="${results.filter(r=>r.status==='skipped').length}">\n${results.map(r=>`<testcase classname="${xmlEscape(r.suite.split(':')[0]!)}" name="${xmlEscape(r.suite)}" time="${(r.durationMs/1000).toFixed(3)}">${r.status==='failed'?`<failure message="${xmlEscape(r.error??r.summary)}"/>`:r.status==='skipped'?`<skipped message="${xmlEscape(r.summary)}"/>`:''}</testcase>`).join('\n')}\n</testsuite>`;
}
function html(report:RunReport):string {
 const rows=report.results.map(r=>`<tr><td>${esc(r.suite)}</td><td class="${r.status}">${r.status}</td><td>${esc(r.engine)}</td><td>${(r.durationMs/1000).toFixed(2)}s</td><td>${esc(r.summary)}</td></tr>`).join('');
 return `<!doctype html><html lang="en"><meta charset="utf-8"/><title>${esc(report.project)} quality report</title><style>body{font:15px system-ui;margin:32px;max-width:1300px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;text-align:left;padding:12px}th{background:#f1f5f9}.passed{color:#166534}.failed{color:#b91c1c}.skipped{color:#666}h1{color:#102c53}</style><h1>${esc(report.project)} — Quality Report</h1><p>${esc(report.environment)} / ${esc(report.profile)} | passed ${report.summary.passed} · failed ${report.summary.failed} · skipped ${report.summary.skipped}</p><table><thead><tr><th>Suite</th><th>Status</th><th>Engine</th><th>Duration</th><th>Summary</th></tr></thead><tbody>${rows}</tbody></table></html>`;
}
export async function writeReports(report:RunReport,dir:string):Promise<string[]> {
 await mkdir(dir,{recursive:true});const files=[path.join(dir,'report.json'),path.join(dir,'report.html'),path.join(dir,'junit.xml')];
 await Promise.all([writeFile(files[0]!,JSON.stringify(report,null,2)),writeFile(files[1]!,html(report)),writeFile(files[2]!,junit(report.results))]);
 return files;
}
