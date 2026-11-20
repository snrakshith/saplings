import {createHash} from 'node:crypto';
import {GatewayError} from './config.js';
import type {RateLimitStore,GatewayBanStore} from './types.js';
/** Minimal transactional interface for a persistent gateway control-plane store. Compatible with @sapling/sdk Store. */
export interface GatewayStateStore {
 transaction<T>(namespace:string,execute:(tx:GatewayStateStore)=>Promise<T>):Promise<T>;
 get<T>(namespace:string,collection:string,id:string):Promise<T|undefined>;
 page?<T>(namespace:string,collection:string,limit:number,after?:string):Promise<{items:T[];next?:string}>;
 delete?(namespace:string,collection:string,id:string):Promise<boolean>;
 put<T extends {id:string}>(namespace:string,collection:string,row:T):Promise<void>;
}
const key=(scope:string,value:string)=>createHash('sha256').update(scope).update('\0').update(value).digest('hex');
const requireInt=(n:number,field:string,min:number,max:number)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw new GatewayError('INVALID_LIMIT',`Invalid ${field}`,400);};
/** DB-backed atomic fixed-window rate limit. Useful as a safe fallback; prefer Redis atomic Lua for high-volume edge traffic. */
export class GatewayTransactionalRateLimitStore implements RateLimitStore {
 constructor(private store:GatewayStateStore,private now:()=>number=Date.now,private namespace='sapling-gateway-control'){
  if(!store||typeof store.transaction!=='function')throw new GatewayError('CONFIG_INVALID','Rate state requires atomic transactions');
 }
 async check(identity:string,max:number,windowMs:number){
  if(typeof identity!=='string'||!identity||identity.length>1000)throw new GatewayError('INVALID_LIMIT','Invalid rate identity');
  requireInt(max,'rate ceiling',1,10_000_000);requireInt(windowMs,'rate window',1,7*86400_000);
  // Independent quotas (e.g. 20/min + 1000/day) must never share one counter.
  const id=key('rate',JSON.stringify([identity,max,windowMs]));return this.store.transaction(this.namespace,async tx=>{
   const now=this.now(),old=await tx.get<{id:string;count:number;resetAt:number}>(this.namespace,'gateway-rate',id),resetAt=!old||old.resetAt<=now?now+windowMs:old.resetAt,count=!old||old.resetAt<=now?1:old.count+1;
   await tx.put(this.namespace,'gateway-rate',{id,count,resetAt});
   return {allowed:count<=max,remaining:Math.max(0,max-count),resetAt};
  });
 }
}
/** Durable temporary IP bans. This is storage, not an IDS or a reputation engine. */
export class GatewayTransactionalBanStore implements GatewayBanStore {
 constructor(private store:GatewayStateStore,private now:()=>number=Date.now,private namespace='sapling-gateway-control'){
  if(!store||typeof store.transaction!=='function')throw new GatewayError('CONFIG_INVALID','Ban state requires atomic transactions');
 }
 async isBanned(ip:string){if(!ip||ip.length>128)throw new GatewayError('INVALID_CLIENT_IP','Invalid IP');const row=await this.store.get<{expiresAt:number}>(this.namespace,'gateway-bans',key('ban',ip));return !!row&&row.expiresAt>this.now();}
 async ban(ip:string,ttlMs:number){if(!ip||ip.length>128)throw new GatewayError('INVALID_CLIENT_IP','Invalid IP');requireInt(ttlMs,'ban TTL',1,7*86400_000);const id=key('ban',ip);await this.store.transaction(this.namespace,async tx=>{const old=await tx.get<{expiresAt:number}>(this.namespace,'gateway-bans',id);await tx.put(this.namespace,'gateway-bans',{id,expiresAt:Math.max(old?.expiresAt??0,this.now()+ttlMs)});});}
}
/** Explicit bounded cleanup for expired rate and ban rows; invoke from a trusted maintenance worker. */
export class GatewayStateMaintenance {
 constructor(private store:GatewayStateStore,private now:()=>number=Date.now,private namespace='sapling-gateway-control'){}
 async sweep(collection:'gateway-rate'|'gateway-bans',limit=200,after?:string){
  requireInt(limit,'sweep batch size',1,500);
  if(typeof this.store.page!=='function'||typeof this.store.delete!=='function')throw new GatewayError('MAINTENANCE_STORE_REQUIRED','Persistent gateway maintenance requires page/delete support',503);
  const snapshot=await this.store.page<{id:string;resetAt?:number;expiresAt?:number}>(this.namespace,collection,limit,after);
  let deleted=0;
  for(const row of snapshot.items){await this.store.transaction(this.namespace,async tx=>{
    const current=await tx.get<{id:string;resetAt?:number;expiresAt?:number}>(this.namespace,collection,row.id);
    if(current&&(collection==='gateway-rate'?current.resetAt??Infinity:current.expiresAt??Infinity)<=this.now()){
     await tx.delete!(this.namespace,collection,row.id);deleted++;
    }
  });}
  return {scanned:snapshot.items.length,deleted,next:snapshot.next};
 }
}
