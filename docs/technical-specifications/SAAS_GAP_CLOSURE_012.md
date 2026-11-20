# Sapling v0.12.0 — SaaS implementation and gap-closure assessment

## Objective and evidence boundary

All **182** SaaS feature dossiers were reopened from the supplied original v0.11.0 archive, reviewed against the corresponding TypeScript source, and updated in place. This is an **implementation increment** and feature gap audit, not a claim that 182 separate fully validated products now exist. The original product/technical/gaps documents remain under `docs/features/saas/SAAS-001` through `SAAS-182` and contain the current v0.12 source review and unchanged open P0/P1/P2 requirements. See [`docs/evidence/SAAS_182_GAP_AUDIT.md`](../evidence/SAAS_182_GAP_AUDIT.md) for the exact 182-row matrix and `saas-gap-audit.json` for machine-readable status, source paths and test references.

## What was implemented

| Engineering foundation | Feature impact | Implementation / verified behavior |
|---|---|---|
| Uniform capability contracts | All 182 | Every ID tested for disabled state, missing permission and unrecognized operation; all non-offboarding IDs tested against tenant freeze. Configurable per-action input schemas, output schemas, and app-owned resource authorizers now allow typed/validated integration per feature. No default policy is silently generated. |
| Identity | 001, 004 (and supporting account flows) | Configurable password strength and optional breached-password predicate, case-normalized atomic registration, reset validation before credential replacement, and session revocation semantics. Existing MFA/token flows retained. |
| Access and resource mutations | 025–029 | Reject identity/system field mass-assignment on create and update, preserving existing resource RBAC and state. |
| Billing and commerce | 035, 038–041, 045 | Subscription reuse and idempotency; usage-event dedup/atomic quotas with overflow protection; atomic audit+quota/entitlement changes; invoice idempotency and stable conflict detection; coupon per-customer limit and expiry with cross-customer replay rejection. |
| Domain/records and privacy | 088–090, 093, 097–098, 129–130 | Explicit domain policy now governs bulk import (transactionally), visible export/stream, field-level search and list/filter; deletes/archive respect legal holds; production generic data operations require configured policy. |
| Generic SaaS CRUD | 132, 143–144, 146–147, 151–153, 171, 175–176, 179, 181 | Catalog-backed CRUD routes use domain policy when configured, support partial updates correctly, deny unauthorized fields and rows, respect legal holds, and fail closed on missing policies in production. |
| Collaboration/business workflows | 173–174, 178, 180, 182 | Validated assignees and task states, scoped ticket/task lists and guarded state transitions, privileged approvals/admin reads, ownership transfer requiring verified target membership, source-owner/privileged permission and atomic auditable change. |

A shared-control enhancement does not mean the feature's business domain is fully implemented. By feature-specific source mapping, **39 feature IDs** received direct new or hardened domain paths; the remaining 143 use their existing reference implementations plus the shared controls. The 182-feature registry counts 119 local, 49 hybrid and 14 provider-dependent feature mappings; provider-dependent entries require working integrations.

## Remaining engineering work / why not all gaps can be truthfully closed

- **Application domain requirements:** parent relationships, last-owner protection, resource-level ACLs, per-feature DTO schemas and external legal policies require explicit application definitions. New action schemas, domain policies and verified scope hooks are tools for those definitions, not generated authorization decisions.
- **Financial workflows:** Cashfree preferred but subscriptions/mandates, settlement accounting, tax jurisdiction, refund webhook automation and real merchant sandbox reconciliation need additional implementation and credentials. Stripe and Razorpay retain configuration and existing integrations; not identical feature parity.
- **Federation and external providers:** SAML/OIDC issuers, communications, cloud provisioning, real autoscaling, physical PITR, customer-domain certificates and production rollback need active providers and approved infrastructure. A 503 placeholder is still a gap.
- **Security scanner and defender:** 41 category mappings and runtime defender code are retained; source-only heuristics do not demonstrate vendor check parity, full engine coverage or independent penetration testing.
- **Realtime and quality:** durable broker paths exist, but actual Redis/Valkey, multi-replica fanout, session revocation, browser engines and all 32 quality suites need integration test evidence. Full Zod conformance and pnpm frozen installation remain blocked when dependencies cannot be installed.
- **Production:** reviewed migration/backup/restore plans, operational staffing, secrets, KMS and independently approved security/finance/data governance rules are necessary. Local tests cannot replace them.

## Engineering closure policy

- **Implemented** means source exists and its local contract is exercised.
- **Integration pending** means the code or its provider is not verified in actual runtime; no prod-ready claim.
- **Gap open** means the feature-specific checklist in its dossier is not fully satisfied.
- **Production approved** requires the full release gate plus source-bound evidence and independent review where applicable.

All 182 dossiers are **audited**; none are marked independently production-approved. Each dossier retains its distinct P0/P1/P2 acceptance checklist instead of checking boxes without evidence. See `docs/technical-specifications/RELEASE_BLOCKERS.md` for live gate owners and the current release decision.

## Developer quick start

```ts
import {createSapling, defineSaplingConfig} from '@saplings/sdk';
import {z} from '@saplings/validations/native';
const config=defineSaplingConfig({
  app:{id:'app',environment:'development'},
  services:{
    accountPasswordPolicy:{minLength:16,requireDigit:true},
    domainPolicies:{contacts:{
      read:['name'],write:['name','ownerId'],required:['name','ownerId'],
      authorize:(ctx,_action,row)=>ctx.actorId===row.ownerId,
    }},
  },
  features:{'SAAS-176':{actions:{create:{
    inputSchema:z.object({name:z.string().min(1),ownerId:z.string().min(1)}).strict(),
    authorize:(ctx,input)=>ctx.actorId===input.ownerId,
  }}}},
});
const sapling=createSapling(config);
// Verified user/tenant context supplied by the application, never from the raw request body.
```

The code in the release retains all 19 existing packages. The `pnpm` workspace and Cashfree default from v0.11.0 remain unchanged. Use `pnpm run docs:features`, `pnpm run docs:verify`, and `pnpm run saas:audit` for the documentation and evidence matrix. There is no fake pnpm lockfile or claim of completed external verification.
