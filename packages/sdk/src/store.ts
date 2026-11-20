import type {Store} from './types.js';
import {SaplingError} from './types.js';
/** Volatile, per-process reference store. Never deploy it as a distributed production database. */
export class InMemoryStore implements Store {
 private data=new Map<string,unknown>();
 async health(){}
 private tail=new Map<string,Promise<void>>();
 async transaction<T>(tenantId:string,work:(tx:Store)=>Promise<T>):Promise<T>{
  const previous=this.tail.get(tenantId)??Promise.resolve();let release!:()=>void;
  const gate=new Promise<void>(r=>{release=r;});const tail=previous.then(()=>gate);this.tail.set(tenantId,tail);await previous;
  const prefix=JSON.stringify([tenantId]).slice(0,-1)+',';
  // Stage all writes; outside readers never observe uncommitted state. Direct writes
  // serialize on the same tenant lock. Nested transactions share the outer transaction.
  const staged=new Map([...this.data].filter(([k])=>k.startsWith(prefix)));
  let active=true;const guard=(tenant:string)=>{if(!active)throw new SaplingError('TRANSACTION_CLOSED','Transaction is closed',409);if(tenant!==tenantId)throw new SaplingError('INVALID_SCOPE','Cross-tenant transaction access',403);};
  const lookup=async<T>(t:string,c:string,id:string):Promise<T|undefined>=>{guard(t);const value=staged.get(this.key(t,c,id));return value===undefined?undefined:structuredClone(value) as T;};
  const list=async<T>(t:string,c:string):Promise<T[]>=>{guard(t);const p=JSON.stringify([t,c]).slice(0,-1)+',';return [...staged].filter(([k])=>k.startsWith(p)).map(([,v])=>structuredClone(v) as T);};
  const tx:Store={transaction:async(t,fn)=>{guard(t);return fn(tx);},put:async(t,c,r)=>{guard(t);const k=this.key(t,c,r.id);if(c==='audit'&&staged.has(k))throw new SaplingError('CONFLICT','Audit is append-only',409);staged.set(k,structuredClone(r));},get:lookup,list,delete:async(t,c,id)=>{guard(t);if(c==='audit')throw new SaplingError('FORBIDDEN','Audit is append-only',403);return staged.delete(this.key(t,c,id));},page:async<T>(t:string,c:string,l:number,a?:string)=>{const rows=(await list<T&{id:string}>(t,c)).sort((x,y)=>x.id<y.id?-1:x.id>y.id?1:0).filter(x=>!a||x.id>a).slice(0,l+1);return {items:rows.slice(0,l),next:rows.length>l?rows[l-1].id:undefined};}};
  try{const result=await work(tx);for(const k of this.data.keys())if(k.startsWith(prefix))this.data.delete(k);for(const [k,v] of staged)this.data.set(k,v);return result;}finally{active=false;release();if(this.tail.get(tenantId)===tail)this.tail.delete(tenantId);}
 }
 async page<T>(t:string,c:string,limit:number,after?:string){const all=(await this.list<T&{id:string}>(t,c)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).filter(x=>!after||x.id>after).slice(0,limit+1);return {items:all.slice(0,limit),next:all.length>limit?all[limit-1].id:undefined};}

 private key(t:string,c:string,id:string){
  if(!t?.trim()||!c?.trim()||!id?.trim())throw new SaplingError('INVALID_SCOPE','Nonempty tenant, collection and id required');
  return JSON.stringify([t,c,id]);
 }
 async put<T extends {id:string}>(tenantId:string,collection:string,record:T) {
  return this.transaction(tenantId,tx=>tx.put(tenantId,collection,record));
 }
 async get<T>(tenantId:string,collection:string,id:string):Promise<T|undefined>{
  const value=this.data.get(this.key(tenantId,collection,id));return value===undefined?undefined:structuredClone(value) as T;
 }
 async list<T>(tenantId:string,collection:string):Promise<T[]>{
  const prefix=JSON.stringify([tenantId,collection]).slice(0,-1)+',';
  return Array.from(this.data.entries()).filter(([k])=>k.startsWith(prefix)).map(([,v])=>structuredClone(v) as T);
 }
 async delete(tenantId:string,collection:string,id:string){return this.transaction(tenantId,tx=>tx.delete(tenantId,collection,id));}
}
