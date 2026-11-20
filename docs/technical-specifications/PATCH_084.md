# v0.8.4 — transactional workflow, consumer and lifecycle hardening

Third patch in the three-release engineering sequence. No packages or dependencies added. 18 workspaces, 182 SaaS IDs, 41 scanner categories and 32 quality suites retained.

## Implementation

`packages/sdk/src/transactional-processing.ts` adds two trusted server APIs:

1. `transactionalHttpOperation(store, ctx, request, execute)` binds a stable idempotency key to tenant, actor, configured operation and HTTP mutation method. Bounded canonical JSON creates the input fingerprint. Business writes and the successful response commit in the same Store transaction. Concurrent duplicates return the stored response; conflicting payloads fail; frozen tenants are denied; thrown errors roll back both writes and replay record. Authorize every invocation including replay, use a server-owned operation identifier, include all resource IDs/path parameters in input, and use the supplied transaction only. Remote payments, emails and other external effects must be staged in a transactional outbox and reconciled; this API does not make remote effects atomic. Existing middleware remains for non-transactional routes and must not be combined on the same operation without an intentional key policy.
2. `TransactionalEventConsumer` consumes bounded replay batches using durable tenant/channel/consumer cursor rows in the configured Store. It reads the journal before beginning the DB transaction and compares the stored cursor inside the transaction; only one competing consumer may process the same batch. The local handler and cursor commit together; failures roll back both. An expired cursor fails closed and requires explicit snapshot recovery. It starts at `0` (currently retained history) and cannot prove complete history before enrollment. Use a stable, server-owned consumer ID and trusted service authorization. This is a server-side transactional ACK/checkpoint, not a browser/WebSocket/Socket.IO wire ACK protocol. Delivery of external effects still requires an outbox and provider idempotency.

`TenantOffboarding` adds bounded handler deadlines, combined cancellation signals and an explicit legal-hold decision before both purge steps. Production config requires a legal-hold callback when offboarding is configured. A held or unknown decision prevents deletion; checkpoint evidence is not advanced. The existing lease is retained until expiry after ambiguous failure, avoiding immediate blind retry. Each handler must be idempotent under the stable operation ID and independently recheck holds and external state during destructive work. The app must handle legal-hold race prevention (e.g., transactional coordination with its policy source), backups, identity revocation, data inventory, external evidence and retention policy.

### Examples (inside an already authorized route/service)

```ts
const result = await transactionalHttpOperation(sdk.store, ctx, {
  operation: 'invoice:create', method: 'POST', key: verifiedIdempotencyKey,
  input: { invoiceId, amountMinor }
}, async tx => {
  await tx.put(ctx.tenantId, 'invoices', {id: invoiceId, amountMinor});
  // Insert an outbox record in tx for external processing if needed.
  return {status: 201, body: {id: invoiceId}};
});
res.status(result.status).json(result.body);

const worker = new TransactionalEventConsumer(sdk.store, journal);
await worker.process(serviceContext, 'updates', 'projection-v1', async (tx, event) => {
  await tx.put(serviceContext.tenantId, 'projections', {id: event.id, data: event.data});
});
```

Use `expanded.offboarding.legalHold` as an async trusted policy callback and `deadlineMs` to configure the step deadline. Store audit records and purge evidence separately from tenant data scheduled for removal.

## Verification and boundaries

104 local automated tests passed, including seven new v0.8.4 tests. Core and dependency-free quality compilation passed. New live Valkey admission and PostgreSQL mutation/consumer integration cases are included but not executed. The local benchmark remains a loopback reference, not staging performance. The release gate continues to require 19 outstanding items. Full independent Zod clone is not implemented; upstream compatibility is the chosen architecture, and conformance remains unverified until dependencies install. No assertion of gap-free production readiness.
