import type {FeatureId,FeatureAction} from './feature-types.js';
export type * from './feature-types.js';
import {RealtimeHub} from '@sapling/realtime';
import {Gateway,GatewayError,GatewayTransactionalBanStore,GatewayTransactionalRateLimitStore,GatewayHttpPolicies} from '@sapling/harbor';
import {IdentityPlatform} from '@sapling/kingsman';
import {createMiddleware,errorHandler} from '@sapling/middleware';
import {randomUUID} from 'node:crypto';
export * from './providers.js';
export * from './recurring.js';
export * from './offboarding.js';
import {StoreRateState} from './security-state.js';
export {StoreRateState} from './security-state.js';
import {timeout} from './reliability.js';
import {WorkerRuntime} from './worker.js';
import {SaasServicesRegistry} from './registry.js';
export * from './reliability.js';
export {EnvelopeCrypto,validateRecord} from './data.js';
import {Defender} from '@sapling/security';
import type {HttpRequest,HttpResponse,HttpNext} from '@sapling/security';
import {runScan} from '@sapling/security';
import {saasFeatures,securityScanners} from '@sapling/catalog';
import {resolveSaplingConfig,defineSaplingConfig} from './config.js';
import type {ActorContext,SaplingConfig,ResolvedConfig,Store} from './types.js';
import {SaplingError} from './types.js';
import {InMemoryStore} from './store.js';
import {InMemoryStorage,StorageService} from './storage.js';
import {AuditService} from './audit.js';
import {AccessService} from './access.js';
import {ResourceService} from './resources.js';
import {IdentityService} from './identity.js';
import {BillingService} from './billing.js';
import {FlagService} from './flags.js';
import {JobService} from './jobs.js';
import {EventService,NotificationService,PaymentService,WebhookService,TelemetryService} from './integrations.js';
import {CashfreeAdapter,CashfreeWebhookAdapter} from './cashfree.js';
import {RazorpayWebhookAdapter} from './razorpay-webhook.js';
import {StripePaymentAdapter} from './stripe-payment.js';
import {RazorpayAdapter} from './integrations.js';
import {CapabilityService} from './capabilities.js';

export {defineSaplingConfig,resolveSaplingConfig,SaplingError,InMemoryStore,InMemoryStorage,
 AuditService,AccessService,ResourceService,IdentityService,BillingService,FlagService,
 JobService,EventService,NotificationService,PaymentService,WebhookService,TelemetryService,CapabilityService};
export {RazorpayAdapter} from './integrations.js';
export * from './cashfree.js';
export * from './stripe-payment.js';
export {Defender,runScan} from '@sapling/security';
export {Gateway,GatewayError,GatewayHttpPolicies} from '@sapling/harbor';
export {IdentityPlatform as Kingsman} from '@sapling/kingsman';
export {Gateway as Harbor} from '@sapling/harbor';
export {IdentityPlatform,MemoryIdentityStore,IdentityError,createIdentityHttpHandler} from '@sapling/kingsman';
export {saasFeatures,securityScanners,coverageSummary} from '@sapling/catalog';
export type * from './types.js';
export type {DefenderConfig,ThreatEvent,ScanOptions,ScanResult} from '@sapling/security';

