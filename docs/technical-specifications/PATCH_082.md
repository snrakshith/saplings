# v0.8.2 — engineering hardening in three iterations

This is one patch release from v0.8.1. All 18 workspace packages, 182 SaaS mappings, 41 scanner categories and 32 quality suites are retained. No new package or dependency was added. The goal is to improve incomplete implementation paths, not to add new product categories or claim production certification.

## Iteration 1 — providers, workflows and transaction reliability

| Work | Actual implementation | Evidence / next action |
|---|---|---|
| Provider operations | `packages/sdk/src/provider-operations.ts`: persisted tenant/actor-scoped operation state, canonical request fingerprint, idempotent submission, lease fencing, explicit inspection/reconciliation; ambiguous submissions are never blindly dispatched again | Regression tests for duplicate, conflict, recovery, permission and freeze checks; configure each real workflow and verify sandbox behavior |
| GitHub workflows | `expanded/control-plane.ts`: correlate `operation_id` with fixed workflow and exact run title/ref; inspect completion through the same action target | Mock dispatch/reconciliation tests; workflows must define `run-name: sapling:${{ inputs.operation_id }}` and input `operation_id`; protected environment and deployment/provision/rollback steps are deployment-specific |
| Stripe recurring | `expanded/stripe-recurring.ts`: verified off-session mandate mapping; persistent PaymentIntent attempt, provider idempotency key, amount/customer/currency/metadata verification, polling and explicit recovery instead of recreation after ambiguity | Mock provider tests; actual sandbox mandates, 3DS/customer action, webhooks, finance, tax and cancellation policy still required |
| Outbox | `expanded/worker.ts` and `expanded/automation.ts`: bounded cursor scan, reserved job namespace, atomic delivery/dead-letter state transitions and requeue; production requires a configured durable event handler | Regression tests; actual delivery is at-least-once; destination idempotency, legacy row migration and retention policies remain operational requirements |
| Provider timeout | `expanded/control-plane.ts`, `expanded/providers.ts` and `expanded/reliability.ts`: token resolution is bounded, aborted operations do not begin HTTP after token resolution, invalid timeouts do not invoke work | Regression tests; remote operations may still complete after timeout and must be reconciled |

### Configuration examples

Configure trusted drivers in `expanded.providerOperations`, and call `sdk.providerOperations.submit(ctx, kind, stableKey, input)` followed by `get` or `reconcile` using the returned ID. Authorize `provider-operations:<kind>:submit/read/reconcile` via existing access policy. No general-purpose public endpoint is added. The driver and provider action target are operator-configured. Use `githubOperationDriver(adapter, featureId, action)` with an action target that accepts `operation_id`. Do not submit a new key to retry an ambiguous dispatch before operator reconciliation. Bind `StripeRecurringGateway` to `expanded.recurring.gateway` with the same persistent store, a server-only token resolver and a verified tenant/customer mandate resolver; no card data is accepted. The `recover` method is trusted service code only, called after discovering the PaymentIntent from provider-side evidence. Unresolved attempts stay pending; do not infer decline merely from a timeout or `requires_action`.

## Iteration 2 — realtime durability and scanner reliability

| Work | Actual implementation | Evidence / next action |
|---|---|---|
| Realtime journal | `packages/realtime/src/journal.ts`: optional bounded memory journal for development and Redis/Valkey Streams adapter using one-key atomic operations, bounded retention and replay gap detection | Local in-memory reconnect and mocked protocol tests; live Valkey stream integration test supplied, not executed |
| Transport replay | `packages/realtime/src/index.ts`: ordered channel replay, SSE `Last-Event-ID`, optional WebSocket and Socket.IO cursor, periodic channel authorization checks and disconnect on failure | Actual local SSE replay tested; WebSocket/Socket.IO live adapters and shared journal failover need real environment |
| Threat intelligence | `packages/security/src/threat-intelligence.ts`: offline exact matching of operator-approved indicators against a pinned SHA-256 feed, freshness checks, no exposed raw indicator in findings | Synthetic feed matches and tampering tested; real feed source/licensing and efficacy review required |
| Scanner coverage | `scanner.ts`, `report-adapters.ts`, `evidence-adapters.ts`, CLI: bounded directory/file/finding budgets, truncation reporting, adapter deadline and failed SARIF rejection; `--require-all` fails on incomplete coverage | Local scan evidence and fixtures; no claim of complete vendor parity or independent audit |

