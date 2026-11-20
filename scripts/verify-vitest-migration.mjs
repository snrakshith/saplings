/** Offline source guard: DOES NOT execute Vitest or claim runtime/coverage success. */
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const fail=message=>{throw Error('Vitest migration validation: '+message);};
const root=JSON.parse(readFileSync('package.json','utf8'));
if(root.version!=='0.17.0'||root.devDependencies.vitest!=='5.0.0'||root.devDependencies['@vitest/coverage-v8']!=='5.0.0')fail('Vitest and coverage dependency versions must match');
for(const [script,arg] of Object.entries({test:'vitest run', 'test:coverage':'--coverage', 'test:watch':'vitest', 'test:integration':'vitest', 'test:hooks':'vitest', 'test:ui':'vitest', 'test:platforms':'vitest', 'test:vitest:verify':'verify-vitest-migration.mjs'})){
 if(!root.scripts[script]?.includes(arg))fail('Missing script '+script);
}
let files=0;
for(const dir of ['tests','packages/backend-quality/examples']){
 const visit=d=>{for(const entry of readdirSync(d,{withFileTypes:true})){
  const file=join(d,entry.name);if(entry.isDirectory())visit(file);else if(/\.test\.mjs$/.test(file)){
   files++;const s=readFileSync(file,'utf8');
   if(!s.includes("from 'vitest'")&&!s.includes('from "vitest"'))fail('Missing Vitest import: '+file);
   if(/from\s*['"]node:test['"]|\btest\.diagnostic\b|\bnode\s+--test\b/.test(s))fail('Node test harness retained: '+file);
  }
 }};visit(dir);
}
if(files<31)fail('Missing migrated test files');
const internal=readFileSync('packages/backend-quality/src/engines/external.ts','utf8');
if(internal.includes("['--test'")||internal.includes("'--test-reporter")||!internal.includes('parseVitestReport')||!internal.includes("case 'vitest'"))fail('Quality engine must use Vitest with verified report');
for(const f of ['vitest.config.mts','vitest.integration.config.mts','vitest.quality.config.mts'])if(!existsSync(f))fail('Missing config '+f);
const source=readFileSync('packages/sdk/src/quality-config.ts','utf8');
if(!source.includes("|'vitest'|'node-test'"))fail('Quality engine type and legacy alias not preserved');
const pipeline=readFileSync('.github/workflows/ci.yml','utf8');
if(!pipeline.includes('pnpm run test:coverage')||!pipeline.includes('vitest-coverage'))fail('Coverage CI evidence missing');
console.log(JSON.stringify({version:root.version,files,framework:'Vitest 5.0.0',coverageProvider:'@vitest/coverage-v8 5.0.0',qualityEngine:'vitest (node-test alias supported)',mode:'static source verification only',runtimeExecuted:false},null,2));
