from pathlib import Path
import json, csv, collections
base=Path(__file__).resolve().parents[1]
sets={
 'Identity & access':('identity', '''User registration|Passwordless authentication|Email verification|Password reset|Login and logout|Session management|JWT validation|API key lifecycle|MFA and step-up auth|SSO and SAML|OAuth2 and OIDC|Social login|Device trust|Service accounts|Role-based authorization|Attribute-based authorization|Permission policies|Account lockout'''),
 'Tenancy & organization':('tenancy', '''Tenant provisioning|Tenant identification|Tenant isolation|Tenant context propagation|Tenant data residency|Tenant offboarding|Organizations|Workspaces|Projects|Teams|Membership management|User invitations|Organization switching|Custom roles|Impersonation controls'''),
 'Billing & monetization':('billing', '''Plans and tiers|Subscriptions|Subscription lifecycle|Free trials|Usage metering|Quotas|Entitlements|Invoices|Payment collection|Payment methods|Tax calculation|Coupons and discounts|Credits and wallets|Refunds|Dunning and retries|Revenue metrics|Webhooks for billing'''),
 'Security & governance':('security', '''Security scanner|Runtime threat defender|Secrets management|Encryption at rest|Encryption in transit|HTTP security headers|CORS policy|CSRF controls|Rate limiting|Abuse detection|Data retention|Data deletion|Consent management|Privacy export|Audit trail|IP allowlists|IP denylists|Security incident alerts|Vulnerability management|Compliance evidence'''),
 'Communications':('notifications', '''Transactional email|Bulk email|SMS|Push notifications|In-app notifications|Notification templates|User notification preferences|Delivery tracking|Notification retries|Notification opt-out|Webhooks for notifications|Multilingual notifications'''),
 'Data & content':('storage', '''Object storage|File uploads|Presigned download URLs|File metadata|File versions|Document management|Import pipelines|Data export|Backup and restore|Data migrations|Full-text search|CDN integration|Media processing|Data validation|Soft delete|Data archival|Data masking'''),
 'Analytics & insights':('analytics', '''Product events|User identification|Group analytics|Funnels|Retention analysis|Cohort analysis|Dashboards|Reports|Scheduled reports|Custom metrics|Error tracking|Experiment analytics|Usage analytics'''),
 'Workflows & automation':('workflows', '''Background jobs|Scheduled jobs|Job retries|Dead-letter queue|Workflow orchestration|Approval workflows|Business rules|Event-driven automation|Webhook triggers|Idempotency|Outbox pattern'''),
 'APIs & developer tools':('developer', '''REST API patterns|GraphQL APIs|OpenAPI specification|SDK clients|API versioning|API pagination|API filtering|API rate-limit headers|Developer portal|API key scopes|Webhook signing|Webhook delivery|Event bus|Correlation IDs|Error envelope'''),
 'Product configuration':('configuration', '''Feature flags|Percentage rollouts|A/B experiments|Environment configuration|Tenant configuration|Remote configuration|Plugins|Custom integrations|White labeling|Custom domains|Localization|Timezone handling|Theme configuration|App branding|Maintenance mode'''),
 'Operations & reliability':('operations', '''Structured logging|Distributed tracing|Request metrics|Application health|Readiness checks|Circuit breaker|Retry with backoff|Timeouts|Bulkheads|SLO and SLI|Alerting|Deployment pipelines|Environment provisioning|Horizontal scaling|Disaster recovery|Graceful shutdown|Configuration validation'''),
 'Business & collaboration':('business', '''Comments|Activity feeds|Task assignments|Approval history|Shared resources|Contacts and accounts|User directories|Helpdesk tickets|Feedback collection|Admin console|Usage policies|Data ownership transitions''')
}
native={
 'API key lifecycle','Role-based authorization','Attribute-based authorization','Permission policies',
 'Tenant identification','Tenant context propagation','Tenant isolation','Organizations','Workspaces','Projects','Teams','Membership management',
 'Plans and tiers','Usage metering','Quotas','Entitlements',
 'Runtime threat defender','Audit trail','Rate limiting','Abuse detection','HTTP security headers','Security incident alerts',
 'Object storage','File uploads','File metadata','File versions','Data export','Data validation',
 'Product events','User identification','Usage analytics',
 'Background jobs','Scheduled jobs','Job retries','Dead-letter queue','Business rules','Idempotency',
 'API pagination','Webhook signing','Event bus','Correlation IDs','Error envelope',
 'Feature flags','Percentage rollouts','A/B experiments','Environment configuration','Tenant configuration',
 'Structured logging','Application health','Readiness checks','Retry with backoff','Timeouts','Configuration validation',
 'Activity feeds'
}
adapter={
 'User registration','Passwordless authentication','Email verification','Password reset','Login and logout','Session management','JWT validation','MFA and step-up auth','SSO and SAML','OAuth2 and OIDC','Social login','Device trust','Service accounts','Account lockout',
 'Tenant provisioning','Tenant data residency','Tenant offboarding','User invitations','Organization switching','Custom roles','Impersonation controls',
 'Subscriptions','Subscription lifecycle','Free trials','Invoices','Payment collection','Payment methods','Tax calculation','Coupons and discounts','Credits and wallets','Refunds','Dunning and retries','Revenue metrics','Webhooks for billing',
 'Security scanner','Secrets management','Encryption at rest','Encryption in transit','CORS policy','CSRF controls','Data retention','Data deletion','Consent management','Privacy export','IP allowlists','IP denylists','Vulnerability management','Compliance evidence',
 'Transactional email','Bulk email','SMS','Push notifications','In-app notifications','Notification templates','User notification preferences','Delivery tracking','Notification retries','Notification opt-out','Webhooks for notifications','Multilingual notifications',
 'Presigned download URLs','Document management','Import pipelines','Backup and restore','Data migrations','Full-text search','CDN integration','Media processing','Soft delete','Data archival','Data masking',
 'Group analytics','Funnels','Retention analysis','Cohort analysis','Dashboards','Reports','Scheduled reports','Custom metrics','Error tracking','Experiment analytics',
 'Workflow orchestration','Approval workflows','Event-driven automation','Webhook triggers','Outbox pattern',
 'REST API patterns','GraphQL APIs','OpenAPI specification','SDK clients','API versioning','API filtering','API rate-limit headers','Developer portal','API key scopes','Webhook delivery',
 'Remote configuration','Plugins','Custom integrations','White labeling','Custom domains','Localization','Timezone handling','Theme configuration','App branding','Maintenance mode',
 'Distributed tracing','Request metrics','Circuit breaker','Bulkheads','SLO and SLI','Alerting','Deployment pipelines','Environment provisioning','Horizontal scaling','Disaster recovery','Graceful shutdown',
 'Comments','Task assignments','Approval history','Shared resources','Contacts and accounts','User directories','Helpdesk tickets','Feedback collection','Admin console','Usage policies','Data ownership transitions'
}
features=[]
for group,(mod,txt) in sets.items():
 for n in txt.split('|'):
  features.append({'id':f'SAAS-{len(features)+1:03d}','category':group,'module':mod,'name':n,'delivery':'native' if n in native else 'adapter' if n in adapter else 'planned', 'status':'reference-implementation' if n in native else 'integration-contract' if n in adapter else 'planned'})
