import {breakpoints} from './breakpoints.js';
export type Breakpoint=keyof typeof breakpoints.values;
export function currentBreakpoint(width:number):Breakpoint{
 if(!Number.isFinite(width)||width<0)throw new Error('Invalid viewport width');
 const entries=Object.entries(breakpoints.values) as [Breakpoint,number][];
 return entries.reduce((found,[key,min])=>width>=min?key:found,'xs' as Breakpoint);
}
export type ResponsiveValue<T>=T|Partial<Record<Breakpoint,T>>;
export function resolveResponsive<T>(value:ResponsiveValue<T>,width:number):T|undefined{
 if(typeof value!=='object'||value===null||Array.isArray(value))return value as T;
 const candidate=value as Partial<Record<Breakpoint,T>>;
 // Non-breakpoint objects are values, not responsive maps.
 if(!Object.keys(candidate).some(k=>k in breakpoints.values))return value as T;
 const current=currentBreakpoint(width);
 const keys=Object.keys(breakpoints.values) as Breakpoint[];
 const matches=keys.filter(k=>breakpoints.values[k]<=breakpoints.values[current]&&Object.hasOwn(candidate,k));
 return matches.length?candidate[matches[matches.length-1]]:undefined;
}
