/** Offline source consistency guard. Does NOT certify production, complete feature implementation or Vitest coverage. */
import fs from 'node:fs';import path from 'node:path';
const read=p=>fs.readFileSync(p,'utf8'),manifest=JSON.parse(read('package.json')),errors=[];
const req=(ok,msg)=>{if(!ok)errors.push(msg);};
const pkgDirs=fs.readdirSync('packages').filter(d=>fs.existsSync(`packages/${d}/package.json`));
req(manifest.version==='0.17.0','Unexpected version');req(pkgDirs.length===24,'Workspace package count changed');
const names=pkgDirs.map(d=>JSON.parse(read(`packages/${d}/package.json`)));
req(names.every(m=>m.version===manifest.version),'Package version mismatch');
const all=new Set(names.map(m=>m.name));req(all.size===24,'Duplicate package name');
for(const n of ['@sapling/harbor','@sapling/kingsman','@sapling/sdk'])req(all.has(n),`Missing ${n}`);
for(const n of ['@sapling/gateway','@sapling/identity-platform'])req(!all.has(n),'Old package name is still published: '+n);
for(const m of names)for(const [dependency,version] of Object.entries(m.dependencies??{}))if(all.has(dependency))req(version==='workspace:*','Not a pnpm workspace dependency '+m.name+':'+dependency);
req(!Object.keys(JSON.parse(read('packages/kingsman/package.json')).dependencies??{}).includes('@sapling/sdk'),'Kingsman depends on full SDK (cycle)');
req(!Object.keys(JSON.parse(read('packages/harbor/package.json')).dependencies??{}).includes('@sapling/sdk'),'Harbor depends on full SDK (cycle)');
const expected={'access':'saas-access','identity':'saas-api-keys','accounts':'saas-accounts','impersonation':'saas-impersonation','totp':'totp'};
for(const [old,owned] of Object.entries(expected)){
 const shim=`packages/sdk/src/${old}.ts`,src=`packages/kingsman/src/${owned}.ts`;
 req(fs.existsSync(shim)&&fs.existsSync(src),'Missing migrated IAM module '+old);
 if(old!=='totp')req(read(shim).includes('@sapling/kingsman')&&read(shim).length<300,'SDK has a competing '+old+' implementation');
}
for(const f of ['saas-http.ts','index.ts','types.ts'])req(fs.existsSync(`packages/harbor/src/${f}`),'Missing Harbor module '+f);
req(!fs.existsSync('packages/sdk/src/expanded'),'Old expanded SDK folder reintroduced');
req(read('packages/sdk/src/index.ts').includes('readonly harbor?:Gateway')&&read('packages/sdk/src/index.ts').includes('readonly kingsman?:IdentityPlatform'),'Canonical SDK accessors missing');
req(read('packages/sdk/src/registry.ts').includes('KingsmanMembership')&&read('packages/sdk/src/registry.ts').includes('sdk.httpPolicies.envelope'),'Real capability delegates absent');
req(read('packages/harbor/src/index.ts').includes('requiredScopes'),'Harbor API key scope enforcement absent');
req(read('packages/sdk/src/types.ts').includes('gateway?:')&&read('packages/sdk/src/types.ts').includes('identity?:'),'Legacy platform config alias missing');
const ownership=JSON.parse(read('docs/architecture/FEATURE_OWNERSHIP_V017.json'));
req(ownership.version===manifest.version&&ownership.total===182,'Ownership manifest invalid');
const ids=new Set(ownership.features.map(f=>f.id));req(ids.size===182,'Duplicate SaaS IDs');
for(let i=1;i<=182;i++)req(ids.has(`SAAS-${String(i).padStart(3,'0')}`),`Missing SaaS ID ${i}`);
req(ownership.counts['@sapling/kingsman']===23&&ownership.counts['@sapling/harbor']===13&&ownership.counts['@sapling/sdk']===146,'Ownership count inconsistent');
req(ownership.features.every(f=>f.actions.length>0),'Action loss in ownership map');
const test=read('tests/v017.test.mjs');req(test.includes("from 'vitest'"),'Vitest test fixture missing');
for(const f of ['vitest.config.mts','vitest.integration.config.mts','vitest.quality.config.mts'])req(fs.existsSync(f),'Missing Vitest config '+f);
const result={version:manifest.version,packages:names.length,saasFeatures:ownership.total,counts:ownership.counts,errors,checks:'static only; not feature-complete or production validated'};
console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
