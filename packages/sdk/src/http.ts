/** Reject oversized provider payloads before fully buffering. */
export async function boundedResponseText(response:Response,maxBytes=2_000_000):Promise<string>{
 const reader=response.body?.getReader();if(!reader)return '';const chunks:Uint8Array[]=[];let bytes=0;try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>maxBytes)throw Error('Provider response exceeds limit');chunks.push(next.value);}return Buffer.concat(chunks).toString('utf8');}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
}
