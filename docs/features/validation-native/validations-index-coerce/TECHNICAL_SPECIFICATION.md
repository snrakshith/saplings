# validations-index-coerce — coerce (validations/index)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. Independent native parser, not upstream Zod API parity.

## Source of truth
- `packages/validations/src/index.ts:76`
- `packages/validations/package.json`

## Public contract / current implementation
```typescript
coerce={string:()=>new StringSchema<unknown>((v,c)=>['string','boolean','number','bigint'].includes(typeof v)?String(v):issue(c,'invalid_type','Cannot coerce to string')),number:()=>new NumberSchema<unknown>((v,c)=>{const n=typeof v==='number'?v:typeof v==='string'&&v.trim()!==''?Number(v):NaN;return Number.isFinite(n)?n:issue(c,'invalid_type','Cannot coerce to finite number');}),boolean:()=>new Schema<boolean,unknown>((v,c)=>v===true||v==='true'||v===1?true:v===false||v==='false'||v===0?false:issue(c,'invalid_type','Cannot coerce to boolean')),date:()=>new Schema<Date,unknown>((v,c)=>{const d=v instanceof Date?new Date(v):typeof v==='string'||typeof v==='number'?new Date(v):new Date(NaN);return Number.isFinite(d.getTime())?d:issue(c,'invalid_type','Cannot coerce to date');})}
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
Add a focused fixture for coerce using its actual declaration, then assert success, edge/error cases and the applicable validation-native acceptance requirements. Cover valid, invalid, edge and nested input, error path and transformations; compare native behavior only to its documented contract.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
