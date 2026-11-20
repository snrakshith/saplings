import {createHash} from 'node:crypto';
import type {ActorContext,Store} from './types.js';
import {AccessService} from './access.js';
import {AuditService} from './audit.js';
import {SaplingError} from './types.js';
export interface Flag {id:string;enabled:boolean;rollout:number;variants?:Record<string,number>;updatedAt:string}
export class FlagService {
 constructor(private store:Store,private access:AccessService,private audit:AuditService){}
 async set(ctx:ActorContext,input:{key:string;enabled:boolean;rollout?:number;variants?:Record<string,number>}) {
  await this.access.requireService(ctx,'flags:write');
  const rollout=input.rollout??100;
  if(rollout<0||rollout>100||!Number.isFinite(rollout))throw new SaplingError('BAD_FLAG','Rollout must be between 0 and 100');
  if(input.variants&&(Object.values(input.variants).some(v=>v<0||!Number.isFinite(v))||Math.abs(Object.values(input.variants).reduce((a,b)=>a+b,0)-100)>0.00001))throw new SaplingError('BAD_FLAG','Variant weights must be nonnegative');
  const flag:Flag={id:input.key,enabled:input.enabled,rollout,variants:input.variants,updatedAt:new Date().toISOString()};
  await this.store.put(ctx.tenantId,'flags',flag);await this.audit.record(ctx,'flag.changed','flags',input.key);
  return flag;
 }
 private bucket(tenantId:string,key:string,subject:string){
  const h=createHash('sha256').update([tenantId,key,subject].join(':')).digest();
  return h.readUInt32BE(0)/0x100000000*100;
 }
 async evaluate(ctx:ActorContext,key:string,subjectId=ctx.actorId):Promise<{enabled:boolean;variant?:string}>{
  const f=await this.store.get<Flag>(ctx.tenantId,'flags',key);
  if(!f?.enabled||this.bucket(ctx.tenantId,key,subjectId)>=f.rollout)return {enabled:false};
  if(!f.variants)return {enabled:true};
  const bucket=this.bucket(ctx.tenantId,key+':variant',subjectId);
  let accumulated=0;
  for(const [variant,weight] of Object.entries(f.variants)) {accumulated+=weight;if(bucket<accumulated)return {enabled:true,variant};}
  return {enabled:true};
 }
}
