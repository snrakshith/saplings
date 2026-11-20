import {type QualityOrchestrator,type BackendSuite,BACKEND_SUITES} from '@saplings/quality-core';
import {runK6} from './k6.js';
import {runObservability,runConcurrency,runContract,runSecurity,runCustomBackend} from './http-suites.js';
import {runToxiproxy} from './toxiproxy.js';
import {runKubernetes,runScalability,runRecovery,runChaos,runDisasterRecovery,runProfiling} from './kubernetes.js';
export {createNodeDiagnostics} from './diagnostics.js';
export function registerBackend(orchestrator:QualityOrchestrator):void{
 for(const name of BACKEND_SUITES){const id=`backend:${name}` as const;
  orchestrator.register(id,async ctx=>{
   switch(name){
    case 'performance':return (await import('./benchmark.js')).runBenchmark(ctx);
    case 'load':case 'stress':case 'spike':case 'soak':return runK6(ctx,name);
    case 'scalability':return runScalability(ctx);
    case 'security':return runSecurity(ctx);
    case 'concurrency':return runConcurrency(ctx);
    case 'resilience':return runToxiproxy(ctx);
    case 'recovery':return runRecovery(ctx);
    case 'observability':return runObservability(ctx);
    case 'contract':return runContract(ctx);
    case 'chaos':return runChaos(ctx);
    case 'disaster-recovery':return runDisasterRecovery(ctx);
    case 'kubernetes':return runKubernetes(ctx);
    case 'profiling':return runProfiling(ctx);
    default:return runCustomBackend(ctx,name as BackendSuite);
   }
  });
 }
}

// v0.5 native runner compatibility
export * from "./core/config.js";
export * from "./core/results.js";
export * from "./core/runner.js";
export * from "./reporters/index.js";
export {main as cliMain} from "./cli.js";
