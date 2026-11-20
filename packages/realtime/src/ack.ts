import type {RealtimeEvent} from './index.js';
/** Bounded in-flight per-channel window; cumulative ACK only for actually delivered events. No durable client checkpoint. */
export class AckWindow {
 private pending=new Map<string,string[]>();
 constructor(private maxPending=32){if(!Number.isSafeInteger(maxPending)||maxPending<1||maxPending>500)throw Error('Invalid ACK window');}
 sent(event:RealtimeEvent){const list=this.pending.get(event.channel)??[];if(list.length>=this.maxPending)throw Error('ACK window exhausted');if(list.includes(event.id))throw Error('Duplicate in-flight event');list.push(event.id);this.pending.set(event.channel,list);}
 ack(channel:string,id:string){const list=this.pending.get(channel);const index=list?.indexOf(id)??-1;if(!list||index<0)throw Error('Unknown acknowledgment');list.splice(0,index+1);if(!list.length)this.pending.delete(channel);return id;}
 clear(channel:string){this.pending.delete(channel);}
}
