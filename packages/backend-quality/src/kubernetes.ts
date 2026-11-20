import {execFileSafe,runExternal,result,skipped,type RunContext,type SuiteResult,type CheckResult} from '@saplings/quality-core';
import {runK6} from './k6.js';
function args(ctx:RunContext,...rest:string[]):string[]{const k=ctx.config.backend!.kubernetes!;return [...(k.context?['--context',k.context]:[]),'--namespace',k.namespace,...rest];}
async function kubectl(ctx:RunContext,...part:string[]){return execFileSafe('kubectl',args(ctx,...part),{timeoutMs:ctx.config.safety?.timeoutMs??300000});}
export async function runKubernetes(ctx:RunContext):Promise<SuiteResult>{
 const started=Date.now(),cfg=ctx.config.backend!.kubernetes;
 if(!cfg?.deployment)return skipped('backend:kubernetes','kubectl','Set backend.kubernetes.namespace/deployment for native K8s validation');
 const run=await kubectl(ctx,'get','deployment',cfg.deployment,'-o','json');
 if(run.code!==0)return result('backend:kubernetes','kubectl',started,'failed','Cannot inspect deployment',{stderr:run.stderr});
 const deployment=JSON.parse(run.stdout) as any,containers=deployment.spec?.template?.spec?.containers??[];
 const checks:CheckResult[]=[
  {name:'Deployment has containers',passed:containers.length>0},
  {name:'Every container has resource requests and limits',passed:containers.every((c:any)=>!!c.resources?.requests?.cpu&&!!c.resources?.requests?.memory&&!!c.resources?.limits?.memory)},
  {name:'Every container has readiness probe',passed:containers.every((c:any)=>!!c.readinessProbe)},
  {name:'Every container has liveness probe',passed:containers.every((c:any)=>!!c.livenessProbe)},
  {name:'Every container has startup probe',passed:containers.every((c:any)=>!!c.startupProbe)},
  {name:'Desired replicas available',passed:(deployment.status?.availableReplicas??0)>=(deployment.spec?.replicas??1)}
 ];
 if(cfg.hpa){const hpa=await kubectl(ctx,'get','hpa',cfg.hpa,'-o','json');checks.push({name:'HPA installed',passed:hpa.code===0});}
 const runp=await kubectl(ctx,'get','pdb','-o','json');if(runp.code===0){try{const data=JSON.parse(runp.stdout);checks.push({name:'At least one PodDisruptionBudget exists',passed:Array.isArray(data.items)&&data.items.length>0});}catch{/* audit unavailable */}}
 return result('backend:kubernetes','kubectl',started,checks.every(c=>c.passed)?'passed':'failed','Kubernetes deployment readiness and constraints evaluated',{checks});
}
export async function runScalability(ctx:RunContext):Promise<SuiteResult>{
 const cfg=ctx.config.backend!.kubernetes;
 if(!cfg?.hpa)return skipped('backend:scalability','k6 + kubectl','Configure backend.kubernetes.hpa to validate autoscaling');
 const started=Date.now();const before=await kubectl(ctx,'get','hpa',cfg.hpa,'-o','json');
 if(before.code!==0)return result('backend:scalability','kubectl',started,'failed','HPA missing',{stderr:before.stderr});
 const load=await runK6(ctx,'scalability');const after=await kubectl(ctx,'get','hpa',cfg.hpa,'-o','json');
 const checks:CheckResult[]=[{name:'Workload meets configured thresholds',passed:load.status==='passed'}];
 if(after.code===0){const hpa=JSON.parse(after.stdout) as any;const replica=hpa.status?.currentReplicas??0;
  checks.push({name:cfg.expectedReplicas?`Reached ${cfg.expectedReplicas} replicas`:'HPA reports current replicas',passed:replica>=(cfg.expectedReplicas??1),detail:String(replica)});
 }else checks.push({name:'HPA query succeeded',passed:false,detail:after.stderr});
 return result('backend:scalability','k6 + kubectl',started,checks.every(c=>c.passed)?'passed':'failed','Scaling experiment completed (configure expectedReplicas to assert actual scale-out)',{checks,metrics:load.metrics,stdout:load.stdout,stderr:load.stderr,artifacts:load.artifacts});
}
export async function runChaos(ctx:RunContext):Promise<SuiteResult>{
 const cfg=ctx.config.backend!.kubernetes;
 if(!cfg?.chaosManifest)return skipped('backend:chaos','Chaos Mesh','Configure backend.kubernetes.chaosManifest (dedicated namespace and Chaos Mesh required)');
 const start=Date.now(),checks:CheckResult[]=[];
 const manifest=cfg.chaosManifest;
 const applied=await kubectl(ctx,'apply','-f',manifest);
 if(applied.code!==0)return result('backend:chaos','Chaos Mesh / kubectl',start,'failed','Unable to apply fault experiment',{stderr:applied.stderr});
 try {
  await new Promise(r=>setTimeout(r,10000));
  const probe=await fetch(new URL(ctx.config.backend!.healthPath??'/health',ctx.config.backend!.baseUrl),{signal:AbortSignal.timeout(10000)}).catch(()=>null);
  checks.push({name:'Service health under fault',passed:probe?.ok===true,detail:`HTTP ${probe?.status??'unreachable'}`});
 }finally{
  const cleanup=await kubectl(ctx,'delete','-f',manifest,'--ignore-not-found=true');
  checks.push({name:'Chaos experiment cleanup',passed:cleanup.code===0,detail:cleanup.stderr});
 }
 return result('backend:chaos','Chaos Mesh / kubectl',start,checks.every(c=>c.passed)?'passed':'failed','Controlled fault injected and cleaned',{checks});
}
export async function runRecovery(ctx:RunContext):Promise<SuiteResult>{
 const cfg=ctx.config.backend!.kubernetes;
 if(!cfg?.deployment)return skipped('backend:recovery','kubectl','Configure backend.kubernetes.deployment to test restart recovery');
 const started=Date.now();const restart=await kubectl(ctx,'rollout','restart',`deployment/${cfg.deployment}`);
 if(restart.code!==0)return result('backend:recovery','kubectl',started,'failed','Restart command failed',{stderr:restart.stderr});
 const restored=await kubectl(ctx,'rollout','status',`deployment/${cfg.deployment}`,`--timeout=${cfg.recoveryTimeoutSeconds??120}s`);
 const checks:CheckResult[]=[{name:'Deployment rollout restored',passed:restored.code===0,detail:restored.stdout||restored.stderr}];
 return result('backend:recovery','kubectl',started,restored.code===0?'passed':'failed','Deployment restart and rollout readiness measured',{checks,stdout:restored.stdout,stderr:restored.stderr});
}
export async function runDisasterRecovery(ctx:RunContext):Promise<SuiteResult>{
 const drill=ctx.config.backend!.kubernetes?.drill;
 if(!drill)return skipped('backend:disaster-recovery','external recovery drill','Configure backend.kubernetes.drill with a reviewed backup restore and RTO/RPO validation command');
 const started=Date.now();const run=await runExternal(drill,ctx.config.safety?.timeoutMs??1800000);
 return result('backend:disaster-recovery','external recovery drill',started,run.code===0?'passed':'failed','Application-specific disaster recovery drill executed; RTO/RPO assertions belong to the drill',{stdout:run.stdout,stderr:run.stderr});
}
export async function runProfiling(ctx:RunContext):Promise<SuiteResult>{
 const profile=ctx.config.backend!.profiler;
 if(!profile)return skipped('backend:profiling','Node CPU/heap profiler','Configure backend.profiler with a --cpu-prof or --heap-prof executable command');
 const started=Date.now();const run=await runExternal(profile);
 return result('backend:profiling','Node profiler',started,run.code===0?'passed':'failed','Profiling command executed',{stdout:run.stdout,stderr:run.stderr});
}