Use `realtime.journal: new RedisStreamJournal(connectedClient, 'sapling:journal:', 1000)` in the single config with `replayPollMs` and `replayBatchSize`. `undefined` starts at the current tail; cursor `0` explicitly requests available retained history, not all historical events. An expired/unknown cursor returns SSE 409 or closes an active replay; clients should refresh their authoritative snapshot before reconnecting. Event order is per channel, not global; delivery/reconnect is not exactly-once. Enable persistence, backups, noeviction/capacity monitoring, TLS and restricted Redis ACLs. Poll-based subscriptions cost one journal read per subscription per interval and need staging capacity tests; global quotas and durable subscriber ACKs are not implemented. The legacy ephemeral broker remains available.

Set `security.scanner.threatIntelligence` to `{path, sha256, indicators, maxAgeMs}`. A feed JSON contains `generatedAt` and `indicators`, with each indicator `{type: 'domain'|'sha256'|'ip', value}`. The operator must validate the feed origin and ensure asset inventory is authorized. CLI: `scan --path . --threat-intel FILE --require-all`. Static findings are candidate review signals only; incomplete coverage and failed tools must not be treated as a pass.

## Iteration 3 — regression, release evidence and documentation

- Core and dependency-free quality builds passed; 92/92 local tests, including 18 new tests in `tests/v082.test.mjs`.
- Local loopback HTTP benchmark: 2,000 requests, 32 concurrency, 16 tenants, 100/100 cross-tenant denials, zero unexpected errors, P95 23.14 ms. This is not a production benchmark.
- Re-generated feature and technical inventories. All 18 workspace packages are v0.8.2. The prior v0.8.1 evidence is archived under `docs/evidence/history-v0.8.1/`.
- Source scan: 445 eligible files, 36 categories executed, 5 categories not executed (HTTP/DNS/feed inputs not configured); 26 heuristic findings, 23 high/critical. The scanner gate stays open; no false-positive disposition is assumed.
- Four direct local checks pass. The aggregate execution runner was interrupted, so the report explicitly records the direct local runs and preflight separately. The source-bound gate still blocks release (19 outstanding). No live sandbox, PostgreSQL, Valkey, browser engine or independent audit was performed.

## Remaining implementation backlog (not merely verification)

| Area | Remaining engineering | Acceptance criteria |
|---|---|---|
| Provider/control plane | Complete deployment-specific workflow definitions and rollout/PITR/object-restore orchestration; add provider-specific recovery checks and reliable delivery confirmations | Real sandbox provisioning, rollback, recovery, status reconciliation, credential scopes and idempotency verified |
| Billing | End-to-end mandates, authenticated webhook reconciliation, customer-action recovery, tax, refunds, proration and dunning rules | No duplicate charges under crash/retry; provider/invoice state reconciles in sandbox |
| Realtime | Global quota/revocation state, ACK-based replay if required, partition/failover/retention policy and scalable fan-out | Multi-replica, restart, retention-gap and revoked-session tests under load |
| Workflows/offboarding | Legacy outbox migration, job/operation retention, application-level idempotent effects, legal hold, credential revocation, purge and backup policy | Crash and recovery drills preserve invariants; retention and deletion evidence reviewed |
| Scanner/defender | Engine/report coverage for all enabled categories, rule precision, feed provenance, full attack-path tests and independent review | Representative positive/negative fixtures, no unresolved high/critical findings after triage and audit |
| Data and application | Domain constraints, search indexes, app-specific route/resource authorization, upload content inspection, transactional HTTP side effects | Per-feature authorization, migration, tenant isolation and concurrency tests |
| Quality/validation | Full dependency installation, Zod conformance, actual frontend/backend engines and provider/adapter builds | Reviewed lockfile and all configured live suite outcomes |

See [RELEASE_BLOCKERS.md](RELEASE_BLOCKERS.md) for the existing gate owners and environment prerequisites. This patch is a real engineering improvement but not closure of all implementation or verification gaps.
