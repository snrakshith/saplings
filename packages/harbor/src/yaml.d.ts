declare module 'yaml' {
 export function parseDocument(source:string,options?:Record<string,unknown>): {errors:{message:string}[];toJS():unknown};
}
