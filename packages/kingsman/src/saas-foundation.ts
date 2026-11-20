/** Portable legacy SaaS IAM contracts. The SDK Store/AuditService satisfy these structurally. */
import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
export type SaasJsonRecord=Record<string,unknown>;
export interface SaasActorContext {tenantId:string;actorId:string;roles?:string[];permissions?:string[];attributes?:Record<string,string|number|boolean>;correlationId?:string;impersonatorId?:string}
export interface SaasStore {
 transaction?<T>(tenant:string,work:(tx:SaasStore)=>Promise<T>):Promise<T>;
 get<T>(tenant:string,collection:string,id:string):Promise<T|undefined>;
 put<T extends {id:string}>(tenant:string,collection:string,row:T):Promise<void>;
 delete(tenant:string,collection:string,id:string):Promise<boolean>;
 list<T>(tenant:string,collection:string):Promise<T[]>;
}
export interface SaasAuditPort {
 record(ctx:SaasActorContext,action:string,resourceType:string,resourceId?:string,detail?:SaasJsonRecord,store?:SaasStore):Promise<unknown>;
}
/** Shared error identity: `SaplingError` in the legacy SDK is this same class. */
export class SaasIdentityError extends Error {constructor(public code:string,message:string,public statusCode=400){super(message);this.name='SaplingError';}}
export function fail(message:string,code='INVALID_INPUT',status=400):never {throw new SaasIdentityError(code,message,status);}
export const now=()=>new Date().toISOString();
export function text(value:unknown,name='value',max=4096):string {if(typeof value!=='string'||!value.trim()||value.length>max)return fail(`${name} must be a nonempty string (max ${max})`);return value;}
export function strings(value:unknown):string[]{if(!Array.isArray(value)||value.length>1000)return fail('Expected a bounded string array');return value.map(v=>text(v));}
export function hash(value:string):string{return createHash('sha256').update(value).digest('hex');}
export async function atomic<T>(store:SaasStore,tenant:string,fn:(tx:SaasStore)=>Promise<T>):Promise<T>{if(!store.transaction)return fail('Transactional store required','TRANSACTION_REQUIRED',503);return store.transaction(tenant,fn);}
export type Row=SaasJsonRecord & {id:string};
/** Compatible with legacy SDK's tenant-bound AES-GCM MFA envelope; no new ciphertext format. */
export class TenantSecretCipher {
 constructor(private key:Uint8Array,private keyId='v1'){if(key.byteLength!==32)throw new Error('AES-256 key must be 32 bytes');}
 encrypt(ctx:SaasActorContext,plain:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(this.key),iv);cipher.setAAD(Buffer.from(JSON.stringify([ctx.tenantId,this.keyId])));const ciphertext=Buffer.concat([cipher.update(plain,'utf8'),cipher.final()]);return {keyId:this.keyId,iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),ciphertext:ciphertext.toString('base64url')};}
 decrypt(ctx:SaasActorContext,input:SaasJsonRecord){if(input.keyId!==this.keyId)return fail('Unknown key version');const cipher=createDecipheriv('aes-256-gcm',Buffer.from(this.key),Buffer.from(text(input.iv),'base64url'));cipher.setAAD(Buffer.from(JSON.stringify([ctx.tenantId,this.keyId])));cipher.setAuthTag(Buffer.from(text(input.tag),'base64url'));return Buffer.concat([cipher.update(Buffer.from(text(input.ciphertext,'ciphertext',1000000),'base64url')),cipher.final()]).toString('utf8');}
}
