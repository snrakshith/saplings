import {redact} from './primitives.js';
import {randomUUID} from 'node:crypto';
import type {ActorContext,Store,JsonRecord} from './types.js';
export interface AuditEvent {
 id:string; at:string; tenantId:string; actorId:string; action:string; resourceType:string; resourceId?:string;
 correlationId?:string; impersonatorId?:string; detail?:JsonRecord;
}
/** Append-only SDK interface; production storage must enforce append-only DB policy and retention. */
export class AuditService {
 constructor(private store:Store,private enabled:boolean){}
 async record(ctx:ActorContext,action:string,resourceType:string,resourceId?:string,detail?:JsonRecord,store:Store=this.store){
  if(!this.enabled)return;
  const event:AuditEvent={id:randomUUID(),at:new Date().toISOString(),tenantId:ctx.tenantId,actorId:ctx.actorId,
   action,resourceType,resourceId,correlationId:ctx.correlationId,impersonatorId:ctx.impersonatorId,detail:detail?redact(detail) as JsonRecord:undefined};
  await store.put(ctx.tenantId,'audit',event);return event;
 }
 async list(ctx:ActorContext,limit=100):Promise<AuditEvent[]> {
  const events=await this.store.list<AuditEvent>(ctx.tenantId,'audit');
  return events.sort((a,b)=>b.at.localeCompare(a.at)).slice(0,Math.max(1,Math.min(limit,500)));
 }
}
