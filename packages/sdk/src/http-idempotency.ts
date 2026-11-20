import type {Store} from './types.js';
import type {IdempotencyStore,IdempotencyResult} from '@sapling/middleware';
/** Tenant-bound reservation storage. Claim/complete are atomic, but business side effects still need transactional outbox/reconciliation. */
export class TenantIdempotencyStore implements IdempotencyStore {
 constructor(private store:Store,private tenantId:string){if(!tenantId||tenantId.startsWith('__sapling_')||!store.transaction)throw Error('Tenant and transactional store required');}
 async claim(key:string,fingerprint:string){return this.store.transaction!(this.tenantId,async tx=>{const v=await tx.get<{id:string;fingerprint:string;result?:IdempotencyResult}>(this.tenantId,'http-idempotency',key);if(v){if(v.fingerprint!==fingerprint)return {state:'conflict'} as const;return v.result?{state:'complete',result:v.result} as const:{state:'pending'} as const;}await tx.put(this.tenantId,'http-idempotency',{id:key,fingerprint,createdAt:new Date().toISOString()});return {state:'new'} as const;});}
 async complete(key:string,result:IdempotencyResult){await this.store.transaction!(this.tenantId,async tx=>{const v=await tx.get<{id:string;fingerprint:string;result?:IdempotencyResult}>(this.tenantId,'http-idempotency',key);if(!v||v.result||v.fingerprint!==result.fingerprint)throw Error('Invalid reservation');await tx.put(this.tenantId,'http-idempotency',{...v,result,completedAt:new Date().toISOString()});});}
}
