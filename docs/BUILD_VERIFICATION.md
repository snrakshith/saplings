# Build verification — Sapling Unified SDK v0.17.0

**Development candidate only.** The SDK contains 24 packages and 182 SaaS IDs. `@sapling/harbor` and `@sapling/kingsman` are reusable libraries, not separate deployed services.

## Local execution and source evidence

- Global TypeScript compiler (Node 22) successfully compiled the 11 dependency-free core/platform packages. SDK type-contract tests and platform type-contract tests passed via direct `tsc`, as did the dependency-free quality build and shared UI token build.
- The source-level consolidation verifier confirms 24 packages at 0.17.0, no old workspace package names, no circular SDK↔Kingsman dependency, 182 action-compatible feature bindings, and 23 Kingsman / 13 Harbor / 146 SDK primary ownership rows.
- 16/16 direct Node assertion-based smoke scenarios passed against locally compiled SDK, Kingsman and Harbor modules. Vitest test counterparts exist under `tests/v017.test.mjs`, but they were **not run under Vitest** because the real Vitest dependency could not be installed locally.
- 182 SaaS feature IDs and their operations, 860 feature dossiers and 2,580 specification documents verified. The ownership map is a responsibility assignment, not 182 production-complete implementations.
- Static Vitest migration, SDK root layout, original platform config inventory, scanner and UI source inventory pass their applicable local validation steps.

## Unverified / blocked

- npm/pnpm registry unavailable (`EAI_AGAIN`); no reproducible frozen install, Vitest execution, V8 coverage, or complete full-stack and adapter build.
- No real PostgreSQL/Valkey multi-replica IAM/gateway exercise, no OIDC conformance, no original-account-to-realm credential migration, no live provider or cloud evidence, and no independent security/operations signoff.
- Google/SAML/LDAP federation, WebAuthn attestation, distributed API-key revocation propagation, WAF/DDoS drivers and final mTLS gateway identity trust remain open as specified in the existing gap documents.
- The archived v0.16 and earlier test counts are **historical**, not current-release Vitest regression evidence. Release gates remain blocked pending accepted source-bound external verification.

See `docs/evidence/`, `docs/architecture/HARBOR_KINGSMAN_MIGRATION.md`, and `docs/architecture/FEATURE_OWNERSHIP_V017.md`.
