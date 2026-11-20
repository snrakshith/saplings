import {promises as fs} from 'node:fs';
import {join,resolve,relative,extname,sep} from 'node:path';
import {resolveMx,resolveTxt} from 'node:dns/promises';
import {ThreatIntelligenceAdapter} from './threat-intelligence.js';
import {EvidenceReportAdapter} from './evidence-adapters.js';
import type {EvidenceReport} from './evidence-adapters.js';
import {securityScanners} from '@saplings/catalog';

export interface Finding {
  id:string; scannerId:string; checkId:string; severity:'info'|'low'|'medium'|'high'|'critical';
  title:string; location:string; evidence:string; confidence:'low'|'medium'|'high';
  remediation:string;
}
export interface ScanOptions {
  root?:string; url?:string; allowedHosts?:string[]; maxFiles?:number; maxFileBytes?:number; timeoutMs?:number;
  enabledScannerIds?:string[];
  adapters?:Record<string,ScannerAdapter>;
  maxFindings?:number;
  reports?:Record<string,EvidenceReport>;
  threatIntelligence?:import('./threat-intelligence.js').ThreatIntelligenceOptions;
  dns?:{hostname:string;expectedMx?:string[];expectedTxt?:string[]};
}
export interface ScannerAdapter {scan(options:Readonly<ScanOptions>):Promise<Finding[]>;}
export interface ScanResult {
  time:string; root?:string; url?:string; scannedFiles:number;
  scannerCatalogTotal:number; executedScannerIds:string[]; notExecutedScannerIds:string[];
  findings:Finding[]; notes:string[];
  checksEvaluated:string[]; failedScannerIds:string[]; coverage:{truncated:boolean;oversizedFiles:number;entriesVisited:number;findingsTruncated:boolean};
}
type Rule={scannerId:string;checkId:string;title:string;pattern:RegExp;severity:Finding['severity'];remediation:string;extensions?:string[]};
const sourceRules:Rule[] = [
 {scannerId:'SCAN-04',checkId:'EXPOSED_KEY',title:'Possible hard-coded credential',pattern:/(?:api[_-]?key|secret[_-]?key|access[_-]?token|password)\s*[:=]\s*["'`][A-Za-z0-9_+\/=.-]{16,}["'`]/i,severity:'high',remediation:'Store credentials in a secret manager; rotate exposed values.'},
 {scannerId:'SCAN-11',checkId:'OPEN_REDIRECT',title:'Potential untrusted redirect',pattern:/(?:res\.redirect|redirect\s*\()\s*\(?\s*(?:req\.(?:query|body|params)|request\.(?:query|body))/i,severity:'medium',remediation:'Allowlist redirect destinations and avoid arbitrary redirect targets.'},
 {scannerId:'SCAN-18',checkId:'UNRESTRICTED_UPLOAD',title:'Upload handler may not enforce content validation',pattern:/(?:multer\s*\(\s*\{\s*dest\s*:|file\.mv\s*\(\s*req\.|writeFile\s*\(\s*req\.files)/i,severity:'medium',remediation:'Enforce file-size limits, extension/content match, malware scanning and isolated storage.'},
 {scannerId:'SCAN-22',checkId:'DEBUG_ENDPOINT',title:'Development/debug route reference',pattern:/(?:app|router)\.(?:get|post|use)\s*\(\s*["'`]\/(?:debug|__debug|internal\/debug|actuator|metrics-private)/i,severity:'medium',remediation:'Protect or remove debug endpoints in production.'},
 {scannerId:'SCAN-23',checkId:'EVAL_INPUT',title:'Dynamic code execution',pattern:/\b(?:eval|new\s+Function)\s*\(/,severity:'high',remediation:'Remove dynamic evaluation of potentially untrusted input.'},
 {scannerId:'SCAN-31',checkId:'WEB_STORAGE_TOKEN',title:'Potential sensitive token in browser storage',pattern:/(?:localStorage|sessionStorage)\.setItem\s*\(\s*["'`](?:access[_-]?token|refresh[_-]?token|jwt|session)/i,severity:'medium',remediation:'Consider HttpOnly Secure SameSite cookies and short-lived scoped credentials.'},
 {scannerId:'SCAN-32',checkId:'SHELL_EXEC',title:'Shell execution entry point',pattern:/(?:child_process|node:child_process)[\s\S]{0,120}(?:exec\s*\(|execSync\s*\()/i,severity:'high',remediation:'Avoid shell expansion and never interpolate untrusted values into shell commands.'},
 {scannerId:'SCAN-32',checkId:'DISABLE_TLS',title:'Potential disabled TLS verification',pattern:/NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["'`]?0/,severity:'critical',remediation:'Never disable certificate verification; install trusted roots.'},
 {scannerId:'SCAN-33',checkId:'WEBHOOK_RAW',title:'Webhook endpoint reference without verified proof',pattern:/(?:app|router)\.post\s*\(\s*["'`][^"'`]*webhook/i,severity:'info',remediation:'Confirm raw-body signature verification and replay protection on this endpoint.'},
 {scannerId:'SCAN-34',checkId:'UNSCOPED_QUERY',title:'Potential unscoped ORM read',pattern:/\b(?:findMany|findFirst|findUnique)\s*\(\s*\{\s*(?:take|skip|orderBy|select|include)\s*:/i,severity:'low',remediation:'Verify tenantId or mandatory row-level security applies to all protected reads.'},
 {scannerId:'SCAN-35',checkId:'TENANT_HEADER',title:'Potentially untrusted tenant header',pattern:/\b(?:req|request)\.headers\s*\[\s*["'`]x-tenant-id["'`]\s*\]/i,severity:'high',remediation:'Derive tenant identity from verified token/authorization, not a client-chosen header.'}
];
// Additional bounded static rules. These flag review candidates, not verified vulnerabilities.
sourceRules.push(
 {scannerId:'SCAN-01',checkId:'SQL_INTERPOLATION',title:'SQL string construction',pattern:/(?:SELECT|INSERT INTO|UPDATE|DELETE FROM)[^;]*\$\{/i,severity:'high',remediation:'Use parameterized queries and bound values.'},
 {scannerId:'SCAN-02',checkId:'UNSAFE_HTML',title:'Potential unsafe HTML sink',pattern:/dangerouslySetInnerHTML|\.innerHTML\s*=|document\.write\(/,severity:'medium',remediation:'Use escaped rendering or reviewed HTML sanitization.'},
 {scannerId:'SCAN-04',checkId:'PRIVATE_KEY',title:'Private key material',pattern:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,severity:'critical',remediation:'Remove and rotate exposed keys; use secret manager.'},
 {scannerId:'SCAN-04',checkId:'AWS_KEY_ID',title:'Possible AWS access key ID',pattern:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,severity:'high',remediation:'Revoke exposed credentials and review usage.'},
 {scannerId:'SCAN-05',checkId:'INSECURE_TLS_CLIENT',title:'TLS certificate checks disabled',pattern:/rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/,severity:'high',remediation:'Require certificate verification.'},
 {scannerId:'SCAN-06',checkId:'CORS_ANY_ORIGIN',title:'Wildcard CORS configuration',pattern:/origin\s*:\s*['"]\*['"]|Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"]/i,severity:'medium',remediation:'Restrict credentialed or sensitive APIs to trusted origins.'},
 {scannerId:'SCAN-07',checkId:'CSRF_DISABLED',title:'CSRF protection may be disabled',pattern:/csrf(?:Protection)?\s*:\s*false|skipCsrf|disableCsrf/i,severity:'high',remediation:'Use framework CSRF protection for cookie-authenticated unsafe methods.'},
 {scannerId:'SCAN-08',checkId:'COOKIE_FLAGS_FALSE',title:'Cookie security flag disabled',pattern:/(?:httpOnly|secure|sameSite)\s*:\s*false/i,severity:'medium',remediation:'Use Secure, HttpOnly and appropriate SameSite on session cookies.'},
 {scannerId:'SCAN-09',checkId:'PLAINTEXT_PASSWORD_COMPARE',title:'Potential plaintext password comparison',pattern:/\b(?:password|passwd)\s*===?\s*(?:req\.body|input\.|body\.)/i,severity:'high',remediation:'Use a password hashing KDF and constant-time verification.'},
 {scannerId:'SCAN-12',checkId:'GRAPHQL_INTROSPECTION',title:'Explicit introspection enabled',pattern:/introspection\s*:\s*true/i,severity:'info',remediation:'Evaluate production schema exposure, auth and query limits.'},
 {scannerId:'SCAN-13',checkId:'JWT_NONE',title:'JWT verification may allow none algorithm',pattern:/algorithms\s*:\s*\[[^\]]*['"]none['"]|ignoreExpiration\s*:\s*true/i,severity:'high',remediation:'Pin verification algorithms and enforce issuer, audience and expiration.'},
 {scannerId:'SCAN-17',checkId:'UNBOUNDED_BODY',title:'Very large or unlimited body parser setting',pattern:/limit\s*:\s*['"](?:[1-9]\d{2,}mb|[1-9]\d*gb)['"]/i,severity:'medium',remediation:'Set route-specific body and concurrency limits.'},
 {scannerId:'SCAN-18',checkId:'ANY_UPLOAD',title:'Unrestricted upload middleware',pattern:/\.any\(\)|fileFilter\s*:\s*null/i,severity:'medium',remediation:'Restrict file types, content, size and malware risk.'},
 {scannerId:'SCAN-19',checkId:'LOG_SENSITIVE',title:'Potential sensitive request logging',pattern:/console\.log\([^)]*(?:req\.headers|req\.body|password|accessToken)/i,severity:'medium',remediation:'Redact credentials and personal data; use structured logging.'},
 {scannerId:'SCAN-23',checkId:'DYNAMIC_QUERY',title:'Potential mass assignment',pattern:/\.create\(\s*req\.body|\.update\(\s*req\.body|\.insert\(\s*req\.body/i,severity:'medium',remediation:'Validate and allowlist request DTO fields.'},
 {scannerId:'SCAN-28',checkId:'SUPABASE_SERVICE_KEY',title:'Potential privileged key in public config',pattern:/(?:NEXT_PUBLIC|VITE|REACT_APP)[_A-Z]*SUPABASE[_A-Z]*SERVICE[_A-Z]*KEY/i,severity:'high',remediation:'Never expose service-role credentials to browsers.'},
 {scannerId:'SCAN-29',checkId:'FIREBASE_OPEN_RULE',title:'Potential permissive Firebase rule',pattern:/allow\s+(?:read|write|read,\s*write)\s*:\s*if\s+true/i,severity:'high',remediation:'Restrict access and validate authorization.'},
 {scannerId:'SCAN-30',checkId:'GITHUB_WRITE_ALL',title:'Broad GitHub Actions permission',pattern:/permissions\s*:\s*write-all/i,severity:'medium',remediation:'Use least-privilege workflow token permissions.'},
 {scannerId:'SCAN-31',checkId:'BROWSER_SECRET',title:'Possible credential in client storage',pattern:/localStorage\.setItem\([^)]*(?:secret|password|apiKey)/i,severity:'medium',remediation:'Do not retain privileged credentials in browser storage.'},
 {scannerId:'SCAN-32',checkId:'UNSAFE_DESERIALIZE',title:'Potential unsafe deserialization',pattern:/yaml\.unsafeLoad|deserialize\(\s*req\./i,severity:'high',remediation:'Use safe parsing and schema validation.'},
 {scannerId:'SCAN-33',checkId:'WEBHOOK_SKIP_VERIFY',title:'Webhook signature verification disabled',pattern:/verifySignature\s*:\s*false|skipSignatureVerification/i,severity:'high',remediation:'Require provider-specific raw-body signature and durable replay protection.'},
 {scannerId:'SCAN-34',checkId:'DIRECT_PARAM_LOOKUP',title:'Object lookup from route parameter',pattern:/findById\(\s*req\.params\.|findUnique\(\s*\{\s*where\s*:\s*\{\s*id\s*:\s*req\.params/i,severity:'medium',remediation:'Apply resource authorization and tenant scope.'},
 {scannerId:'SCAN-35',checkId:'TENANT_BODY',title:'Tenant ID accepted from request body',pattern:/tenantId\s*:\s*req\.body\.tenantId/i,severity:'high',remediation:'Derive tenant from verified claims and scoped authorization.'}
);
// Additional review signals for configuration, mobile, SEO, accessibility, and performance.
sourceRules.push(
 {scannerId:'SCAN-10',checkId:'SPF_PERMISSIVE',title:'Permissive SPF record candidate',pattern:/v=spf1[^\r\n]*\+all\b/i,severity:'high',remediation:'Use a reviewed SPF policy and authorized senders.'},
 {scannerId:'SCAN-14',checkId:'FLOATING_IMAGE',title:'Container image uses floating latest tag',pattern:/\b(?:FROM|image:)\s+[^\s]+:latest\b/i,severity:'medium',remediation:'Pin image digest and run CVE scanner.'},
 {scannerId:'SCAN-16',checkId:'TRACKING_BEFORE_CONSENT',title:'Analytics initialization requires consent review',pattern:/\b(?:gtag\(|analytics\.identify\(|posthog\.init\()/i,severity:'info',remediation:'Review applicable consent and privacy controls; not a legal compliance finding.'},
 {scannerId:'SCAN-20',checkId:'MOBILE_UNBOUNDED_RETRY',title:'Potential unlimited mobile request retries',pattern:/\b(?:retryCount|maxRetries|retry)\s*:\s*(?:Infinity|[1-9]\d{2,})\b/i,severity:'medium',remediation:'Bound retries, rate limits and server-side authentication.'},
 {scannerId:'SCAN-24',checkId:'VERCEL_PUBLIC_SECRET',title:'Potential public Vercel environment secret',pattern:/NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|SERVICE_ROLE)/i,severity:'high',remediation:'Keep server-only secrets out of public environment variables.'},
 {scannerId:'SCAN-25',checkId:'NETLIFY_PUBLIC_SECRET',title:'Potential exposed Netlify build variable',pattern:/(?:GATSBY|VITE|REACT_APP)_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|SERVICE_ROLE)/i,severity:'high',remediation:'Use server-only environment variables and review build output.'},
 {scannerId:'SCAN-26',checkId:'CLOUDFLARE_TLS_OFF',title:'Cloudflare TLS mode may be insecure',pattern:/ssl(?:_mode)?\s*[:=]\s*["'](?:off|flexible)["']/i,severity:'medium',remediation:'Require validated TLS to origin; verify live zone settings.'},
 {scannerId:'SCAN-27',checkId:'UNPINNED_GIT_DEP',title:'Unpinned Git dependency candidate',pattern:/["']git\+https?:[^"']+(?:#(?:main|master|HEAD))?["']/i,severity:'low',remediation:'Pin an immutable commit and audit transitive dependencies.'},
 {scannerId:'SCAN-36',checkId:'ROBOTS_NOINDEX',title:'Page contains noindex directive',pattern:/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i,severity:'info',remediation:'Verify intended indexing policy for public pages.'},
 {scannerId:'SCAN-37',checkId:'INVALID_JSONLD_CONTEXT',title:'Potential insecure structured-data context',pattern:/["']@context["']\s*:\s*["']http:\/\//i,severity:'low',remediation:'Validate structured data and canonical context; AI visibility itself requires measurement.'},
 {scannerId:'SCAN-39',checkId:'SYNC_SCRIPT',title:'Potential render-blocking external script',pattern:/<script\b(?=[^>]*\bsrc=)(?![^>]*\b(?:async|defer|type=["']module))[^>]*>/i,severity:'low',remediation:'Measure Core Web Vitals with Lighthouse or field data; defer noncritical script.'},
 {scannerId:'SCAN-40',checkId:'IMG_ALT_MISSING',title:'Image element lacks an alt attribute',pattern:/<img\b(?![^>]*\balt\s*=)[^>]*>/i,severity:'medium',remediation:'Provide appropriate alternative text or decorative alt=""; run accessibility audit.'}
);
const ignored = new Set(['.git','node_modules','dist','build','coverage','.next','.turbo','.venv','evidence']);
const allowedExtensions=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.yaml','.yml','.env','.tf','.rules','.html','.sql','.toml','.conf','.ini','.sh','.properties']);
function redact(line:string) {return line.replace(/((?:secret|password|api[_-]?key|token)\s*[:=]\s*)["'`]?[^\s,"'`]{4,}/ig,'$1[REDACTED]').slice(0,180);}
async function walk(root:string,maxFiles:number,maxFileBytes:number) {
 const output:{path:string;content:string}[]=[];let truncated=false,oversizedFiles=0,entriesVisited=0,totalBytes=0;
 async function visit(dir:string,depth=0) {
  if(depth>40){truncated=true;return;}
  const entries=await fs.readdir(dir,{withFileTypes:true});entries.sort((a:any,b:any)=>a.name.localeCompare(b.name));
  for(const entry of entries){if(++entriesVisited>20000||output.length>=maxFiles||totalBytes>=64_000_000){truncated=true;return;}
   const path=join(dir,entry.name);if(entry.isSymbolicLink())continue;
   if(entry.isDirectory()){if(!ignored.has(entry.name))await visit(path,depth+1);if(truncated&&entriesVisited>20000)return;continue;}
   if(!entry.isFile()||!allowedExtensions.has(extname(entry.name))&&!entry.name.startsWith('.env')&&entry.name!=='Dockerfile')continue;
   const info=await fs.stat(path);if(info.size>maxFileBytes||totalBytes+info.size>64_000_000){oversizedFiles++;truncated=true;continue;}
   const content=await fs.readFile(path,'utf8');if(Buffer.byteLength(content)>maxFileBytes){oversizedFiles++;truncated=true;continue;}totalBytes+=Buffer.byteLength(content);output.push({path,content});
  }
 }
 await visit(root);return {files:output,truncated,oversizedFiles,entriesVisited};
}
function emit(findings:Finding[],scannerId:string,checkId:string,severity:Finding['severity'],title:string,location:string,evidence:string,remediation:string,confidence:Finding['confidence']='medium') {
  findings.push({id:`${scannerId}-${checkId}-${findings.length+1}`,scannerId,checkId,severity,title,location,evidence,remediation,confidence});
}
async function passiveUrlCheck(opts:ScanOptions,findings:Finding[],executed:Set<string>,notes:string[],enable:Set<string>,checks:Set<string>,failed:Set<string>) {
 if(!opts.url) return;
 const url=new URL(opts.url);
 if(url.username||url.password)throw new Error('URL credentials are forbidden');
 if(!['https:','http:'].includes(url.protocol))throw new Error('Only http/https URL schemes are supported');
 if(!opts.allowedHosts?.includes(url.hostname))throw new Error('Target hostname must be explicitly listed in allowedHosts to prevent accidental third-party scanning');
 const controller=new AbortController();
 const handle=setTimeout(()=>controller.abort(),opts.timeoutMs??7000);
 try {
  const start=Date.now();
  const res=await fetch(url,{redirect:'manual',signal:controller.signal,method:'GET',headers:{'user-agent':'SaplingSecurityScanner/0.4 (authorized passive checks)'}});
  const latency=Date.now()-start;
  for(const id of ['SCAN-03','SCAN-05','SCAN-06','SCAN-08','SCAN-38'])if(enable.has(id)){executed.add(id);checks.add(id+':PASSIVE_HTTP');}
  const report=(id:string,check:string,...rest:Parameters<typeof emit> extends [any,any,any,...infer R]?R:never)=>{if(enable.has(id))emit(findings,id,check,...rest);};
  for(const [header,title] of [['x-content-type-options','Missing X-Content-Type-Options'],['content-security-policy','Missing Content-Security-Policy'],['referrer-policy','Missing Referrer-Policy']] as const)
   if(!res.headers.get(header))report('SCAN-03',header,'medium',title,url.origin,'HTTP response header absent','Configure appropriate security response headers.');
  if(url.protocol==='https:'&&!res.headers.get('strict-transport-security'))report('SCAN-05','MISSING_HSTS','low','Missing HSTS header',url.origin,'TLS used but HSTS not present','Set Strict-Transport-Security where applicable.');
  if(url.protocol!=='https:')report('SCAN-05','NO_TLS','high','Target uses HTTP',url.origin,'Plaintext transport','Serve application over TLS; redirect browser traffic safely.');
  if(res.headers.get('access-control-allow-origin')==='*'&&res.headers.get('access-control-allow-credentials')==='true')report('SCAN-06','CORS_WILDCARD_CREDENTIALS','high','Unsafe-looking CORS combination',url.origin,'ACAO=* and ACAC=true','Use explicitly trusted origins and restrict credentials.');
  if(res.headers.get('set-cookie') && !/httponly/i.test(res.headers.get('set-cookie')??''))report('SCAN-08','COOKIE_HTTPONLY','low','A Set-Cookie header may lack HttpOnly',url.origin,'Cookie attribute not observed','Verify sensitive session cookies use HttpOnly, Secure and SameSite.','low');
  if(res.status>=500)report('SCAN-38','HTTP_5XX','high','Target returned server error',url.origin+url.pathname,`Status ${res.status}`,'Investigate service availability.','high');
  await res.body?.cancel();
  notes.push(`Passive fetch status ${res.status} (${latency}ms); no injection payloads attempted.`);
 } catch(e) {for(const id of ['SCAN-03','SCAN-05','SCAN-06','SCAN-08','SCAN-38'])if(enable.has(id))failed.add(id);notes.push(`Passive URL check failed: ${e instanceof Error?e.message:String(e)}`)}
 finally{clearTimeout(handle);}
}
async function dnsChecks(opts:ScanOptions,findings:Finding[],executed:Set<string>,checks:Set<string>,failed:Set<string>,notes:string[],enable:Set<string>){if(!opts.dns)return;const {hostname,expectedMx,expectedTxt}=opts.dns;if(!opts.allowedHosts?.includes(hostname)||!/^[a-z0-9.-]+$/i.test(hostname))throw Error('DNS target must be explicitly allowed');const ids=['SCAN-10','SCAN-21','SCAN-41'].filter(id=>enable.has(id)&&(id==='SCAN-10'||expectedMx!==undefined||expectedTxt!==undefined));if(!ids.length)return;let timer:ReturnType<typeof setTimeout>|undefined;try{const data=await Promise.race([Promise.all([resolveMx(hostname).catch((e:any)=>{if(e?.code==='ENODATA')return [];throw e;}),resolveTxt(hostname).catch((e:any)=>{if(e?.code==='ENODATA')return [];throw e;}),resolveTxt('_dmarc.'+hostname).catch((e: any)=>{if(['ENODATA','ENOTFOUND'].includes(e?.code))return [];throw e;})]),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS timeout')),opts.timeoutMs??7000);})]);const [mx,txt,dmarc]=data;const values=txt.map(v=>v.join(''));if(enable.has('SCAN-10')){executed.add('SCAN-10');checks.add('SCAN-10:DNS_EMAIL');if(!values.some(v=>v.startsWith('v=spf1')))emit(findings,'SCAN-10','SPF_MISSING','medium','No SPF record observed',hostname,'DNS evidence','Review authorized mail senders.');if(!dmarc.some(v=>v.join('').startsWith('v=DMARC1')))emit(findings,'SCAN-10','DMARC_MISSING','medium','No DMARC record observed',hostname,'DNS evidence','Configure and monitor DMARC if sending mail.');}for(const id of ids.filter(id=>id!=='SCAN-10')){executed.add(id);checks.add(id+':DNS_BASELINE');const current=mx.map(m=>String(m.exchange).toLowerCase()).sort();if(expectedMx&&JSON.stringify(current)!==JSON.stringify([...expectedMx].map(x=>x.toLowerCase()).sort())||expectedTxt&&expectedTxt.some(v=>!values.includes(v)))emit(findings,id,'DNS_DRIFT','medium','DNS differs from configured baseline',hostname,'DNS evidence','Verify authorized DNS changes.');}}catch{for(const id of ids)failed.add(id);notes.push('DNS checks failed; no pass asserted.');}finally{clearTimeout(timer);}}
export async function runScan(options:ScanOptions={}):Promise<ScanResult>{
 const root=options.root?resolve(options.root):undefined;
 const findings:Finding[]=[];const executed=new Set<string>();const notes:string[]=[];const checks=new Set<string>();const failed=new Set<string>();
 const enable=new Set(options.enabledScannerIds??securityScanners.map(s=>s.id));
 const limit=(value:number|undefined,defaultValue:number,max:number)=>{const n=value??defaultValue;if(!Number.isSafeInteger(n)||n<1||n>max)throw Error('Invalid scanner budget');return n;};
 const maxFiles=limit(options.maxFiles,1000,2000),maxFileBytes=limit(options.maxFileBytes,250000,250000),maxFindings=limit(options.maxFindings,2000,10000),deadline=limit(options.timeoutMs,7000,120000);
 let files:{path:string;content:string}[]=[];let coverage={truncated:false,oversizedFiles:0,entriesVisited:0,findingsTruncated:false};
 if(root){const walked=await walk(root,maxFiles,maxFileBytes);files=walked.files;coverage={...coverage,truncated:walked.truncated,oversizedFiles:walked.oversizedFiles,entriesVisited:walked.entriesVisited};
  for(const file of files){
    const lines=file.content.split(/\r?\n/);
    for(const rule of sourceRules){
      if(!enable.has(rule.scannerId))continue;
      executed.add(rule.scannerId);checks.add(`${rule.scannerId}:${rule.checkId}`);
      for(let i=0;i<lines.length;i++){
        if(rule.pattern.test(lines[i])){if(findings.length>=maxFindings){coverage.findingsTruncated=true;continue;}emit(findings,rule.scannerId,rule.checkId,rule.severity,rule.title,
          `${relative(root,file.path)}:${i+1}`,'Pattern matched; source excerpt withheld to avoid leaking secrets.',rule.remediation,'low');}
      }
    }
  }
  notes.push('Source checks are regex heuristics; findings require human review, and no finding does NOT imply secure code.');
 }
 if(options.url&&['SCAN-03','SCAN-05','SCAN-06','SCAN-08','SCAN-38'].some(id=>enable.has(id))) await passiveUrlCheck(options,findings,executed,notes,enable,checks,failed);
 await dnsChecks(options,findings,executed,checks,failed,notes,enable);
 const reportAdapters=Object.fromEntries(Object.entries(options.reports??{}).map(([id,report])=>[id,new EvidenceReportAdapter(id,report)]));
 for(const [id,adapter] of Object.entries({...reportAdapters,...(options.threatIntelligence?{'SCAN-15':new ThreatIntelligenceAdapter(options.threatIntelligence)}:{}),...options.adapters})){if(!enable.has(id)||!securityScanners.some(s=>s.id===id))continue;try{let timer:ReturnType<typeof setTimeout>|undefined;const rows=await Promise.race([Promise.resolve().then(()=>adapter.scan(options)),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Scanner adapter deadline')),deadline);})]).finally(()=>clearTimeout(timer));if(!Array.isArray(rows))throw Error('Invalid scanner result');if(rows.length>Math.max(0,maxFindings-findings.length))coverage.findingsTruncated=true;for(const row of rows.slice(0,Math.max(0,maxFindings-findings.length))){if(row.scannerId!==id)throw new Error('Adapter returned incorrect scanner ID');findings.push({...row,evidence:'External evidence withheld; inspect trusted source report.'});checks.add(id+':'+row.checkId);}executed.add(id);checks.add(id+':EXTERNAL_ADAPTER');}catch{failed.add(id);notes.push(`Adapter failed for ${id}`);}}

 const ids=securityScanners.filter(s=>enable.has(s.id)).map(s=>s.id);
 return {time:new Date().toISOString(),root,url:options.url?new URL(options.url).origin+new URL(options.url).pathname:undefined,scannedFiles:files.length,
 scannerCatalogTotal:securityScanners.length,executedScannerIds:ids.filter(id=>executed.has(id)),
 notExecutedScannerIds:ids.filter(id=>!executed.has(id)),findings:findings.slice(0,maxFindings),notes,coverage:{...coverage,findingsTruncated:coverage.findingsTruncated||findings.length>maxFindings},checksEvaluated:[...checks].sort(),failedScannerIds:[...failed]};
}
export function generateSarif(report:ScanResult) {
 return {version:'2.1.0',$schema:'https://json.schemastore.org/sarif-2.1.0.json',runs:[{tool:{driver:{name:'Sapling Security',version:'0.10.0',rules:[]}},results:report.findings.map(f=>({ruleId:f.checkId,level:f.severity==='critical'||f.severity==='high'?'error':'warning',message:{text:`${f.title}: ${f.remediation}`},locations:[{physicalLocation:{artifactLocation:{uri:f.location.split(':')[0]}}}]}))}]};
}