assert len(set(f['name'] for f in features))==len(features)
security=[
 ('Vulnerability','SQL Injection Scanner','adapter'),('Vulnerability','Cross-Site Scripting (XSS) Scanner','adapter'),('Configuration','Security Headers Scanner','native'),('Vulnerability','API Key Exposure Scanner','native'),('Configuration','SSL/TLS Security Scanner','native'),('Vulnerability','CORS Misconfiguration Scanner','native'),('Vulnerability','CSRF Protection Scanner','adapter'),('Configuration','Cookie & Session Security Scanner','native'),('Vulnerability','Authentication Flow Scanner','adapter'),('Infrastructure','DNS & Email Security Scanner','adapter'),('Vulnerability','Open Redirect Scanner','native'),('Vulnerability','GraphQL Security Scanner','adapter'),('Vulnerability','JWT Security Audit','adapter'),('Vulnerability','Tech Stack & CVE Scanner','adapter'),('Monitoring','Threat Intelligence Scanner','adapter'),('Compliance','Legal Compliance Scanner','adapter'),('Infrastructure','DDoS Protection Scanner','adapter'),('Vulnerability','File Upload Security Scanner','native'),('Monitoring','Audit Logging & Monitoring Scanner','adapter'),('Infrastructure','Mobile API Rate Limiting Scanner','adapter'),('Infrastructure','Domain Hijacking Detection','adapter'),('Vulnerability','Debug Endpoints Scanner','native'),('Vulnerability','Input Validation Scanner','native'),('Infrastructure','Vercel Hosting Security Scanner','adapter'),('Infrastructure','Netlify Hosting Security Scanner','adapter'),('Infrastructure','Cloudflare Security Scanner','adapter'),('Vulnerability','Dependency Vulnerability Scanner','adapter'),('Configuration','Supabase Security Scanner','adapter'),('Configuration','Firebase Security Scanner','adapter'),('Infrastructure','GitHub Repository Security Scanner','adapter'),('Vulnerability','Browser Storage & Session Token Scanner','native'),('Vulnerability','Source Code SAST Scanner','native'),('Vulnerability','Webhook Signature Verification Scanner','native'),('Vulnerability','IDOR & Broken Access Control Scanner','native'),('Vulnerability','Tenant Isolation Scanner','native'),('SEO & AEO','SEO Scanner','adapter'),('SEO & AEO','AEO Scanner (AI Visibility)','adapter'),('Monitoring','Uptime Monitoring & Status Pages','native'),('Performance','Performance & Core Web Vitals Scanner','adapter'),('Accessibility','Accessibility Scanner (WCAG)','adapter'),('Monitoring','Domain Watchtower','adapter')
]
assert len(security)==41
from collections import Counter
assert dict(Counter(x[0] for x in security))=={'Vulnerability':19,'Configuration':5,'Infrastructure':8,'Monitoring':4,'Compliance':1,'SEO & AEO':2,'Performance':1,'Accessibility':1}
scanners=[{'id':f'SCAN-{i:02d}','category':g,'name':n,'delivery':d,'status':'heuristic-or-passive' if d=='native' else 'integration-required','source':'https://checkvibe.dev/security-checks'} for i,(g,n,d) in enumerate(security,1)]
# JSON machine-readable canonical feature inventory
(base/'docs'/'saas-features.json').write_text(json.dumps(features,indent=2)+'\n')
(base/'docs'/'security-scanners.json').write_text(json.dumps(scanners,indent=2)+'\n')
for filename,items in [('saas-features.csv',features),('security-scanners.csv',scanners)]:
 with (base/'docs'/filename).open('w',newline='') as f:
  wr=csv.DictWriter(f,fieldnames=list(items[0]));wr.writeheader();wr.writerows(items)
