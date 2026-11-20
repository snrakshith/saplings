import fs from 'node:fs';
const owner=JSON.parse(fs.readFileSync('docs/architecture/FEATURE_OWNERSHIP_V017.json','utf8'));
for(const f of owner.features){const dir=`docs/features/saas/${f.id}`;
 for(const doc of ['PRODUCT_SPECIFICATION.md','TECHNICAL_SPECIFICATION.md','GAPS_AND_IMPROVEMENTS.md']){
  const file=dir+'/'+doc,body=fs.readFileSync(file,'utf8');const start='\n## v0.17.0 architectural ownership';
  const raw=body.includes(start)?body.slice(0,body.indexOf(start)):body.trimEnd();
  fs.writeFileSync(file,`${raw}${start}\n\n**Authoritative package:** \`${f.owner}\`. **Implementation path:** ${f.implementation}. **Status:** ${f.completeness}.\n\n${f.notes}\n\n**Remaining verification:** Run matching Vitest feature/action tests, live adapter checks, tenant isolation/security regressions and documented acceptance criteria before closing this feature. A namespace move does not constitute functional parity.\n`);
 }
}
console.log(JSON.stringify({version:owner.version,annotated:owner.features.length,documents:owner.features.length*3},null,2));
