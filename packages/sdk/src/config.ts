import {LocalBroker,MemoryEventJournal,MemoryConnectionAdmission,MemoryHierarchicalAdmission} from '@saplings/realtime';
import type {SaplingConfig,ResolvedConfig} from './types.js';
import {InMemoryStore} from './store.js';
import {InMemoryStorage} from './storage.js';
import {SaplingError} from './types.js';
import {saasFeatures,securityScanners} from '@saplings/catalog';
/** Single strongly typed configuration entry point. No unknown keys are silently activated. */
export function defineSaplingConfig<T extends SaplingConfig>(config:T):T{return config;}
export function resolveSaplingConfig(config:SaplingConfig):ResolvedConfig {
 if(!config || !config.app?.id?.trim())throw new SaplingError('CONFIG_INVALID','app.id is required');
 if(!['development','test','production'].includes(config.app.environment))throw new SaplingError('CONFIG_INVALID','Valid app.environment is required');
 const known=new Set(saasFeatures.map(f=>f.id));
 for(const [id,settings] of Object.entries(config.features??{})) {
  if(!known.has(id))throw new SaplingError('UNKNOWN_FEATURE',`Unrecognized feature id ${id}`);
  for(const [action,policy] of Object.entries(settings?.actions??{})){const operations=saasFeatures.find(f=>f.id===id)?.operations?.split(';').map(a=>a.trim())??[];if(!operations.includes(action))throw new SaplingError('CONFIG_INVALID',`Unknown configured action for ${id}:${action}`);if(!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(action)||!policy||typeof policy!=='object'||policy.authorize!==undefined&&typeof policy.authorize!=='function'||policy.inputSchema!==undefined&&typeof policy.inputSchema.safeParseAsync!=='function'||policy.outputSchema!==undefined&&typeof policy.outputSchema.safeParseAsync!=='function')throw new SaplingError('CONFIG_INVALID',`Invalid action policy for ${id}:${action}`);}
  if(settings?.enabled!==undefined && typeof settings.enabled!=='boolean')throw new SaplingError('CONFIG_INVALID',`Invalid feature toggle: ${id}`);
 }
 const scannerIds=new Set(securityScanners.map(s=>s.id));
 for(const id of config.security?.scanner?.enabledScannerIds??[])if(!scannerIds.has(id))throw new SaplingError('UNKNOWN_SCANNER',`Unrecognized scanner id ${id}`);
 if(config.platforms?.harbor&&config.platforms?.gateway||config.platforms?.kingsman&&config.platforms?.identity)throw new SaplingError('CONFIG_INVALID','Use harbor/kingsman or deprecated gateway/identity aliases, not both');
 if(config.services&&config.expanded)throw new SaplingError('CONFIG_INVALID','Use services or legacy expanded, not both');
 const {expanded:legacyServices,...rest}=config;
 const resolved:ResolvedConfig={...rest,services:config.services??legacyServices,
  runtime:{allowInMemoryInProduction:false,maxUploadBytes:10*1024*1024,...config.runtime},
  tenancy:{enabled:true,enforceContext:true,...config.tenancy},
  auth:{enabled:true,apiKeys:{enabled:true,defaultTtlDays:90,...config.auth?.apiKeys}},
  access:{enabled:true,enforceOnServices:true,defaultDecision:'deny',...config.access},
  security:{scanner:{enabled:true,...config.security?.scanner},defender:{enabled:true,mode:'block',blockThreshold:80,alertThreshold:45,rateLimit:{enabled:true,maxRequests:120,windowMs:60000},...config.security?.defender}},
  billing:{enabled:true,currency:'INR',...config.billing},
  storage:{enabled:true,provider:'memory',maxUploadBytes:10*1024*1024,...config.storage},
  notifications:{enabled:true,provider:'custom',...config.notifications},
  payments:{enabled:true,...config.payments,provider:config.payments?.provider??(config.providers?.payments?(config.providers.payments.name as NonNullable<ResolvedConfig['payments']['provider']>??'custom'):'cashfree')},
  audit:{enabled:true,...config.audit}, analytics:{enabled:true,...config.analytics},
  featureFlags:{enabled:true,...config.featureFlags},
  workflows:{enabled:true,maxAttempts:3,...config.workflows},observability:{enabled:true,...config.observability}
 };
 if(!['cashfree','razorpay','stripe','custom'].includes(resolved.payments.provider))throw new SaplingError('CONFIG_INVALID','Unknown payment provider');
 if(config.providers?.payments && (config.providers.payments.name??'custom')!==resolved.payments.provider)throw new SaplingError('CONFIG_INVALID','Injected payment adapter must match selected provider');
 if(resolved.app.environment==='production'&&resolved.payments.enabled&&resolved.payments.cashfree&&resolved.payments.provider==='cashfree'&&resolved.payments.cashfree.environment!=='production')throw new SaplingError('INSECURE_CONFIG','Production Cashfree requires explicit production environment');
 const defender=resolved.security.defender;for(const n of [defender.blockThreshold,defender.alertThreshold])if(typeof n!=='number'||!Number.isFinite(n)||n<1||n>100)throw new SaplingError('CONFIG_INVALID','Defender thresholds must be between 1 and 100');
 const rt=defender.rateLimit;
 if(rt?.maxRequests!==undefined && (!Number.isInteger(rt.maxRequests)||rt.maxRequests<1))throw new SaplingError('CONFIG_INVALID','Invalid rate limit maxRequests');
 if(rt?.windowMs!==undefined && rt.windowMs<1000)throw new SaplingError('CONFIG_INVALID','Invalid rate limit windowMs');
 if(resolved.runtime.maxUploadBytes<1||resolved.storage.maxUploadBytes<1)throw new SaplingError('CONFIG_INVALID','maxUploadBytes must be positive');
 if(resolved.services?.encryptionKey&&resolved.services.encryptionKey.byteLength!==32)throw new SaplingError('CONFIG_INVALID','Encryption key must be 32 bytes');
 if(resolved.middleware?.timeoutMs!==undefined&&(!Number.isSafeInteger(resolved.middleware.timeoutMs)||resolved.middleware.timeoutMs<1||resolved.middleware.timeoutMs>3600000))throw new SaplingError('CONFIG_INVALID','Invalid HTTP deadline');
 if(resolved.middleware?.requestLogging&&!resolved.middleware.log)throw new SaplingError('CONFIG_INVALID','Request logging requires a callback');
 if(resolved.realtime?.enabled===true&&(!resolved.realtime.authenticate||!resolved.realtime.authorize))throw new SaplingError('CONFIG_INVALID','Realtime authentication and authorization required');
 if(resolved.app.environment==='production') {
  if(resolved.services?.offboarding&&!resolved.services.offboarding.legalHold)throw new SaplingError('INSECURE_CONFIG','Production offboarding requires a legal-hold policy');
  if(resolved.realtime?.enabled===true&&(resolved.realtime.admission instanceof MemoryConnectionAdmission||resolved.realtime.admission instanceof MemoryHierarchicalAdmission))throw new SaplingError('INSECURE_CONFIG','Production admission requires shared storage');
  if(resolved.realtime?.enabled===true&&(resolved.realtime.journal?resolved.realtime.journal instanceof MemoryEventJournal:!resolved.realtime.broker||resolved.realtime.broker instanceof LocalBroker))throw new SaplingError('INSECURE_CONFIG','Production realtime requires a shared broker or persistent journal');
  if(resolved.runtime.allowInMemoryInProduction||resolved.providers?.store instanceof InMemoryStore||resolved.providers?.storage instanceof InMemoryStorage)throw new SaplingError('INSECURE_CONFIG','Volatile production state is prohibited');
  if(!resolved.providers?.store)throw new SaplingError('PRODUCTION_STORE_REQUIRED','Provide a persistent store adapter in production');
  if(resolved.storage.enabled && !resolved.providers?.storage)throw new SaplingError('PRODUCTION_STORAGE_REQUIRED','Provide a persistent storage adapter in production');
  if(resolved.tenancy.enforceContext&&!resolved.hooks?.resolveRequestContext&&!resolved.providers?.authentication)throw new SaplingError('PRODUCTION_CONTEXT_REQUIRED','Provide verified resolveRequestContext in production');
  if(!resolved.providers?.store?.transaction)throw new SaplingError('TRANSACTION_REQUIRED','Production store must implement transactions');
  if(!resolved.audit.enabled||!resolved.tenancy.enabled||!resolved.auth.enabled||resolved.security.defender.rateLimit?.enabled===false||!resolved.access.enabled||!resolved.access.enforceOnServices||resolved.access.defaultDecision!=='deny'||!resolved.tenancy.enforceContext||!resolved.security.defender.enabled||resolved.security.defender.mode!=='block')throw new SaplingError('INSECURE_CONFIG','Production requires fail-closed access, tenant context and blocking defender');
  if(resolved.security.defender.policy?.csrf?.enabled&&!resolved.security.defender.policy.csrf.verifyToken)throw new SaplingError('INSECURE_CONFIG','Cookie CSRF requires a session-bound token verifier in production');
  if(resolved.security.defender.excludedPaths?.length)throw new SaplingError('INSECURE_CONFIG','Production defender path exclusions prohibited; use scoped policies instead');
  if(resolved.security.defender.policy?.failureMode==='monitor')throw new SaplingError('INSECURE_CONFIG','Production distributed rate limiter must fail closed');
 }
 return resolved;
}