export class SaplingSDK {
 readonly config:ResolvedConfig;
 readonly realtime?:RealtimeHub;
/** Renamed reusable Harbor gateway. */
 readonly harbor?:Gateway;
 /** Renamed reusable Kingsman identity realm. */
 readonly kingsman?:IdentityPlatform;
 /** @deprecated Use harbor. This is a view, not a second gateway instance. */
 get gateway():Gateway|undefined{return this.harbor;}
 /** @deprecated Use kingsman. This is a view, not a second identity instance. */
 get identityPlatform():IdentityPlatform|undefined{return this.kingsman;}
 readonly store:Store;
 readonly audit:AuditService;
 readonly access:AccessService;
 readonly identity:IdentityService;
 readonly billing:BillingService;
 readonly flags:FlagService;
 readonly jobs:JobService;
 readonly storage:StorageService;
 readonly notifications:NotificationService;
 readonly payments:PaymentService;
 readonly webhooks:WebhookService;
 readonly telemetry:TelemetryService;
 /** Harbor-owned API contracts; does not perform ingress auth by itself. */
 readonly httpPolicies=new GatewayHttpPolicies();
 readonly events:EventService;
 readonly defender:Defender;
 readonly capabilities:CapabilityService;
 readonly #services:SaasServicesRegistry;
 /** providerWorkflows service. */
 get providerWorkflows():import('./provider-workflow.js').ProviderWorkflow{return this.#services.providerWorkflows;}
 /** governance service. */
 get governance():import('./governance.js').GovernanceService{return this.#services.governance;}
 /** domains service. */
 get domains():import('./domain-policy.js').DomainPolicyService{return this.#services.domains;}
 /** providerOperations service. */
 get providerOperations():import('./provider-operations.js').ProviderOperations{return this.#services.providerOperations;}
 /** recurring service. */
 get recurring():import('./recurring.js').RecurringBilling{return this.#services.recurring;}
 /** offboarding service. */
 get offboarding():import('./offboarding.js').TenantOffboarding{return this.#services.offboarding;}
 /** impersonation service. */
 get impersonation():import('./impersonation.js').ImpersonationService{return this.#services.impersonation;}
 /** operations service. */
 get operations():import('./operations.js').Operations{return this.#services.operations;}
 /** accounts service. */
 get accounts():import('./accounts.js').Accounts{return this.#services.accounts;}
 /** commerce service. */
 get commerce():import('./commerce.js').Commerce{return this.#services.commerce;}
 /** data service. */
 get data():import('./data.js').DataService{return this.#services.data;}
 /** analytics service. */
 get analytics():import('./analytics.js').Analytics{return this.#services.analytics;}
 /** automation service. */
 get automation():import('./automation.js').Automation{return this.#services.automation;}
 /** lifecycle service. */
 get lifecycle():import('./reliability.js').Lifecycle{return this.#services.lifecycle;}
 /** metrics service. */
 get metrics():import('./reliability.js').Metrics{return this.#services.metrics;}
 readonly worker:WorkerRuntime;
 readonly organizations:ResourceService;
 readonly workspaces:ResourceService;
 readonly projects:ResourceService;
 readonly teams:ResourceService;
 readonly memberships:ResourceService;
 readonly eventsRepository:ResourceService;
 readonly appConfig:ResourceService;
 readonly activity:ResourceService;
 constructor(config:SaplingConfig) {
  this.config=resolveSaplingConfig(config);
  if(this.config.realtime?.enabled===true)this.realtime=new RealtimeHub(this.config.realtime);
  this.store=config.providers?.store??new InMemoryStore();
  this.audit=new AuditService(this.store,this.config.audit.enabled);
  this.access=new AccessService(this.store,this.config.access);
  this.identity=new IdentityService(this.store,this.access,this.audit,this.config.auth.apiKeys.defaultTtlDays);
  const selectedKingsman=config.platforms?.kingsman??config.platforms?.identity;
  if(selectedKingsman){const {config:realm,dependencies={}}=selectedKingsman;if(realm.metadata.environment==='production'&&this.store instanceof InMemoryStore&&!dependencies.store)throw new SaplingError('INSECURE_CONFIG','Production realms require a persistent store');this.kingsman=new IdentityPlatform(realm,{...dependencies,store:dependencies.store??(this.store.transaction?this.store as unknown as import('@sapling/kingsman').IdentityStore:undefined)});}
  const selectedHarbor=config.platforms?.harbor??config.platforms?.gateway;
  if(selectedHarbor){const {config:gw,dependencies={}}=selectedHarbor;const verification=dependencies.verifyJwt??(this.kingsman?async (token:string,policy:{realmRef:string;audiences:string[];algorithms?:string[];clockSkewMs?:number})=>{if(policy.realmRef!==this.kingsman!.realm||policy.algorithms?.some(a=>a!=='RS256'))throw new GatewayError('INVALID_REALM','Gateway realm/alg mismatch',401);return this.kingsman!.verifyAccessToken(token,{audiences:policy.audiences,clockSkewMs:policy.clockSkewMs});}:undefined);const shared=this.store.transaction?this.store as unknown as import('@sapling/harbor').GatewayStateStore:undefined;
   const keyVerifier=dependencies.verifyApiKey??(dependencies.keyTenantForRequest?async(key:string,context:import('@sapling/harbor').GatewayContext)=>{const tenantId=await dependencies.keyTenantForRequest!(context);if(!tenantId)return undefined;const verified=await this.identity.verifyApiKey(tenantId,key);return verified?{sub:verified.id,tenantId,scopes:verified.scopes}:undefined;}:undefined);
   this.harbor=new Gateway(gw,{...dependencies,verifyJwt:verification,verifyApiKey:keyVerifier,
    rateLimit:dependencies.rateLimit??(shared?new GatewayTransactionalRateLimitStore(shared):undefined),
    ddosBans:dependencies.ddosBans??(shared?new GatewayTransactionalBanStore(shared):undefined)});}
  this.billing=new BillingService(this.store,this.access,this.audit);
  this.flags=new FlagService(this.store,this.access,this.audit);
  this.jobs=new JobService(this.store,this.audit,this.config.workflows.maxAttempts);
  this.storage=new StorageService(config.providers?.storage??new InMemoryStorage(),this.access,this.audit,this.config.storage.maxUploadBytes,this.config.storage.authorizeObject);
  this.notifications=new NotificationService(config.providers?.notifications,this.audit);
  const p=this.config.payments;
  const paymentAdapter=!p.enabled?undefined:config.providers?.payments??(p.provider==='cashfree'&&p.cashfree?new CashfreeAdapter(p.cashfree):p.provider==='razorpay'&&p.razorpay?new RazorpayAdapter(p.razorpay.keyId,p.razorpay.secret):p.provider==='stripe'&&p.stripe?new StripePaymentAdapter(p.stripe.secret):undefined);
  this.payments=new PaymentService(paymentAdapter,this.audit,this.store,this.access,p.provider);
  const paymentCapabilities:Record<string,import("./types.js").FeatureAdapter>=paymentAdapter instanceof CashfreeAdapter?{'SAAS-050':new CashfreeWebhookAdapter(this.store,paymentAdapter)}:paymentAdapter instanceof RazorpayAdapter&&p.razorpay?.webhookSecret?{'SAAS-050':new RazorpayWebhookAdapter(this.store,p.razorpay.webhookSecret)}:{};
  this.webhooks=new WebhookService();
  this.telemetry=new TelemetryService(config.providers?.telemetry);
  this.events=new EventService();
  const security=this.config.security.defender;
  this.defender=new Defender({...security,policy:{...security.policy,rateState:security.policy?.rateState??(config.providers?.store?.transaction?new StoreRateState(this.store):undefined)},onThreat:async event=>{await this.store.put(event.tenantId??'__sapling_security_events','security-events',{...event});await security.onThreat?.(event);},onAlert:async event=>{await this.store.put(event.tenantId??'__sapling_security_events','security-incidents',{...event,status:'open'});await security.onAlert?.(event);}});

  this.organizations=new ResourceService('organizations',this.store,this.access,this.audit);
  this.workspaces=new ResourceService('workspaces',this.store,this.access,this.audit);
  this.projects=new ResourceService('projects',this.store,this.access,this.audit);
  this.teams=new ResourceService('teams',this.store,this.access,this.audit);
  this.memberships=new ResourceService('memberships',this.store,this.access,this.audit);
  this.eventsRepository=new ResourceService('events',this.store,this.access,this.audit);
  this.appConfig=new ResourceService('app-config',this.store,this.access,this.audit);
  this.activity=new ResourceService('activity',this.store,this.access,this.audit);
  this.#services=new SaasServicesRegistry(this);
  this.worker=new WorkerRuntime(this,this.config.services?.worker);
  const gates:Record<string,boolean>={identity:this.config.auth.enabled,tenancy:this.config.tenancy.enabled,billing:this.config.billing.enabled,storage:this.config.storage.enabled,notifications:this.config.notifications.enabled,analytics:this.config.analytics.enabled,workflows:this.config.workflows.enabled};
  const settings=Object.fromEntries(saasFeatures.map(f=>[f.id,{...config.features?.[f.id],enabled:gates[f.module]===false||(!p.enabled&&['SAAS-042','SAAS-043','SAAS-047','SAAS-050'].includes(f.id))?false:config.features?.[f.id]?.enabled??true}]));
  const manifest=this.#services.manifest();this.capabilities=new CapabilityService(settings,{...this.#services.adapters(),...paymentCapabilities,...config.providers?.capabilities},this.access,Object.fromEntries(manifest.map(m=>[m.featureId,m.actions])),manifest.filter(m=>m.kind==='provider').map(m=>m.featureId),Object.keys({...paymentCapabilities,...config.providers?.capabilities}),async(ctx,id)=>{if(id==='SAAS-024')return;const profile=await this.store.get<{status:string}>(ctx.tenantId,'tenant-profile','profile');if(profile&&['offboarding','offboarded'].includes(profile.status))throw new SaplingError('TENANT_FROZEN','Tenant is offboarding',403);});

 }
 /** Runs an async trusted context resolver before the in-process runtime defender. */
 middleware() {
  return async (req:HttpRequest,res:HttpResponse,next:HttpNext) => {
   try {
    let context=await this.config.hooks?.resolveRequestContext?.(req);
    const auth=req.headers.authorization;
    if(!context&&typeof auth==='string'&&auth.startsWith('Bearer ')&&this.config.providers?.authentication){const verified=await this.config.providers.authentication.verifyAccessToken(auth.slice(7));if(verified)context={tenantId:verified.tenantId,actorId:verified.userId,roles:verified.roles,permissions:verified.permissions};}
    if(context?.tenantId.startsWith('__sapling_'))throw new SaplingError('INVALID_TENANT','Reserved tenant namespace',403);
    delete req.sapling;
    if(context)req.sapling={impersonatorId:context.impersonatorId,tenantId:context.tenantId,userId:context.actorId,correlationId:context.correlationId??randomUUID(),roles:context.roles,permissions:context.permissions};
    // Analyze unauthenticated requests too: otherwise login probing never reaches the defender.
    await this.defender.middleware()(req,res,(err)=>{
      if(err){next(err);return;}
      if(this.config.tenancy.enabled&&this.config.tenancy.enforceContext&&
         !context?.tenantId&&!['/health','/ready'].includes((req.path??req.url??'').split('?')[0])){
        res.statusCode=401;res.setHeader('content-type','application/json');
        res.end(JSON.stringify({error:{code:'CONTEXT_REQUIRED',message:'Authenticated tenant context required'}}));return;
      }
      next();
    });
   }catch(e){next(e);}
  };
 }
 /** Optional general HTTP middleware; install after trusted context, before route handlers. */
 httpMiddleware(){return createMiddleware(this.config.middleware??{});}
 httpErrorHandler(){return errorHandler(this.config.middleware??{});}
 async closeRealtime(){await this.realtime?.close();}
 /** Authorization must be called by route handlers for resource/action-specific checks. */
 async authorize(ctx:ActorContext,permission:string,resource?:Record<string,unknown>){return this.access.require(ctx,permission,resource);}
 /** Catalog metadata; does not expose the mutable internal registry. */
 featureManifest(){return this.#services.manifest();}
 /** Typed catalog invocation; provider payloads/results remain unknown until validated by the consumer. */
 invokeCapability<I extends FeatureId>(ctx:ActorContext,id:I,action:FeatureAction<NoInfer<I>>,input:import('./types.js').JsonRecord={}){return this.capabilities.invoke(ctx,id,action,input);}
 getCapability(featureId:FeatureId){return this.capabilities.get(featureId);}
 listCapabilities(){return this.capabilities.list();}
 async scan(root:string,url?:string,allowedHosts?:string[]){
  if(!this.config.security.scanner.enabled)throw new SaplingError('SCANNER_DISABLED','Scanner is disabled');
  return runScan({root,url,allowedHosts:allowedHosts??this.config.security.scanner.allowedHosts, adapters:this.config.security.scanner.adapters,
   enabledScannerIds:this.config.security.scanner.enabledScannerIds,reports:this.config.security.scanner.reports,dns:this.config.security.scanner.dns,threatIntelligence:this.config.security.scanner.threatIntelligence});
 }
 /** Export only approved tenant data and fields. Paginates from the store; never bypasses configured domain policies. */
 async exportTenantData(ctx:ActorContext,collections:string[]=['organizations','workspaces','projects','teams','memberships','events','activity']){
  await this.access.require(ctx,'data:export');
  if(!ctx.tenantId||ctx.tenantId.startsWith('__sapling_')||!ctx.actorId)throw new SaplingError('FORBIDDEN','Invalid export context',403);
  const approved=new Set(['organizations','workspaces','projects','teams','memberships','events','activity','app-config']);
  if(!Array.isArray(collections)||!collections.length||collections.length>approved.size||new Set(collections).size!==collections.length)throw new SaplingError('EXPORT_INVALID','Invalid export collections',400);
  const data:Record<string,unknown[]>={};let total=0;
  for(const collection of collections){
   if(!approved.has(collection))throw new SaplingError('EXPORT_NOT_ALLOWED',`Export of ${collection} is not permitted`,403);
   if(this.config.app.environment==='production'&&!this.domains.hasPolicy(collection))throw new SaplingError('DOMAIN_POLICY_REQUIRED',`Configure row and field export policy for ${collection}`,503);
   if(this.config.app.environment==='production'&&!this.store.page)throw new SaplingError('EXPORT_PAGINATION_REQUIRED','Bounded store paging is required',503);
   const out:unknown[]=[];let after:string|undefined;const cursors=new Set<string>();
   for(;;){
    const result=this.domains.hasPolicy(collection)?await this.domains.list(ctx,collection,{limit:250,after}):this.store.page?await this.store.page<{id:string}&Record<string,unknown>>(ctx.tenantId,collection,250,after):{items:(await this.store.list<{id:string}&Record<string,unknown>>(ctx.tenantId,collection)),next:undefined};
    for(const item of result.items){
     if(this.domains.hasPolicy(collection)||await this.access.has(ctx,`${collection}:read`,item as Record<string,unknown>)){out.push(item);if(++total>5000)throw new SaplingError('EXPORT_LIMIT','Export exceeds 5000 authorized rows; use an approved async export worker',413);}
    }
    if(!result.next)break;
    if(cursors.has(result.next)||result.next===after)throw new SaplingError('EXPORT_CURSOR','Store pagination failed to advance',502);
    cursors.add(result.next);after=result.next;
   }
   data[collection]=out;
  }
  await this.audit.record(ctx,'tenant.exported','data',undefined,{collections,rowCount:total});
  return {tenantId:ctx.tenantId,exportedAt:new Date().toISOString(),collections:data};
 }
 health(){return {status:'ok',app:this.config.app.id,environment:this.config.app.environment,at:new Date().toISOString()};}
 async readiness(){if(!this.lifecycle.ready)return {status:'not-ready',reason:'shutting down'};if(!this.store.health)return {status:'degraded',reason:'Store health check unavailable'};const checks={...this.config.services?.operations?.readiness,database:()=>this.store.health!()};const result=await Promise.all(Object.entries(checks).map(async([name,check])=>{try{await timeout(()=>check(),3000);return [name,true] as const;}catch{return [name,false] as const;}}));return {status:result.every(([,ok])=>ok)?'ready':'not-ready',checks:Object.fromEntries(result)};}
}
export function createSapling(config:SaplingConfig):SaplingSDK {return new SaplingSDK(config);}

export * from "./valkey.js";

export * from "./razorpay-webhook.js";
export * from './federation.js';
export * from './totp.js';

export * from "./worker.js";
export * from './operations.js';
export * from './control-plane.js';
export * from './media.js';

export * from "./impersonation.js";

export type * from './quality-config.js';

export * from "./http-idempotency.js";
export * from './provider-operations.js';
export * from './stripe-recurring.js';

export * from "./transactional-processing.js";

export * from './governance.js';
export * from './domain-policy.js';
export * from './billing-policy.js';

export * from './provider-workflow.js';

export type {Accounts} from './accounts.js';
export type {Commerce} from './commerce.js';
export type {DataService} from './data.js';
export type {Analytics} from './analytics.js';
export type {Automation} from './automation.js';

export * from './business-workflows.js';
