import {execFileSafe,skipped,result,type RunContext,type SuiteResult} from '@saplings/quality-core';
export async function runLighthouse(ctx:RunContext):Promise<SuiteResult>{
 const config=ctx.config.frontend!.lighthouserc;
 if(!config)return skipped('frontend:performance','Lighthouse CI','Configure frontend.lighthouserc to run Lighthouse CI alongside browser measurements');
 const start=Date.now();const run=await execFileSafe('lhci',['autorun','--config',config],{timeoutMs:ctx.config.safety?.timeoutMs??600000});
 return result('frontend:performance','Lighthouse CI',start,run.code===0?'passed':'failed','Lighthouse CI collected and asserted audit results',{stdout:run.stdout,stderr:run.stderr,artifacts:['.lighthouseci']});
}
