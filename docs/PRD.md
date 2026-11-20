> **v0.13.0:** Two new packages (`@sapling/harbor`, `@sapling/kingsman`) and typed optional `sapling.gateway` / `sapling.identityPlatform` integrations. See [platform specs](platforms/CONFIG_COVERAGE.md) and their detailed product/technical/gap documents. Existing production gates remain open; both platforms require real infrastructure/conformance testing.

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](technical-specifications/SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](technical-specifications/CASHFREE_PAYMENTS.md) and [feature dossiers](features/README.md). Historical sections below may describe previous releases.

> **v0.10.0:** See [flat SDK, hooks and pnpm migration](technical-specifications/ENGINEERING_0100.md) for the current API, workspace and verification. Historical sections below may describe older releases.

> v0.8.0 update: see [technical specifications](technical-specifications/README.md) for current contracts, validation migration, recurring billing, offboarding, acceptance criteria and release blockers. Historical descriptions below may describe prior releases.

> v0.7.0 foundation update: see [FOUNDATION_PACKAGES.md](FOUNDATION_PACKAGES.md) for new packages, configuration, usage and limitations. Existing sections are retained as the baseline.

> v0.6.0 integration update: see [QUALITY_INTEGRATION.md](QUALITY_INTEGRATION.md) for current full-stack configuration, packages, commands and parity. Earlier SDK sections are retained for context.

# Product requirements — Sapling Unified SDK v0.3

## Goal
A single backend SDK for reusable SaaS and security capabilities, configured in one TypeScript file. Preserve all 182 original SaaS IDs, 41 scanner categories and defender scope; maintain provider portability and tenant-aware contracts.

## In scope
Implementation of reusable domain operations; single feature registry; tenant-scoped data; account lifecycle; billing primitives; notifications; analytics; workflows; data and collaboration; reliability primitives; provider integrations; scanner and defender. No AI fix engine. Application UIs and external control planes are not implemented by the SDK.

## Current outcome
Every original ID mapped to an operation. 120 local reference, 48 hybrid, 14 provider-required. 38 categories have static/passive paths and two additional configured DNS paths. Security defender enhanced; third-party dependencies and full implementation/validation still required. See exact coverage and release gates. 22 local tests pass; external integrations and production validation remain pending.

## Acceptance criteria for eventual production
Each required operation implements feature semantics with validated inputs, authorization, durable tenant isolation, concurrency correctness, failure behavior, observability and documentation; required external providers have working integration and credentials; security scanner findings have verified preconditions; defender policy validated with representative legitimate/hostile traffic; test and operational release gates pass. This version does not meet all criteria.


## v0.3 release additions

See [provider matrix](PROVIDER_MATRIX.md), [test plan](TEST_PLAN.md), and [release gates](GAPS_AND_IMPROVEMENTS.md) for current implementation, validation and limitations.
