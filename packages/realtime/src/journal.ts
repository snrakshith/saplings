import { randomUUID } from 'node:crypto';
import type { RealtimeEvent } from './index.js';
/** Per-channel cursor is opaque to callers. 0 requests retained history; undefined starts at current tail. */
export interface EventJournal {
 append(topic:string,event:RealtimeEvent):Promise<string>;
 tail(topic:string):Promise<string>;
 read(topic:string,after:string,limit:number):Promise<{events:RealtimeEvent[];gap:boolean}>;
}
const validTopic=(topic:string)=>{if(!/^[A-Za-z0-9_.:%-]{1,384}\/[A-Za-z0-9_.:%-]{1,384}$/.test(topic))throw Error('Invalid journal topic');};
const limitCheck=(n:number,max:number)=>{if(!Number.isSafeInteger(n)||n<1||n>max)throw Error('Invalid journal limit');};
const parseCursor=(s:string)=>{if(s==='0')return; if(!/^[a-zA-Z0-9_-]{1,128}$/.test(s))throw Error('Invalid replay cursor');};
/** Bounded volatile reference; does not survive process restarts. No silent eviction of channels. */
export class MemoryEventJournal implements EventJournal {
 private topics=new Map<string,{events:RealtimeEvent[]}>();
 constructor(private retention=1000,private maxTopics=1000){limitCheck(retention,100000);limitCheck(maxTopics,10000);}
 async append(topic:string,event:RealtimeEvent){validTopic(topic);let row=this.topics.get(topic);if(!row){if(this.topics.size>=this.maxTopics)throw Error('Journal topic capacity');row={events:[]};this.topics.set(topic,row);}const id=randomUUID();row.events.push(structuredClone({...event,id}));if(row.events.length>this.retention)row.events.shift();return id;}
 async tail(topic:string){validTopic(topic);return this.topics.get(topic)?.events.at(-1)?.id??'0';}
 async read(topic:string,after:string,limit:number){validTopic(topic);parseCursor(after);limitCheck(limit,500);const events=this.topics.get(topic)?.events??[];const index=after==='0'?-1:events.findIndex(e=>e.id===after);if(after!=='0'&&index<0)return {events:[],gap:true};return {events:structuredClone(events.slice(index+1,index+1+limit)),gap:false};}
}
export interface RedisJournalClient {eval(script:string,options:{keys:string[];arguments:string[]}):Promise<unknown>}
// Each key is a single stream. All operations touch exactly one key, including on Redis Cluster.
const appendScript=`local id=redis.call('XADD',KEYS[1],'MAXLEN','=',ARGV[1],'*','event',ARGV[2]); return id`;
const tailScript=`local rows=redis.call('XREVRANGE',KEYS[1],'+','-','COUNT',1); if #rows==0 then return '0' end; return rows[1][1]`;
const readScript=`if ARGV[1]~='0' then local cursor=redis.call('XRANGE',KEYS[1],ARGV[1],ARGV[1],'COUNT',1); if #cursor==0 then return {1,{}} end end; local start='-'; if ARGV[1]~='0' then start='('..ARGV[1] end; local rows=redis.call('XRANGE',KEYS[1],start,'+','COUNT',ARGV[2]); return {0,rows}`;
/** Durable when the deployment enables Redis/Valkey persistence and appropriate failover. No cross-channel ordering. */
export class RedisStreamJournal implements EventJournal {
 constructor(private client:RedisJournalClient,private prefix='sapling:journal:',private retention=1000,private maxBytes=65536){limitCheck(retention,100000);limitCheck(maxBytes,1000000);if(!/^[A-Za-z0-9:_-]{1,128}$/.test(prefix))throw Error('Invalid journal prefix');}
 private key(topic:string){validTopic(topic);return this.prefix+topic;}
 async append(topic:string,event:RealtimeEvent){const raw=JSON.stringify(event);if(Buffer.byteLength(raw)>this.maxBytes)throw Error('Journal message too large');const id=await this.client.eval(appendScript,{keys:[this.key(topic)],arguments:[String(this.retention),raw]});if(typeof id!=='string'||!/^\d+-\d+$/.test(id))throw Error('Invalid journal append response');return id;}
 async tail(topic:string){const id=await this.client.eval(tailScript,{keys:[this.key(topic)],arguments:[]});if(typeof id!=='string'||! /^(0|\d+-\d+)$/.test(id))throw Error('Invalid journal tail');return id;}
 async read(topic:string,after:string,limit:number){if(!/^(0|\d{1,20}-\d{1,20})$/.test(after))throw Error('Invalid stream cursor');limitCheck(limit,500);const result=await this.client.eval(readScript,{keys:[this.key(topic)],arguments:[after,String(limit)]});if(!Array.isArray(result)||result.length!==2||![0,1].includes(result[0])||!Array.isArray(result[1])||result[1].length>limit)throw Error('Invalid journal read');const events:RealtimeEvent[]=result[1].map((row:unknown)=>{if(!Array.isArray(row)||typeof row[0]!=='string'||!/^\d+-\d+$/.test(row[0])||!Array.isArray(row[1])||row[1][0]!=='event'||typeof row[1][1]!=='string'||Buffer.byteLength(row[1][1])>this.maxBytes)throw Error('Malformed stream entry');return {...JSON.parse(row[1][1]),id:row[0]};});return {gap:result[0]===1,events};}
}
