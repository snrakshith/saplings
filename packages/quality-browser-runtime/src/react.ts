import {createElement,Profiler,type ReactNode} from 'react';
export interface RenderSample {id:string;phase:string;actualDuration:number;baseDuration:number;startTime:number;commitTime:number}
declare global {interface Window {__SAPLING_REACT_PROFILE__?:RenderSample[]}}
/** Add this around representative components so frontend:rendering can measure real commits. */
export function SaplingProfiler(props:{id:string;children:ReactNode;onSample?:(sample:RenderSample)=>void}){
 return createElement(Profiler,{id:props.id,onRender:(id,phase,actualDuration,baseDuration,startTime,commitTime)=>{
  const sample:RenderSample={id,phase,actualDuration,baseDuration,startTime,commitTime};
  if(typeof window!=='undefined'){const samples=(window.__SAPLING_REACT_PROFILE__??=[]);samples.push(sample);if(samples.length>500)samples.shift();}
  props.onSample?.(sample);
 }},props.children);
}
