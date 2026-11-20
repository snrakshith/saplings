import path from 'node:path';
import {writeFile,readFile} from 'node:fs/promises';
import {execFileSafe,assertWorkloadLimit,thresholdChecks,metrics,result,type BackendSuite,type RunContext,type SuiteResult,type WorkloadProfile} from '@saplings/quality-core';
const defaults:Record<string,WorkloadProfile>={
 load:{vus:10,duration:'30s'},stress:{stages:[{duration:'15s',target:10},{duration:'20s',target:40},{duration:'15s',target:0}]},
 spike:{stages:[{duration:'5s',target:5},{duration:'10s',target:50},{duration:'10s',target:5}]},
 soak:{vus:5,duration:'10m'},scalability:{stages:[{duration:'30s',target:5},{duration:'30s',target:20},{duration:'30s',target:50},{duration:'15s',target:0}]}
};
function scriptFor(ctx:RunContext,suite:BackendSuite, profile:WorkloadProfile):string {
 const cfg=ctx.config.backend!;
 const endpoints=cfg.endpoints.map(e=>({...e,url:new URL(e.path,cfg.baseUrl).href}));
 const stages=profile.stages;
 const opts={
  ...(stages?{stages}:{vus:profile.vus??10,duration:profile.duration??'30s'}),
  thresholds:{http_req_failed:['rate<0.01'],http_req_duration:['p(95)<500'],checks:['rate>0.95']},
  tags:{suite:`backend:${suite}`,project:ctx.config.name}
 };
 return `import http from 'k6/http';\nimport {check, sleep} from 'k6';\nexport const options = ${JSON.stringify(opts,null,2)};\nconst endpoints=${JSON.stringify(endpoints)};\nexport default function(){\n const total=endpoints.reduce((n,e)=>n+(e.weight??1),0);let cursor=Math.random()*total;let e=endpoints[0];for(const candidate of endpoints){cursor-=candidate.weight??1;if(cursor<=0){e=candidate;break;}}\n const params={headers:e.headers??{},redirects:0};const body=e.body===undefined?null:JSON.stringify(e.body);\n if(body && !params.headers['Content-Type']) params.headers['Content-Type']='application/json';\n const response=http.request(e.method??'GET',e.url,body,params);\n check(response,{'expected response status':r=>(e.expectedStatuses??[200]).includes(r.status)});\n sleep(0.1);\n}\n`;
}
function readNumber(raw:any,metric:string,field:string):number|undefined {const v=raw?.metrics?.[metric]?.values?.[field];return typeof v==='number'&&Number.isFinite(v)?v:undefined;}
export async function runK6(ctx:RunContext,suite:'load'|'stress'|'spike'|'soak'|'scalability'):Promise<SuiteResult>{
 const start=Date.now();const id=`backend:${suite}` as const;
 const profile={...defaults[suite],...(ctx.config.backend!.profiles?.[suite]??{})};
 const peak=Math.max(profile.vus??1,...(profile.stages??[]).map(s=>s.target));assertWorkloadLimit(ctx.config,peak);
 const file=path.join(ctx.outputDir,`k6-${suite}.js`),json=path.join(ctx.outputDir,`k6-${suite}-summary.json`);
 await writeFile(file,scriptFor(ctx,suite,profile));
 const run=await execFileSafe('k6',['run','--summary-export',json,file],{timeoutMs:ctx.config.safety?.timeoutMs??(suite==='soak'?1200000:420000)});
 let raw:any={};try {raw=JSON.parse(await readFile(json,'utf8'));}catch{ /* tool may have failed before writing summary */ }
 const measured:Record<string,number>={};
 for(const [name,metric,field] of [['latency.p95.ms','http_req_duration','p(95)'],['latency.p99.ms','http_req_duration','p(99)'],['error.rate','http_req_failed','rate'],['requests.total','http_reqs','count'],['requests.perSecond','http_reqs','rate']] as const){const n=readNumber(raw,metric,field);if(n!==undefined)measured[name]=n;}
 const checks=Object.entries(raw?.metrics??{}).filter(([,value])=>(value as any)?.thresholds).flatMap(([key,value])=>Object.entries((value as any).thresholds??{}).map(([name,pass])=>({name:`${key} ${name}`,passed:pass===true})));
 checks.push(...thresholdChecks(ctx,measured),{name:'Nonempty k6 summary',passed:(measured['requests.total']??0)>0});
 return result(id,'k6',start,run.code===0&&!run.timedOut&&checks.every(c=>c.passed)?'passed':'failed',run.code===0?'k6 workload completed':'k6 returned failure or thresholds breached',{metrics:metrics(measured),checks,stdout:run.stdout,stderr:run.stderr,artifacts:[file,json]});
}
