export const BACKEND_SUITES = ['performance','load','stress','spike','soak','scalability','security','concurrency','resilience','recovery','observability','contract','chaos','disaster-recovery','kubernetes','profiling'] as const;
export const FRONTEND_SUITES = ['performance','rendering','visual','accessibility','responsive','cross-browser','bundle','memory','security','network','seo','api-integration','observability','recovery','localization','navigation'] as const;
export type BackendSuite = typeof BACKEND_SUITES[number];
export type FrontendSuite = typeof FRONTEND_SUITES[number];
export type SuiteId = `backend:${BackendSuite}` | `frontend:${FrontendSuite}`;
export type ExecutionProfile = 'pr'|'main'|'nightly'|'release'|'scheduled'|'all';
export type QualityEnvironment = 'local'|'ci'|'staging'|'production';
export type Status = 'passed'|'failed'|'skipped';
export type Metric = {value:number;unit?:string;description?:string};
export interface Threshold {max?:number;min?:number;unit?:string}
export interface Endpoint {path:string;method?:'GET'|'POST'|'PUT'|'PATCH'|'DELETE';headers?:Record<string,string>;body?:unknown;expectedStatuses?:number[];weight?:number}
export interface WorkloadProfile {vus?:number;duration?:string;stages?:Array<{duration:string;target:number}>;iterations?:number;maxVUs?:number}
export interface ExternalCommand {command:string;args?:string[];timeoutMs?:number;cwd?:string;env?:Record<string,string>}
export interface KubernetesConfig {namespace:string;context?:string;deployment?:string;hpa?:string;chaosManifest?:string;expectedReplicas?:number;recoveryTimeoutSeconds?:number;drill?:ExternalCommand}
export interface BackendConfig {
  baseUrl:string;
  endpoints:Endpoint[];
  profiles?:Partial<Record<'load'|'stress'|'spike'|'soak'|'scalability', WorkloadProfile>>;
  benchmark?:{connections?:number;durationSeconds?:number;path?:string};
  openapi?:string;
  metricsPath?:string;
  healthPath?:string;
  profiler?:ExternalCommand;
  security?:{zapPlan?:string;semgrep?:boolean;trivyTarget?:string};
  resilience?:{toxiproxyUrl?:string;proxyName?:string;toxicName?:string;latencyMs?:number;probePath?:string;expectedStatuses?:number[]};
  concurrency?:{path:string;method?:'POST'|'PUT'|'PATCH';body?:unknown;requests?:number;idempotencyHeader?:string;idempotencyKey?:string;expectedStatuses?:number[];responseIdField?:string};
  kubernetes?:KubernetesConfig;
  custom?:Partial<Record<BackendSuite,ExternalCommand>>;
}
export interface Viewport {name:string;width:number;height:number}
export interface FrontendConfig {
  baseUrl:string;
  routes:string[];
  browsers?:Array<'chromium'|'firefox'|'webkit'>;
  viewports?:Viewport[];
  bundle?:{directory:string;maxTotalGzipKb:number;extensions?:string[]};
  visual?:{baselineDir?:string;thresholdRatio?:number;updateBaselines?:boolean};
  perf?:{maxLcpMs?:number;maxCls?:number;maxNavigationMs?:number;maxLongTaskMs?:number};
  memory?:{iterations?:number;maxHeapGrowthMb?:number};
  network?:{latencyMs?:number;offline?:boolean;blockPattern?:string;offlineIndicatorSelector?:string};
  accessibility?:{wcagTags?:string[];criticalViolationsMax?:number};
  lighthouserc?:string;
  publicRoutes?:string[];
  apiMocks?:Array<{urlPattern:string;status?:number;body?:unknown}>;
  apiAssertions?:string[];
  navigation?:{links?:string[];expectedSelector?:string};
  recovery?:{selector?:string;persistAcrossReload?:boolean};
  telemetryEndpoint?:string;
  security?:{requiredHeaders?:string[];semgrep?:boolean};
  localization?:{locales?:string[];localeQueryParam?:string};
  custom?:Partial<Record<FrontendSuite,ExternalCommand>>;
}
export interface QualityConfig {
  name:string;
  environment:QualityEnvironment;
  outputDir?:string;
  allowedHosts?:string[];
  safety?:{allowDestructive?:boolean;allowProductionTarget?:boolean;maxVirtualUsers?:number;timeoutMs?:number};
  thresholds?:Partial<Record<string,Threshold>>;
  profiles?:Partial<Record<ExecutionProfile,SuiteId[]>>;
  backend?:BackendConfig;
  frontend?:FrontendConfig;
}
export interface CheckResult {name:string;passed:boolean;detail?:string}
export interface SuiteResult {
  suite:SuiteId;status:Status;startedAt:string;finishedAt:string;durationMs:number;
  engine:string;summary:string;metrics?:Record<string,Metric>;checks?:CheckResult[];
  stdout?:string;stderr?:string;artifacts?:string[];error?:string;
}
export interface RunReport {id:string;project:string;environment:QualityEnvironment;profile:ExecutionProfile;startedAt:string;finishedAt:string;results:SuiteResult[];summary:{passed:number;failed:number;skipped:number};artifacts:string[]}
export interface RunContext {config:QualityConfig;outputDir:string;updateBaselines:boolean;allowDestructive:boolean;dryRun:boolean;verbose:boolean}
export type SuiteRunner = (ctx:RunContext) => Promise<SuiteResult>;
export function defineQualityConfig<T extends QualityConfig>(config:T):T {return config;}
