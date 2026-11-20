# kingsman-index-identityplatform — IdentityPlatform (kingsman/index)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/kingsman/src/index.ts:17`
- `packages/kingsman/package.json`

## Public contract / current implementation
```typescript
export class IdentityPlatform {
readonly config:RealmConfig;
readonly store:IdentityStore;
constructor(config:RealmConfig,readonly deps:IdentityDependencies={})
get realm()
get issuer()
get capabilities()
async registerUser(input:{username:string;email:string;password:string;attributes?:Record<string,unknown>})
async verifyEmail(token:string)
async requestPasswordReset(email:string)
async resetPassword(token:string,password:string)
async configureTotp(userId:string,secret:string)
async authenticatePassword(input:{login:string;password:string;otp?:string;rememberMe?:boolean})
async sessionUser(sessionToken:string)
async revokeSession(token:string)
async authorizeCode(input:{sessionId:string;clientId:string;redirectUri:string;codeChallenge:string;scope?:string;nonce?:string;state:string})
jwks()
discovery()
async exchangeCode(input:{clientId:string;clientSecret?:string;code:string;redirectUri:string;codeVerifier:string})
async refresh(input:{clientId:string;clientSecret?:string;refreshToken:string})
async clientCredentials(input:{clientId:string;clientSecret:string;scope?:string})
async verifyAccessToken(token:string,options:{audiences?:string[];clockSkewMs?:number}={})
async createOrganization(ownerSession:string,name:string)
async inviteOrganization(ownerSession:string,orgId:string,email:string)
async acceptInvitation(session:string,code:string)
async revokeToken(input:{clientId:string;clientSecret?:string;token:string})
async introspectToken(input:{clientId:string;clientSecret?:string;token:string}):Promise<Record<string,unknown>>
}
```

## Configuration and dependencies
Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 

## Execution, persistence and consistency
Realm-scoped atomic credential/session/action/token transactions, stable production RSA and Argon2id provider, rotating refresh and bounded crypto/HTTP execution.

## Security boundary
Verify PKCE, issuer/audience/RS256, anti-replay and least-privileged client grants; never accept untrusted realm/tenant or persist plaintext credentials.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Login errors, MFA required, token/replay/refresh rejection, breached-password checks, session revocation lag and credential events.

## Verification design
Add a focused fixture for IdentityPlatform using its actual declaration, then assert success, edge/error cases and the applicable kingsman acceptance requirements. Test identity API using full RealmConfig, real Argon2id and stable RS256 signer, token/client/realm isolation, OTP, PKCE and refresh replay; run independent OIDC conformance.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
