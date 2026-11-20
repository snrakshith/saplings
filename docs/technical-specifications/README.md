> **v0.17.0:** [Harbor/Kingsman architecture](../architecture/FEATURE_OWNERSHIP_V017.md) and package migration guide.

> **Current v0.16.0:** [Vitest testing migration](TESTING_V016.md). Historical source inventories below retain the earlier release labels; do not mistake them for v0.16.0 runtime verification.

> **v0.15.0 current:** [Critical-code implementation and SDK refactor](ENGINEERING_015.md) · [75% objective and evidence rubric](PRODUCTION_READINESS_015.md). 31 root SDK modules moved, 182 SaaS dossiers audited, no unsupported production certification.

> **v0.14.0:** [Murphi UI platform spec](../ui-platforms/TECHNICAL_SPECIFICATION.md), [component parity](../ui-platforms/COMPONENT_PARITY.md), [patch summary](PATCH_0140.md).

# v0.13.0 platform additions

- [API gateway product/technical/gaps](../platforms/gateway/PRODUCT_SPECIFICATION.md) · [technical](../platforms/gateway/TECHNICAL_SPECIFICATION.md) · [gaps](../platforms/gateway/GAPS_AND_IMPROVEMENTS.md)
- [Identity platform product/technical/gaps](../platforms/identity/PRODUCT_SPECIFICATION.md) · [technical](../platforms/identity/TECHNICAL_SPECIFICATION.md) · [gaps](../platforms/identity/GAPS_AND_IMPROVEMENTS.md)
- [Config coverage matrix](../platforms/CONFIG_COVERAGE.md): user-supplied GatewayConfig JSON/YAML and full RealmConfig.

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](CASHFREE_PAYMENTS.md) and [feature dossiers](../features/README.md). Historical sections below may describe previous releases.

# Technical specifications — Sapling v0.12.0

Authoritative technical inventory for the current release. These specs distinguish actual code, extension points, verification and remaining work. A catalog mapping is not a fully shipped SaaS product. All docs are relative to this monorepo.

| Document | Scope |
|---|---|
| [v0.10.0 migration and SDK design](ENGINEERING_0100.md) | Flat public API, type contracts, hooks, pnpm and release evidence |
| [React hooks](REACT_HOOKS.md) | API inventory, SSR, cancellation, examples and verification |
| [v0.12.0 SaaS gap closure assessment](SAAS_GAP_CLOSURE_012.md) | Source-verified improvements, 182-feature audit and remaining engineering work |
| [SaaS feature evaluation](SAAS_FEATURE_EVALUATION.md) | All 182 original features, registered actions, implementation classification, dependency limitations and acceptance criteria |
| [Security scanner evaluation](SECURITY_SCANNER_EVALUATION.md) | All 41 original scanner categories, execution mode, acceptance criteria |
| [Runtime security](RUNTIME_SECURITY.md) | Defender, authentication, authorization, middleware, threat model and verification |
| [Quality evaluation](QUALITY_EVALUATION.md) | 16 backend and 16 frontend suites, source/engine and live evidence |
| [Validation specification](VALIDATIONS.md) | Upstream-compatible entry points, independent native engine, migration and security bounds |
| [Lifecycle and billing](LIFECYCLE_AND_BILLING.md) | Recurring invoicing, dunning, tenant offboarding and failure handling |
| [Platform contracts](PLATFORM_CONTRACTS.md) | Storage, integration, realtime, utility, deployment and reliability contracts |
| [Remaining work and evidence](RELEASE_BLOCKERS.md) | Owners, completion criteria and exact outstanding gates |

Machine-readable inventories: `saas-evaluation.json`, `scanner-evaluation.json`, `quality-evaluation.json`, `package-inventory.json`. Regenerate with `pnpm run technical:evaluate` after rebuilding and refreshing the feature registry. Existing PRD/HLD/LLD and quality docs remain in `docs/`. This technical evaluation is a source inventory, not an independent audit.

[Patch v0.8.2](PATCH_082.md) records the three-iteration hardening and remaining work. [Patch v0.8.1](PATCH_081.md) is historical.

[Engineering closure plan](ENGINEERING_CLOSURE_PLAN.md) · [v0.8.3](PATCH_083.md) · [v0.8.4](PATCH_084.md).

- [v0.9.0 engineering assessment and remaining work](ENGINEERING_090.md)
