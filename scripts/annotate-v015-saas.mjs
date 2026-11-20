/** Version-specific, truthful delta annotations. Retain existing P0/P1/P2 checklists and source review. */
import fs from 'node:fs';
const version='0.15.0';
const features=JSON.parse(fs.readFileSync('docs/technical-specifications/saas-evaluation.json','utf8'));
const groups={
 identityPlatform:new Set(['SAAS-005','SAAS-006','SAAS-007','SAAS-009','SAAS-011','SAAS-013','SAAS-014','SAAS-015','SAAS-018']),
 gateway:new Set(['SAAS-052','SAAS-055','SAAS-059','SAAS-060','SAAS-066','SAAS-067','SAAS-131','SAAS-133']),
 export:new Set(['SAAS-061','SAAS-064','SAAS-089','SAAS-090','SAAS-099','SAAS-129','SAAS-130'])
};
const sections={
 identityPlatform:'The **separate** `@saplings/kingsman` now has confidential client introspection/revocation, refresh replay session invalidation, constrained client-credentials scopes, MFA replay fencing and remember-me expiry fixes. This does **not** automatically upgrade the old SaaS identity route or complete federation/WebAuthn; integrate and test the realm explicitly (`tests/v015.test.mjs`).',
 gateway:'The **separate** `@saplings/harbor` now has distributed transactional rate/ban store adapters, API-key authentication, optional bot challenge driver and actual verified TLS-proxy ingress checks. This does **not** automatically protect application routes: configure the gateway/plugins, durable storage, upstream scopes and driver integrations (`tests/v015.test.mjs`).',
 export:'The direct SDK `exportTenantData` now uses scoped domain policies, explicit collection allowlists, cursor pagination, field projection and a 5,000-row bounded synchronous limit. Production fails closed without policies and a paged store. Other exports and imported resource routes still need their own acceptance tests (`tests/v015.test.mjs`).'
};
for(const f of features){const path=`docs/features/saas/${f.id}`;const relevant=Object.entries(groups).filter(([,ids])=>ids.has(f.id)).map(([name])=>sections[name]);const status=relevant.length?'Related shared implementation path hardened; feature-specific acceptance still open.':'SDK source moved to root; no additional feature-specific implementation claimed for this feature in this release.';
 const note=`\n## v${version} — root refactor and critical-code review\n\n**Source location:** \`packages/sdk/src/registry.ts\` and adjacent root modules, not \`packages/sdk/src/expanded/\`. **Readiness:** OPEN; previous acceptance items and production requirements remain mandatory.\n\n${status}\n\n${relevant.map(s=>'- '+s).join('\n')||'- The previous SaaS implementation, input authorization and integration acceptance tasks remain open; nothing was marked complete on the basis of a directory move.'}\n\n**Evidence:** \`scripts/verify-sdk-root-refactor.mjs\` checks all 31 moved modules; \`tests/v015.test.mjs\` covers direct platform and tenant-export hardening; \`docs/technical-specifications/PRODUCTION_READINESS_015.md\` separates code and live acceptance. Provider, authorization, restore and full regression gates are not automatically closed.\n`;
 for(const file of ['PRODUCT_SPECIFICATION.md','TECHNICAL_SPECIFICATION.md','GAPS_AND_IMPROVEMENTS.md']){const p=`${path}/${file}`;const s=fs.readFileSync(p,'utf8'),marker=`## v${version} — root refactor and critical-code review`;fs.writeFileSync(p,s.split(marker)[0].trimEnd()+'\n'+note);}
}
console.log(JSON.stringify({version,reviewed:features.length,relatedIdentityPlatform:[...groups.identityPlatform].length,relatedGateway:[...groups.gateway].length,relatedExport:[...groups.export].length,statement:'root refactor universal; feature-specific gaps remain open'},null,2));
