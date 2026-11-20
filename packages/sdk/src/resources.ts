import {atomic,object} from './primitives.js';
import {randomUUID} from 'node:crypto';
import type {ActorContext,Store,JsonRecord,ResourceRecord} from './types.js';
import {SaplingError} from './types.js';
import {AuditService} from './audit.js';
import {AccessService} from './access.js';
export class ResourceService {
 constructor(public collection:string,private store:Store,private access:AccessService,private audit:AuditService){}
 async create(ctx:ActorContext,data:JsonRecord):Promise<ResourceRecord>{
  data=object(data);for(const field of ['id','tenantId','createdAt','updatedAt'])if(Object.hasOwn(data,field))throw new SaplingError('FORBIDDEN',`Immutable resource field: ${field}`,403);return atomic(this.store,ctx.tenantId,async tx=>{await this.access.requireService(ctx,`${this.collection}:write`,data,tx);
  const at=new Date().toISOString();const record:ResourceRecord={...data,id:randomUUID(),createdAt:at,updatedAt:at};
  await tx.put(ctx.tenantId,this.collection,record);
  await this.audit.record(ctx,`${this.collection}.created`,this.collection,record.id,undefined,tx);return record;});
 }
 async get(ctx:ActorContext,id:string):Promise<ResourceRecord|undefined>{
  const row=await this.store.get<ResourceRecord>(ctx.tenantId,this.collection,id);await this.access.requireService(ctx,`${this.collection}:read`,row);return row;
 }
 async list(ctx:ActorContext,options:{limit?:number;offset?:number;filter?:JsonRecord}={}):Promise<ResourceRecord[]>{
  await this.access.requireService(ctx,`${this.collection}:read`);
  const limit=Math.max(1,Math.min(options.limit??50,500));const offset=Math.max(0,options.offset??0);
  let records=await this.store.list<ResourceRecord>(ctx.tenantId,this.collection);
  if(options.filter)records=records.filter(row=>Object.entries(options.filter!).every(([key,value])=>row[key]===value));
  const visible:ResourceRecord[]=[];for(const record of records){if(await this.access.has(ctx,`${this.collection}:read`,record))visible.push(record);}return visible.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(offset,offset+limit);
 }
 async update(ctx:ActorContext,id:string,changes:JsonRecord):Promise<ResourceRecord>{
  return atomic(this.store,ctx.tenantId,async tx=>{
  const previous=await tx.get<ResourceRecord>(ctx.tenantId,this.collection,id);
  if(!previous)throw new SaplingError('NOT_FOUND',`${this.collection} resource not found`,404);
  await this.access.requireService(ctx,`${this.collection}:write`,previous,tx);
  changes=object(changes);for(const field of ['id','tenantId','createdAt','updatedAt'])if(Object.hasOwn(changes,field))throw new SaplingError('FORBIDDEN',`Immutable resource field: ${field}`,403);const safe=changes;
  const next:ResourceRecord={...previous,...safe,id,createdAt:previous.createdAt,updatedAt:new Date().toISOString()};
  await this.access.requireService(ctx,`${this.collection}:write`,next,tx);await tx.put(ctx.tenantId,this.collection,next);
  await this.audit.record(ctx,`${this.collection}.updated`,this.collection,id,{fields:Object.keys(safe)},tx);
  return next;});
 }
 async delete(ctx:ActorContext,id:string):Promise<boolean>{
  return atomic(this.store,ctx.tenantId,async tx=>{if((await tx.get<{active:boolean}>(ctx.tenantId,'legal-holds','current'))?.active===true)throw new SaplingError('LEGAL_HOLD','Legal hold active',409);const row=await tx.get<ResourceRecord>(ctx.tenantId,this.collection,id);await this.access.requireService(ctx,`${this.collection}:delete`,row,tx);const deleted=await tx.delete(ctx.tenantId,this.collection,id);if(deleted)await this.audit.record(ctx,`${this.collection}.deleted`,this.collection,id,undefined,tx);return deleted;});
 }
}
