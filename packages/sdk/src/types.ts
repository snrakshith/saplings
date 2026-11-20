import type {DefenderConfig, HttpRequest, ScannerAdapter,ScanOptions} from '@saplings/security';
export type Environment='development'|'test'|'production';
export interface ActorContext {
 tenantId:string; actorId:string; roles?:string[]; permissions?:string[];
 attributes?:Record<string,string|number|boolean>;
 correlationId?:string; impersonatorId?:string;
}
export type JsonRecord=Record<string,unknown>;
export interface ResourceRecord extends JsonRecord {id:string; createdAt:string; updatedAt:string}
export interface Store {
 transaction?<T>(tenantId:string,work:(tx:Store)=>Promise<T>):Promise<T>;
 page?<T>(tenantId:string,collection:string,limit:number,after?:string):Promise<{items:T[];next?:string}>;
 health?():Promise<void>;
 search?<T>(tenantId:string,collection:string,query:string,fields:string[],limit:number):Promise<T[]>;
 claimableJobs?<T>(tenantId:string,at:number,limit:number):Promise<T[]>;
 put<T extends {id:string}>(tenantId:string,collection:string,record:T):Promise<void>;
 get<T>(tenantId:string,collection:string,id:string):Promise<T|undefined>;
 list<T>(tenantId:string,collection:string):Promise<T[]>;
 delete(tenantId:string,collection:string,id:string):Promise<boolean>;
}
export interface StorageAdapter {
 put(tenantId:string,key:string,data:Uint8Array,metadata?:Record<string,string>):Promise<{key:string;version:string;size:number}>;
 get(tenantId:string,key:string,version?:string):Promise<{data:Uint8Array;metadata:Record<string,string>;version:string}|undefined>;
 list(tenantId:string,prefix?:string):Promise<{key:string;version:string;size:number}[]>;
 delete(tenantId:string,key:string):Promise<void>;
}
export interface NotificationAdapter {
 send(message:{tenantId:string;channel:'email'|'sms'|'push'|'inapp';to:string;template?:string;subject?:string;body:string;metadata?:JsonRecord}):Promise<{id:string;status:'queued'|'sent'}>;
}
export interface PaymentOrderInput {tenantId:string;amountMinor:number;currency:string;reference:string;idempotencyKey?:string}
export interface PaymentRefundInput {tenantId:string;paymentId:string;orderId?:string;amountMinor?:number;idempotencyKey?:string}
export interface PaymentResult {id:string;status:string;provider?:string;checkoutSessionId?:string;clientSecret?:string}
export interface PaymentAdapter {
 readonly name?:string;
 createOrder(input:PaymentOrderInput):Promise<PaymentResult>;
 refund(input:PaymentRefundInput):Promise<PaymentResult>;
 recoverOrder?(input:PaymentOrderInput):Promise<PaymentResult>;
 recoverRefund?(input:PaymentRefundInput):Promise<PaymentResult>;
 reconcilePayment?(store:Store,ctx:ActorContext,orderId:string,paymentId:string):Promise<{processed:boolean;duplicate?:boolean;paymentId:string}>;
}
export interface PaymentConfig {enabled?:boolean;provider?:'cashfree'|'razorpay'|'stripe'|'custom';cashfree?:import('./cashfree.js').CashfreeOptions;razorpay?:{keyId:string;secret:string;webhookSecret?:string};stripe?:{secret:string}}
export interface AuthenticationAdapter {
 verifyAccessToken(token:string):Promise<{tenantId:string;userId:string;roles:string[];permissions:string[]}|undefined>;
}
export interface TelemetryAdapter {
 log(event:{level:'debug'|'info'|'warn'|'error';event:string;at:string;fields?:JsonRecord}):void|Promise<void>;
}
export interface FeatureAdapter {
 execute(request:{ctx:ActorContext;featureId:string;action:string;input:JsonRecord;options:JsonRecord}):Promise<unknown>;
}
export interface SaplingProviders {
 store?:Store;storage?:StorageAdapter;notifications?:NotificationAdapter;payments?:PaymentAdapter;
 authentication?:AuthenticationAdapter;telemetry?:TelemetryAdapter;capabilities?:Record<string,FeatureAdapter>;
}
export interface StructuralFeatureSchema {safeParseAsync(input:unknown):Promise<{success:true;data:unknown}|{success:false;error:unknown}>}
/** Opt-in application-owned DTO/policy hooks, never replaces feature permission checks. */
export interface FeatureActionSettings {inputSchema?:StructuralFeatureSchema;outputSchema?:StructuralFeatureSchema;authorize?:(ctx:ActorContext,input:Readonly<JsonRecord>)=>boolean|Promise<boolean>}
export interface FeatureSettings {enabled?:boolean;provider?:string;options?:JsonRecord;actions?:Record<string,FeatureActionSettings>}
export type ServiceConfig={accountPasswordPolicy?:import('./accounts.js').AccountPasswordPolicy;providerWorkflows?:Record<string,import('./provider-workflow.js').ProviderWorkflowDefinition>;domainPolicies?:Record<string,import('./domain-policy.js').DomainPolicy>;retentionPolicies?:Record<string,{days:number;terminalStatuses?:readonly string[]}>;providerOperations?:Record<string,import('./provider-operations.js').OperationDriver>;recurring?:import('./recurring.js').RecurringSettings;offboarding?:import('./offboarding.js').OffboardingSettings;dataCollections?:string[];encryptionKey?:Uint8Array;impersonationScopes?:string[];challengeDelivery?:(message:{tenantId:string;email:string;secret:string;purpose:string})=>Promise<void>;worker?:import('./worker.js').WorkerSettings;operations?:import('./operations.js').OperationsSettings};
export interface PlatformConfig {
 /** Kong-inspired gateway configuration and infrastructure adapters. */
 harbor?:{config:import('@saplings/harbor').GatewayConfig;dependencies?:import('@saplings/harbor').GatewayDependencies};
 /** Keycloak-inspired realm config. Production requires stable keys, a real store, Argon2id and transport integration. */
 kingsman?:{config:import('@saplings/kingsman').RealmConfig;dependencies?:import('@saplings/kingsman').IdentityDependencies};
 /** @deprecated Use harbor; both names cannot be set. */
 gateway?:{config:import('@saplings/harbor').GatewayConfig;dependencies?:import('@saplings/harbor').GatewayDependencies};
 /** @deprecated Use kingsman; both names cannot be set. */
 identity?:{config:import('@saplings/kingsman').RealmConfig;dependencies?:import('@saplings/kingsman').IdentityDependencies};
}
export interface SaplingConfig {
 app:{id:string;environment:Environment;name?:string};
 platforms?:PlatformConfig;
 realtime?:import('@saplings/realtime').RealtimeConfig;
 middleware?:import('@saplings/middleware').MiddlewareConfig;
 quality?:import('./quality-config.js').BackendQualityConfig | import('@saplings/quality-contracts').QualityConfig;
 /** Service-specific configuration. */
 services?:ServiceConfig;
 /** @deprecated Use services instead. Cannot be combined with services. */
 expanded?:ServiceConfig;
 runtime?:{allowInMemoryInProduction?:boolean;maxUploadBytes?:number};
 /** Per-capability overrides keyed by catalog IDs (not automatic implementations). */
 features?:Record<string,FeatureSettings>;
 tenancy?:{enabled?:boolean;enforceContext?:boolean};
 auth?:{enabled?:boolean;apiKeys?:{enabled?:boolean;defaultTtlDays?:number}};
 access?:{enabled?:boolean;enforceOnServices?:boolean;defaultDecision?:'allow'|'deny'};
 security?:{scanner?:{enabled?:boolean;root?:string;allowedHosts?:string[];enabledScannerIds?:string[];adapters?:Record<string,ScannerAdapter>;reports?:ScanOptions['reports'];dns?:ScanOptions['dns'];threatIntelligence?:ScanOptions['threatIntelligence']};defender?:DefenderConfig};
 billing?:{enabled?:boolean;currency?:string};
 storage?:{enabled?:boolean;provider?:'memory'|'custom';maxUploadBytes?:number;authorizeObject?:(ctx:ActorContext,action:'read'|'write'|'delete'|'list',key:string)=>Promise<boolean>|boolean};
 notifications?:{enabled?:boolean;provider?:string};
 payments?:PaymentConfig;
 audit?:{enabled?:boolean};
 analytics?:{enabled?:boolean};
 featureFlags?:{enabled?:boolean};
 workflows?:{enabled?:boolean;maxAttempts?:number};
 observability?:{enabled?:boolean};
 hooks?:{
   resolveRequestContext?:(req:HttpRequest)=>ActorContext|undefined|Promise<ActorContext|undefined>;
   onError?:(error:Error)=>void;
 };
 providers?:SaplingProviders;
}
export interface ResolvedConfig extends SaplingConfig {
 runtime:{allowInMemoryInProduction:boolean;maxUploadBytes:number};
 tenancy:{enabled:boolean;enforceContext:boolean};
 auth:{enabled:boolean;apiKeys:{enabled:boolean;defaultTtlDays:number}};
 access:{enabled:boolean;enforceOnServices:boolean;defaultDecision:'allow'|'deny'};
 security:{scanner:{enabled:boolean;root?:string;allowedHosts?:string[];enabledScannerIds?:string[];adapters?:Record<string,ScannerAdapter>;reports?:ScanOptions['reports'];dns?:ScanOptions['dns'];threatIntelligence?:ScanOptions['threatIntelligence']};defender:DefenderConfig};
 billing:{enabled:boolean;currency:string};
 storage:{enabled:boolean;provider:'memory'|'custom';maxUploadBytes:number;authorizeObject?:NonNullable<SaplingConfig['storage']>['authorizeObject']};
 notifications:{enabled:boolean;provider:string};
 payments:PaymentConfig & {enabled:boolean;provider:NonNullable<PaymentConfig['provider']>};
 audit:{enabled:boolean};analytics:{enabled:boolean};featureFlags:{enabled:boolean};
 workflows:{enabled:boolean;maxAttempts:number};observability:{enabled:boolean};
}
export {SaasIdentityError as SaplingError} from '@saplings/kingsman';
