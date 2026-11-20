import type {RateState} from '@saplings/security';
/** Compatible with a Valkey/Redis client exposing eval(script,{keys,arguments}). Atomic fixed windows. */
export interface RedisEvalClient {eval(script:string,options:{keys:string[];arguments:string[]}):Promise<unknown>}
export class ValkeyRateState implements RateState {
 constructor(private client:RedisEvalClient,private prefix='sapling:security:'){}
 async increment(key:string,windowMs:number){const r=await this.client.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; local ttl=redis.call('PTTL',KEYS[1]); if ttl<0 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); ttl=tonumber(ARGV[1]); end; return {n,ttl}",{keys:[this.prefix+'rate:'+key],arguments:[String(windowMs)]});if(!Array.isArray(r)||r.length!==2||!Number.isFinite(Number(r[0]))||!Number.isFinite(Number(r[1])))throw new Error('Invalid rate state response');return {count:Number(r[0]),resetAt:Date.now()+Number(r[1])};}
 async claimAlert(key:string,ttlMs:number){const r=await this.client.eval("local r=redis.call('SET',KEYS[1],'1','NX','PX',ARGV[1]); if r then return 1 else return 0 end",{keys:[this.prefix+'alert:'+key],arguments:[String(ttlMs)]});return Number(r)===1;}
}
