# realtime-index-connection — Connection (realtime/index)

Release: 0.17.0 · Technical specification

## Implementation status
Exported type contract. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/realtime/src/index.ts:33`
- `packages/realtime/package.json`

## Public contract / current implementation
```typescript
export interface Connection {ack?(channel:string,id:string):string;subscribe(channel:string,after?:string):Promise<void>;unsubscribe(channel:string):Promise<void>;close():Promise<void>}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Type-only contract: no runtime side effect by itself; verify implementing code observes the declared shape.

## Security boundary
Authenticate and authorize channels with server-resolved tenant/user identity; validate replay cursor and enforce quotas; never trust client identity.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Connections, publish/receive lag, replay gaps, ACK backlog, dropped consumers and distributed admission failure.

## Verification design
Typecheck valid and invalid uses of Connection; verify declaration resolution and assignability in an actual consuming package.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
