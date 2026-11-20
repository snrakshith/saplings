# v0.9.0 engineering closure assessment

Base: v0.8.4. Existing 18 packages only; 182 SaaS feature IDs, 41 scanner categories and 32 quality suites remain. This is an engineering increment, not a certification. The table differentiates reusable code delivered, remaining code, and deployment-specific decisions.

| Workstream | Implemented now | Remaining engineering / deployment work |
|---|---|---|
| Provider workflows | `ProviderWorkflow` persists revision, operation ID, step and leases; advances only after verified provider success; unknown state reconciles via existing `ProviderOperations`. | Actual tenant provisioning, rollout, rollback definitions, physical PITR and object restore, provider delivery receipts. Separate rollback workflow must be approved and configured; no automatic rollback. Define safe provider inputs and credentials, migration of active workflow revisions. |
| Billing | Integer proration quote, explicit customer-action status and same-attempt resume; raw-body Stripe signature/timestamp, durable webhook dedupe, tenant/amount/customer/intent binding; wakes verified provider polling without marking paid from event alone. Registered quote and resume actions. | Actual plan-change financial posting, jurisdiction-specific tax/credit policy, customer-facing SCA/mandate UI, verified old Stripe mapping migration/discovery, processor refunds and sandbox end-to-end reconciliation. Quote is not a ledger posting. Webhooks for other processors need their own adapters. |
| Realtime | Global/tenant/user quotas in one atomic Redis cluster slot and local reference; optional bounded cumulative ACK windows wired to WS/Socket.IO; SSE uses Last-Event-ID separately. | Actual transport/Redis validation, client durable checkpoint protocol, shared fanout optimization (journal currently polls per subscription), retention/failover topology. ACK overflow disconnects; reconnect from last processed cursor; no exactly-once promise. Shared quota slot can become a bottleneck. |
| Workflow lifecycle | Cursor-based safe legacy outbox repair; terminal jobs no longer relayed as active. Explicit retention policies and evidence rows, independent hold release and same-transaction governed deletes. | Legacy ambiguous records need operator reconciliation; actual external handler idempotency, backup retention, external purge fencing and coordination, domain-specific deletion policies. The local hold ledger cannot atomically fence remote provider deletes. Direct trusted Store operations are not governed automatically. |
| Scanner and defender | Source-bound, expiring finding decisions, raw evidence retained, incomplete coverage explicit; SARIF version fixed. | Engine coverage and precision, signed report provenance and independent triage; edge WAF/DDOS, abuse-path review; original vendor 200+ check parity not established. Triage is not an audit gate. |
| Data and authorization | Explicit collection policies, field allowlists, old/new row checks, required fields and validators, transaction-scoped mutations; PostgreSQL public-field full-text index and query; legal hold applied to selected existing resource and data deletion paths. | Apply policies to actual routes, all legacy generic CRUD, import/export, GraphQL, storage and field/row reads; domain-specific database constraints and migration/rollback review. Search fields must be approved for each collection. Adapter build and migration test require real dependencies. |
| Foundation | Realtime capacity/ACK and configuration guard, regression coverage. | Real browser/WS/Socket.IO/Valkey/multipart/compression, Zod compatibility, dependency lockfile and audit. |
| Quality | Existing quality suites preserved, local regression evidence refreshed. | Live suite engine executions and representative workloads, staging load/soak/restore, independent review. |

## Example integration (trusted application service code)

```ts
// configure expanded.domainPolicies, expanded.retentionPolicies,
// expanded.providerOperations and expanded.providerWorkflows in sapling.config.ts
await sdk.governance.setHold(ctx, 'case reference');
// a different authorized actor must release the current revision
await sdk.domains.mutate(ctx, 'documents', 'doc-1', 'update', { title: 'New title' });
const run = await sdk.providerWorkflows.start(ctx, 'deploy', 'release-1', { version: '1.0' });
await sdk.providerWorkflows.advance(ctx, run.id);
```

Route Stripe webhook with original raw bytes decoded without transformation and a tenant resolved by the server from provider account routing. `StripeRecurringWebhook.receive` rejects old timestamps, invalid signatures, unmatched attempts and cross-tenant records. It records a wake-up only; scheduled `chargeDue` must retrieve and verify the intent. Existing mappings without new metadata require verified migration. No client-secret endpoint is supplied. `resume` is trusted billing control, not a public unauthenticated route.

For `RedisHierarchicalAdmission` configure the same namespace and limits across replicas. `ackWindow` is optional and supported by WS `eventAck` commands and Socket.IO `sapling:ack`; SSE must use a hub without ACK windows. Use bounded replay batches appropriate to the window; overflow is fail-closed. Client ACKs are cumulative for already-sent IDs, not durable checkpoints. No client-generated ACK can authorize a subscription.

`0004_search.sql` uses GIN for name/title/description; `DrizzleStore.fullTextSearch` is a trusted adapter API, not exposed as a generic public endpoint. PostgreSQL RLS is still required. Apply migration in staging and review the fields for privacy and query performance. The existing substring search API is unchanged.

## Evidence

See `../evidence/regression.txt`, `core-build.txt`, `quality-local-build.txt`, `technical-evaluation.json`, `gate-result.json` and `release-gates.json`. The new live PostgreSQL/Valkey tests are included, not executed. No external credentials or independent approval were available. Existing 23 gates remain authoritative; do not carry forward prior source-bound evidence.
