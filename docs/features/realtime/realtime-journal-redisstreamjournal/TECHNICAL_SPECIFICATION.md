# realtime-journal-redisstreamjournal — RedisStreamJournal (realtime/journal)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/realtime/src/journal.ts:26`
- `packages/realtime/package.json`

## Public contract / current implementation
```typescript
export class RedisStreamJournal implements EventJournal {
constructor(private client:RedisJournalClient,private prefix='sapling:journal:',private retention=1000,private maxBytes=65536)
async append(topic:string,event:RealtimeEvent)
async tail(topic:string)
async read(topic:string,after:string,limit:number)
}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Bound connection state, payload, backlog, ACK window and leases; durable journal/replay, shared fan-out and session revocation; define reconnect and slow-consumer semantics.

## Security boundary
Authenticate and authorize channels with server-resolved tenant/user identity; validate replay cursor and enforce quotas; never trust client identity.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Connections, publish/receive lag, replay gaps, ACK backlog, dropped consumers and distributed admission failure.

## Verification design
Add a focused fixture for RedisStreamJournal using its actual declaration, then assert success, edge/error cases and the applicable realtime acceptance requirements. Test multi-replica delivery and reconnect with real Redis/Valkey and transport, shared quotas, session revocation, slow subscriber and failover.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
