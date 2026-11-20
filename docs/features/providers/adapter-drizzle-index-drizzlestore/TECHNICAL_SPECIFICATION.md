# adapter-drizzle-index-drizzlestore — DrizzleStore (adapter-drizzle/index)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/adapter-drizzle/src/index.ts:7`
- `packages/adapter-drizzle/package.json`

## Public contract / current implementation
```typescript
export class DrizzleStore implements Store {
constructor(private db:NodePgDatabase<any>,private scope?:string)
async transaction<T>(tenantId:string,work:(tx:Store)=>Promise<T>):Promise<T>
async health()
async search<T>(tenantId:string,collection:string,query:string,fields:string[],limit:number)
async fullTextSearch<T>(tenantId:string,collection:string,query:string,limit=50)
async page<T>(tenantId:string,collection:string,limit:number,after?:string)
async put<T extends {id:string}>(tenantId:string,collection:string,record:T)
async get<T>(tenantId:string,collection:string,id:string):Promise<T|undefined>
async list<T>(tenantId:string,collection:string):Promise<T[]>
async delete(tenantId:string,collection:string,id:string)
async claimableJobs<T>(tenantId:string,at:number,limit:number)
}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Use bounded provider I/O, durable operation identity, reconcile ambiguous outcomes, atomic local state and explicit rollback where supported.

## Security boundary
Use least-privilege scoped credentials, trusted tenant mapping and fixed approved endpoints; never log secrets or perform destructive action without approval.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Provider latency/error, pending reconciliation age, rate limits, timeout and external-vs-local mismatch.

## Verification design
Add a focused fixture for DrizzleStore using its actual declaration, then assert success, edge/error cases and the applicable providers acceptance requirements. Execute against approved sandbox/read-only fixture, validate ownership, success/error/timeout, idempotency, response contract and recovery; keep mock evidence separate.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
