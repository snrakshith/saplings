import { spawn } from 'node:child_process';
import type {ExternalCommand} from './types.js';
export interface ExecResult {code:number;stdout:string;stderr:string;timedOut:boolean;durationMs:number}
export async function execFileSafe(command:string,args:string[]=[],options:{cwd?:string;env?:Record<string,string>;timeoutMs?:number;maxOutput?:number}={}):Promise<ExecResult> {
  const start=Date.now();const maxOutput=options.maxOutput??2_000_000;
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd:options.cwd,env:{...process.env,...options.env},shell:false,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='',timedOut=false,settled=false;
    const end=(err?:Error,code=1)=>{if(settled)return;settled=true;clearTimeout(timer);if(err)reject(err);else resolve({code:timedOut?124:code,stdout,stderr,timedOut,durationMs:Date.now()-start});};
    const append=(kind:'stdout'|'stderr',value:Buffer)=>{const t=value.toString('utf8');if(kind==='stdout')stdout=(stdout+t).slice(-maxOutput);else stderr=(stderr+t).slice(-maxOutput);};
    child.stdout.on('data',(b:Buffer)=>append('stdout',b));child.stderr.on('data',(b:Buffer)=>append('stderr',b));
    child.on('error',e=>end(new Error(`Cannot launch ${command}: ${e.message}`)));
    child.on('close',code=>end(undefined,code??1));
    const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),2000).unref();},options.timeoutMs??300_000);
  });
}
export async function runExternal(spec:ExternalCommand,defaultTimeoutMs=300_000):Promise<ExecResult> {
 return execFileSafe(spec.command,spec.args??[],{cwd:spec.cwd,env:spec.env,timeoutMs:spec.timeoutMs??defaultTimeoutMs});
}
