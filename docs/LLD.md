> **v0.13.0:** Two new packages (`@saplings/harbor`, `@saplings/kingsman`) and typed optional `sapling.gateway` / `sapling.identityPlatform` integrations. See [platform specs](platforms/CONFIG_COVERAGE.md) and their detailed product/technical/gap documents. Existing production gates remain open; both platforms require real infrastructure/conformance testing.

> **v0.12.0 source audit:** Reviewed all 182 SaaS feature dossiers and tested shared action/permission/freeze contracts. See [feature gap audit](technical-specifications/SAAS_GAP_CLOSURE_012.md). Prior sections can describe older releases; do not infer production readiness.

> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](technical-specifications/CASHFREE_PAYMENTS.md) and [feature dossiers](features/README.md). Historical sections below may describe previous releases.

> **v0.10.0:** See [flat SDK, hooks and pnpm migration](technical-specifications/ENGINEERING_0100.md) for the current API, workspace and verification. Historical sections below may describe older releases.

> v0.8.0 update: see [technical specifications](technical-specifications/README.md) for current contracts, validation migration, recurring billing, offboarding, acceptance criteria and release blockers. Historical descriptions below may describe prior releases.

> v0.7.0 foundation update: see [FOUNDATION_PACKAGES.md](FOUNDATION_PACKAGES.md) for new packages, configuration, usage and limitations. Existing sections are retained as the baseline.

> v0.6.0 integration update: see [QUALITY_INTEGRATION.md](QUALITY_INTEGRATION.md) for current full-stack configuration, packages, commands and parity. Earlier SDK sections are retained for context.

# Low-level design — v0.3

- `ExpandedServices` registers feature ID -> operation map + classification. `CapabilityService` validates context, feature toggle and action permission then resolves explicit adapter override or built-in binding. Provider-only bindings throw `PROVIDER_REQUIRED` if missing. `HttpCapabilityAdapter` calls a fixed HTTPS service with service token, timeout, circuit and bulkhead.
- `Store.transaction(tenant,work)` is used by new atomic workflows. In-memory implementation serializes cooperating transactions and restores tenant snapshot on exceptions. Drizzle uses advisory transaction locks. Locks do not guard nonparticipating direct writes; use explicit transaction-scoped store. Avoid nested transactions and external calls inside locks.
- Accounts: salted scrypt; one-time hashed challenge; opaque hashed session with expiry; verified email needed for login; role lookup in trusted auth context. Account operations need approved server-side authentication flow; secrets returned only to trusted application.
- Commerce: subscription state machine, integer minor-unit invoices, coupon redemption and wallet posting under tenant transaction. Razorpay capture webhook uses raw-body HMAC and verifies tenant order and amount. Refund requires verified payment in same tenant. Capture/refund reconciliation and idempotency reservations are implemented; live validation and ambiguous outcomes require reconciliation.
- Automation: queue -> running lease -> completed / queued retry / dead. Claim and finish compare lease token; expired leases reclaimed. Handler effects at least once. Approval decision checks eligible reviewer and separates requester. Outbox local state and event append are atomic in `publishWithState`, WorkerRuntime relays pending outbox records to durable jobs; external delivery remains at-least-once.
- Analytics: timestamped event records, deterministic funnel step progress, day-bucket retention, cohorts, grouped counts and metrics. Bounded reference implementation; dedicated analytics store needed for large datasets.
- Reliability: explicit idempotency key and request fingerprint for local effects, bounded circuit breaker/bulkhead, abortable timeouts, retry policy, lifecycle and in-process metrics. Shared distributed observability and SLO enforcement need deployment integrations.


## v0.3 release additions

See [provider matrix](PROVIDER_MATRIX.md), [test plan](TEST_PLAN.md), and [release gates](GAPS_AND_IMPROVEMENTS.md) for current implementation, validation and limitations.

## v0.9.0 additions
See [engineering assessment and APIs](technical-specifications/ENGINEERING_090.md) for provider workflows, domain policies, retention, Stripe reconciliation, realtime ACK and quotas.
