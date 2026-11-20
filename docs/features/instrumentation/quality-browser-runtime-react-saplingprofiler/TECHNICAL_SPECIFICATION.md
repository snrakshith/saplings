# quality-browser-runtime-react-saplingprofiler — SaplingProfiler (quality-browser-runtime/react)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/quality-browser-runtime/src/react.ts:5`
- `packages/quality-browser-runtime/package.json`

## Public contract / current implementation
```typescript
export function SaplingProfiler(props:{id:string;children:ReactNode;onSample?:(sample:RenderSample)=>void})
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Bound sampling and resource usage, stop collectors and clear timers; correlate with source and workload.

## Security boundary
Collect only approved redacted diagnostics; no personal data, tokens, or sensitive heap dumps in public artifacts.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Collector overhead, dropped samples, memory/CPU, trace completeness.

## Verification design
Add a focused fixture for SaplingProfiler using its actual declaration, then assert success, edge/error cases and the applicable instrumentation acceptance requirements. Test real instrumented runtime on representative workload, verify start/stop and expected samples; compare overhead and redaction.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
