# kingsman-saas-foundation-saasstore — SaasStore (kingsman/saas-foundation)

Release: 0.17.0 · Technical specification

## Implementation status
Exported type contract. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/kingsman/src/saas-foundation.ts:5`
- `packages/kingsman/package.json`

## Public contract / current implementation
```typescript
export interface SaasStore {
 transaction?<T>(tenant:string,work:(tx:SaasStore)=>Promise<T>):Promise<T>;
 get<T>(tenant:string,collection:string,id:string):Promise<T|undefined>;
 put<T extends {id:string}>(tenant:string,collection:string,row:T):Promise<void>;
 delete(tenant:string,collection:string,id:string):Promise<boolean>;
 list<T>(tenant:string,collection:string):Promise<T[]>;
}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Type-only contract: no runtime side effect by itself; verify implementing code observes the declared shape.

## Security boundary
Verify PKCE, issuer/audience/RS256, anti-replay and least-privileged client grants; never accept untrusted realm/tenant or persist plaintext credentials.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Login errors, MFA required, token/replay/refresh rejection, breached-password checks, session revocation lag and credential events.

## Verification design
Typecheck valid and invalid uses of SaasStore; verify declaration resolution and assignability in an actual consuming package.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
