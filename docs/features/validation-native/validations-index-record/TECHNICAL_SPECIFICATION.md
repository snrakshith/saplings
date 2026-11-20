# validations-index-record — record (validations/index)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. Independent native parser, not upstream Zod API parity.

## Source of truth
- `packages/validations/src/index.ts:70`
- `packages/validations/package.json`

## Public contract / current implementation
```typescript
record=<S extends AnySchema>(s:S)=>new Schema<Record<string,output<S>>,Record<string,input<S>>>((v,c)=>{if(!plain(v))return issue(c,'invalid_type','Expected record');const entries=Object.keys(v);if(entries.length>10000||entries.some(k=>!safeKey(k)))return issue(c,'invalid_key','Unsafe or excessive keys');const out:Record<string,output<S>>={};let failed=false;return chain(each(entries,k=>chain(s._parse(v[k],child(c,k)),r=>{if(r===BAD)failed=true;else out[k]=r;})),()=>failed?BAD:out);})
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. Native export: @saplings/validations/native.

## Execution, persistence and consistency
Preserve input/output types, parse/safeParse/async semantics and nested issue path; complexity and issue limits; conformance to native contract, not claimed Zod parity.

## Security boundary
Treat untrusted input as bounded; reject unsafe object keys and never confuse validation with authorization; redact sensitive error data.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Validation throughput, error accuracy, type inference and recursion/complexity bounds.

## Verification design
Add a focused fixture for record using its actual declaration, then assert success, edge/error cases and the applicable validation-native acceptance requirements. Cover valid, invalid, edge and nested input, error path and transformations; compare native behavior only to its documented contract.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
