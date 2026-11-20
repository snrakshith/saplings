'use client';
import {useCallback,useSyncExternalStore} from 'react';
export interface StorageCodec<T>{encode(value:T):string;decode(value:string):T}
const EVENT='sapling:storage-change';
/** Storage changes synchronize within the document and across tabs (localStorage). Never store secrets here. */
export function useStorage<T>(kind:'local'|'session',key:string,initial:T,codec?:StorageCodec<T>){
 const getStore=()=>kind==='local'?window.localStorage:window.sessionStorage;
 const snapshot=useCallback(()=>{try{return typeof window==='undefined'?null:getStore().getItem(key);}catch{return null;}},[kind,key]);
 const subscribe=useCallback((cb:()=>void)=>{if(typeof window==='undefined')return ()=>{};const change=(event:Event)=>{if(event instanceof StorageEvent){try{if(event.storageArea===getStore()&&(event.key===key||event.key===null))cb();}catch{/* denied storage */}}else{const d=(event as CustomEvent<{kind:string;key:string}>).detail;if(d?.kind===kind&&d.key===key)cb();}};window.addEventListener('storage',change);window.addEventListener(EVENT,change);return ()=>{window.removeEventListener('storage',change);window.removeEventListener(EVENT,change);};},[kind,key]);
 const raw=useSyncExternalStore(subscribe,snapshot,()=>null);
 const decode=(value:string|null):T=>{if(value===null)return initial;try{return codec?codec.decode(value):JSON.parse(value) as T;}catch{return initial;}};
 const value=decode(raw);
 const set=(next:T|((previous:T)=>T))=>{if(typeof window==='undefined')throw new Error('Storage unavailable');const resolved=typeof next==='function'?(next as (previous:T)=>T)(decode(getStore().getItem(key))):next;const encoded=codec?codec.encode(resolved):JSON.stringify(resolved);if(typeof encoded!=='string')throw new TypeError('Value is not serializable');getStore().setItem(key,encoded);window.dispatchEvent(new CustomEvent(EVENT,{detail:{kind,key}}));};
 const remove=()=>{if(typeof window==='undefined')throw new Error('Storage unavailable');getStore().removeItem(key);window.dispatchEvent(new CustomEvent(EVENT,{detail:{kind,key}}));};return {value,set,remove};
}
export function useLocalStorage<T>(key:string,initial:T,codec?:StorageCodec<T>){return useStorage('local',key,initial,codec);}
export function useSessionStorage<T>(key:string,initial:T,codec?:StorageCodec<T>){return useStorage('session',key,initial,codec);}
