import {execFileSafe,result,skipped,FRONTEND_SUITES,type QualityOrchestrator,type FrontendSuite,type SuiteResult,type RunContext} from '@sapling/quality-core';
import {runBundle} from './bundle.js';
import {runLighthouse} from './lighthouse.js';
export {runBundle,runLighthouse};
export async function runBrowserSuite(ctx:RunContext,suite:FrontendSuite){const modulePath='./browser.js'; const browser=await import(modulePath) as {runBrowserSuite:(ctx:RunContext,suite:FrontendSuite)=>Promise<SuiteResult>};return browser.runBrowserSuite(ctx,suite);}
async function custom(ctx:RunContext,suite:FrontendSuite):Promise<SuiteResult>{
 const cmd=ctx.config.frontend?.custom?.[suite];if(!cmd)return skipped(`frontend:${suite}`,'external','No runnable suite definition configured');
 const start=Date.now();const out=await execFileSafe(cmd.command,cmd.args??[],{cwd:cmd.cwd,env:cmd.env,timeoutMs:cmd.timeoutMs??300000});
 return result(`frontend:${suite}`,'external',start,out.code===0?'passed':'failed',`Custom ${suite} command completed`,{stdout:out.stdout,stderr:out.stderr});
}
export function registerFrontend(orchestrator:QualityOrchestrator):void{
 for(const suite of FRONTEND_SUITES)orchestrator.register(`frontend:${suite}`,async ctx=>{
  const override=ctx.config.frontend?.custom?.[suite];
  if(override)return custom(ctx,suite);
  if(suite==='bundle')return runBundle(ctx);
  if(suite==='performance' && ctx.config.frontend?.lighthouserc)return runLighthouse(ctx);
  return runBrowserSuite(ctx,suite);
 });
}
