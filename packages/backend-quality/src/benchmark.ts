import {assertWorkloadLimit,result,metrics,thresholdChecks,evaluateChecks,type RunContext,type SuiteResult} from '@sapling/quality-core';
export async function runBenchmark(ctx:RunContext):Promise<SuiteResult>{
 const started=Date.now(),cfg=ctx.config.backend!;const bench=cfg.benchmark??{};
 const url=new URL(bench.path??cfg.endpoints[0]!.path,cfg.baseUrl).href;
 assertWorkloadLimit(ctx.config,bench.connections??10);
 if(!Number.isInteger(bench.durationSeconds??10)||(bench.durationSeconds??10)<1||(bench.durationSeconds??10)>3600)throw Error('Invalid benchmark duration');
 const engine='autocannon'; const {default:autocannon}=await import(engine) as {default:(opts:{url:string;connections:number;duration:number},cb:(error:Error|null,value:any)=>void)=>unknown};
 const outcome=await new Promise<any>((resolve,reject)=>{
  autocannon({url,connections:bench.connections??10,duration:bench.durationSeconds??10},(error,value)=>error?reject(error):resolve(value));
 });
 const measured={'latency.p95.ms':(outcome.latency.p95??outcome.latency.p97_5),'latency.p99.ms':outcome.latency.p99,'requests.perSecond':outcome.requests.average,'errors.total':outcome.errors+outcome.timeouts+(outcome.non2xx??0)};
 const checks=thresholdChecks(ctx,measured);
 checks.push({name:'Benchmark produced finite metrics and traffic',passed:Object.values(measured).every(Number.isFinite)&&outcome.requests.total>0});
 checks.push({name:'No request errors',passed:measured['errors.total']===0,detail:String(measured['errors.total'])});
 return result('backend:performance','autocannon',started,evaluateChecks(checks),'HTTP benchmark executed',{metrics:metrics(measured),checks});
}
