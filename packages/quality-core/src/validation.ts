import {BACKEND_SUITES,FRONTEND_SUITES,type QualityConfig,type SuiteId} from './types.js';
const isNonEmpty = (v:unknown):v is string => typeof v === 'string' && !!v.trim();
export function validateConfig(config:QualityConfig):void {
  if (!config || !isNonEmpty(config.name)) throw new Error('Quality config must include a non-empty name');
  if (!['local','ci','staging','production'].includes(config.environment)) throw new Error('Invalid environment');
  if (!config.backend && !config.frontend) throw new Error('At least one of backend or frontend must be configured');
  for (const [name,section] of [['backend',config.backend],['frontend',config.frontend]] as const) {
    if (!section) continue;
    let target:URL;
    try {target = new URL(section.baseUrl);} catch {throw new Error(`${name}.baseUrl must be an absolute URL`);}
    if (!['http:','https:'].includes(target.protocol)) throw new Error(`${name}.baseUrl must use http or https`);
  }
  if(config.backend){const b=config.backend;const paths=[...b.endpoints?.map(e=>e.path)??[],b.benchmark?.path,b.healthPath,b.metricsPath,b.concurrency?.path,b.resilience?.probePath];for(const value of paths)if(value!==undefined)assertRelativeRoute(value);for(const endpoint of b.endpoints??[]){if(endpoint.weight!==undefined&&(!Number.isFinite(endpoint.weight)||endpoint.weight<=0))throw Error('Endpoint weight must be positive');if(endpoint.expectedStatuses?.some(n=>!Number.isInteger(n)||n<100||n>599))throw Error('Invalid expected status');}}
  if(config.frontend){const f=config.frontend;for(const route of [...f.routes??[],...f.publicRoutes??[],...f.navigation?.links??[]])assertRelativeRoute(route);}
  if (config.backend && (!Array.isArray(config.backend.endpoints) || !config.backend.endpoints.length)) throw new Error('backend.endpoints must contain at least one endpoint');
  if (config.frontend && (!Array.isArray(config.frontend.routes) || !config.frontend.routes.length)) throw new Error('frontend.routes must contain at least one route');
  const allowed = new Set<string>([...BACKEND_SUITES.map(s=>`backend:${s}`),...FRONTEND_SUITES.map(s=>`frontend:${s}`)]);
  for (const suites of Object.values(config.profiles ?? {})) for (const suite of suites ?? []) if (!allowed.has(suite)) throw new Error(`Unknown suite in profile: ${suite}`);
}
export function suiteIds(config:QualityConfig):SuiteId[] {
  return [...(config.backend ? BACKEND_SUITES.map(s=>`backend:${s}` as SuiteId):[]),...(config.frontend ? FRONTEND_SUITES.map(s=>`frontend:${s}` as SuiteId):[])];
}

export function assertRelativeRoute(value:string){if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\')||/[\r\n]/.test(value))throw Error('Routes must be same-origin absolute paths');}
