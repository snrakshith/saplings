import path from 'node:path';
import {stat,readdir} from 'node:fs/promises';
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {result,skipped,metrics,type RunContext,type SuiteResult,type CheckResult} from '@saplings/quality-core';
async function files(dir:string):Promise<string[]>{
 const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(async e=>{const full=path.join(dir,e.name);return e.isDirectory()?files(full):e.isFile()?[full]:[];}))).flat();
}
export async function runBundle(ctx:RunContext):Promise<SuiteResult>{
 const start=Date.now(),cfg=ctx.config.frontend!.bundle;
 if(!cfg)return skipped('frontend:bundle','gzip / fs','Configure frontend.bundle.directory and maxTotalGzipKb');
 const dir=path.resolve(cfg.directory),include=cfg.extensions??['.js','.css'];const artifacts=await files(dir);
 const chosen=artifacts.filter(f=>include.some(ext=>f.endsWith(ext)));
 let rawBytes=0,gzipBytes=0;for(const f of chosen){const data=await readFile(f);rawBytes+=data.length;gzipBytes+=gzipSync(data).length;}
 const measured={'bundle.rawKb':rawBytes/1024,'bundle.gzipKb':gzipBytes/1024,'bundle.fileCount':chosen.length};
 const checks:CheckResult[]=[{name:'Build assets found',passed:chosen.length>0},{name:`Total gzip <= ${cfg.maxTotalGzipKb} KB`,passed:measured['bundle.gzipKb']<=cfg.maxTotalGzipKb,detail:`${measured['bundle.gzipKb'].toFixed(1)} KB`}];
 return result('frontend:bundle','gzip / Node fs',start,checks.every(c=>c.passed)?'passed':'failed','Bundle asset budgets inspected',{checks,metrics:metrics(measured)});
}
