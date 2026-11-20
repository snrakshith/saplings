# Three-patch engineering closure plan — 0.8.2 / 0.8.3 / 0.8.4

Scope is improvement of existing packages only; no new packages or feature categories. Engineering implementation, mock/local evidence, live evidence and independent approval are separate states. The three patches are cumulative and can be inspected separately. This plan is not a promise of future background execution.

| Patch | Focus | Delivered | Local regression total |
|---|---|---|---|
| 0.8.2 | Provider and workflow recovery, durable replay and scanner baseline | persisted provider operations and reconciliation, GitHub run correlation, Stripe recurring recovery, atomic outbox outcomes, journal replay and scanner limits | 92 |
| 0.8.3 | Realtime capacity and evidence reliability | distributed per-tenant admission, lease expiry, periodic session/channel checks, stricter report imports | 97 |
| 0.8.4 | Data consistency and lifecycle | transactional HTTP mutation, durable consumer checkpoint, legal-hold guard, bounded offboarding steps, extra live test source | 104 |

## Remaining engineering work (not merely verification)

| Workstream | Remaining | Closure criteria |
|---|---|---|
| Provider workflows | Real deployment-specific provision/rollout/rollback, physical PITR/object restore, delivery confirmation, sandbox-specific workflow configuration | Successful operation and reconciliation across crash/retry; least-privilege provider grants; validated disaster drill |
| Billing | Complete mandate/customer-action handling, provider webhook reconciliation, application tax/proration/refund rules | Sandbox charges, failure and cancellation paths reconcile without duplicate charge; finance policy approval |
| Realtime | Client wire-level ACK if required, per-user/global-system quotas, journal retention and failover design, scalable push fanout | Multi-replica load, failover and revoked-session tests; explicit recovery from cursor gaps |
| Workflows and offboarding | Legacy outbox migration, retention sweeps, application-specific idempotent handlers, legal-hold atomic coordination, external purge and backups | Crash tests and all evidence checkpoints, legal/data owner approval |
| Scanner and defender | Complete engine coverage, rule precision, feed provenance, triage current findings, edge WAF/DDOS and abuse-path review | Seeded positive/negative checks and independent audit; no claim of original vendor 200+ parity |
| Data and authorization | Domain constraints and full-text indexes, per-route and field policies, content inspection, migration and deletion semantics | Per-feature authorization and tenant-isolation tests, schema migration/rollback, application-specific policies |
| Foundation | Browser/WS/Socket.IO/Redis/upload/compression dependencies and execution, validation compatibility | Reviewed dependency lock and live tests, no compatibility claim without conformance |
| Quality | Real 32 engine suites and app workloads, stage topology and release criteria | All applicable suites run with real evidence; capacity, soak, recovery and SLO results approved |

Each owner must add evidence to the current release, not copy prior evidence. Do not expose generic capability routes or use sandbox credentials in commits. `pnpm run release:preflight`, `pnpm run release:checks`, and `pnpm run release:gate` are the verification workflow; the gate remains blocked until all evidence is provided. See RELEASE_BLOCKERS.md for the 23-gate inventory and responsible roles.