# TS catalog generated from structured input
cat='''/** Canonical, machine-readable scope; native=reference code, adapter=extension contract, planned=roadmap. */
export type Coverage = 'native' | 'adapter' | 'planned';
export interface Feature { id: string; category: string; module: string; name: string; delivery: Coverage; status: string }
export interface ScannerFeature { id: string; category: string; name: string; delivery: 'native' | 'adapter'; status: string; source: string }
export const saasFeatures: Feature[] = '''+json.dumps(features,indent=2)+''' as Feature[];
export const securityScanners: ScannerFeature[] = '''+json.dumps(scanners,indent=2)+''' as ScannerFeature[];
export function coverageSummary() {
 const count = (data: {delivery:string}[]) => data.reduce((a, v) => ({...a, [v.delivery]:(a[v.delivery] ?? 0)+1}), {} as Record<string,number>);
 return {saas: {total:saasFeatures.length,...count(saasFeatures)}, scanners:{total:securityScanners.length,...count(securityScanners)}};
}
'''
(base/'packages'/'catalog'/'src'/'index.ts').write_text(cat)
summary=collections.Counter(f['delivery'] for f in features)
scsum=collections.Counter(f['delivery'] for f in scanners)
lines=['# Sapling Unified SDK — master feature checklist','','Scope assembled from the prior 100+ SaaS overview and all 41 scanner names on the referenced public catalog. This is a **new implementation mapping**, not a claim of proprietary feature/check parity.','','**Meaning of statuses:** `native` = reference implementation exists (verify its production limitations); `adapter` = integration contract or illustrative adapter, production service required; `planned` = requirements documented but not built. Native static scanners are passive/heuristic and **not** complete vulnerability verification.','','## Coverage summary','','| Domain | Total | Native reference | Adapter/contract | Planned |','|---|---:|---:|---:|---:|',f"| SaaS | {len(features)} | {summary['native']} | {summary['adapter']} | {summary['planned']} |",f"| Scanner categories | 41 | {scsum['native']} | {scsum['adapter']} | 0 |",'','The cited reference advertises **200+ checks**; that is an external product claim. We do not have an authoritative per-check inventory and **do not claim 200+ implemented**. Every scanner category is represented with an ID and coverage classification.','','## SaaS feature-by-feature map','']
for group in sets:
 lines+=['### '+group,'','| ID | Feature | SDK module | Coverage |','|---|---|---|---|']
 for f in features:
  if f['category']==group:lines.append(f"| {f['id']} | {f['name']} | `{f['module']}` | {f['delivery']} |")
 lines+=['']
lines+=['## Security scanners: complete 41-category reference','','| ID | Reference category | Scanner | Coverage |','|---|---|---|---|']
for f in scanners:lines.append(f"| {f['id']} | {f['category']} | {f['name']} | {f['delivery']} |")
lines+=['','## Defender capabilities','','- [x] Config-driven, Express-compatible runtime middleware','- [x] Threat heuristics for injection-like probing, path traversal, automated probing, prompt-injection indications','- [x] Sliding-window rate limiting and per-identity event aggregation (in-memory reference)','- [x] Monitor / block modes; thresholds and route exclusions','- [x] Alert cooldown and event export callbacks','- [x] Minimal security response headers; request correlation IDs','- [ ] Production IP intelligence, bot fingerprinting across IP rotation, historical baseline anomaly detection (external platform required)','- [ ] Distributed state, managed WAF, SIEM persistence, incident lifecycle','- [ ] Automated security scan parity with vendor 200+ checks','','## Interpretation','','All requested feature *categories* are tracked here. It is not accurate to claim all features are production-implemented. See `GAPS_AND_IMPROVEMENTS.md` for per-domain limitations.','','Source: https://checkvibe.dev/security-checks (catalog consulted Nov 2026).']
(base/'docs'/'MASTER_FEATURE_CHECKLIST.md').write_text('\n'.join(lines)+'\n')
print('features',len(features),summary,'scanners',len(scanners),scsum)
