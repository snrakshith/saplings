import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import type {QualityConfig,ExecutionProfile,RunContext,RunReport,SuiteId,SuiteRunner} from './types.js';
import {suiteIds,validateConfig} from './validation.js';
import {assertSafeRun} from './guard.js';
import {errorResult,skipped} from './results.js';
import {writeReports} from './reports.js';
export class QualityOrchestrator {
 private runners=new Map<SuiteId,SuiteRunner>();
 register(id:SuiteId,runner:SuiteRunner):this{this.runners.set(id,runner);return this;}
 list():SuiteId[]{return [...this.runners.keys()];}
 async run(config:QualityConfig, options:{profile?:ExecutionProfile;suites?:SuiteId[];updateBaselines?:boolean;allowDestructive?:boolean;dryRun?:boolean;verbose?:boolean}={}):Promise<RunReport> {
  validateConfig(config);
  const profile=options.profile??'pr';const configured=config.profiles?.[profile];
  const requested=options.suites??configured??suiteIds(config);
  const start=Date.now();const id=`${new Date().toISOString().replace(/\W/g,'-')}-${randomUUID().slice(0,8)}`;
  const outputDir=path.resolve(config.outputDir??'quality-results',id);
  await mkdir(outputDir,{recursive:true});
  const ctx:RunContext={config,outputDir,updateBaselines:!!options.updateBaselines,allowDestructive:!!options.allowDestructive,dryRun:!!options.dryRun,verbose:!!options.verbose};
  const results=[];
  for (const suite of requested){
   const runner=this.runners.get(suite);
   if(!runner){results.push(errorResult(suite,'registry',Date.now(),new Error(`No adapter registered for ${suite}`)));continue;}
   const destructive=new Set<SuiteId>(['backend:chaos','backend:recovery','backend:disaster-recovery','backend:resilience','backend:scalability']);
   try {if(!ctx.dryRun)assertSafeRun(ctx,suite,destructive.has(suite)||(['backend:stress','backend:spike','backend:soak','backend:concurrency','backend:contract'].includes(suite)&&config.environment==='production')||(suite.startsWith('backend:')&&['backend:performance','backend:load','backend:stress','backend:spike','backend:soak','backend:scalability'].includes(suite)&&!!config.backend?.endpoints.some(e=>e.method&&e.method!=='GET')));results.push(ctx.dryRun?skipped(suite,'dry-run','Selected; execution intentionally disabled'):await runner(ctx));}
   catch(error){results.push(errorResult(suite,'guard/runner',Date.now(),error));}
  }
  const report:RunReport={id,project:config.name,environment:config.environment,profile,startedAt:new Date(start).toISOString(),finishedAt:new Date().toISOString(),results,
  summary:{passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length,skipped:results.filter(r=>r.status==='skipped').length},artifacts:[]};
  report.artifacts=await writeReports(report,outputDir);return report;
 }
}
