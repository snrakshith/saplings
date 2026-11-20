# kingsman-saas-accounts-accounts — Accounts (kingsman/saas-accounts)

Release: 0.17.0 · Technical specification

## Implementation status
Source implementation exists; dedicated parity proof pending. Source declaration retained; individual exhaustive production/conformance verification not established. 

## Source of truth
- `packages/kingsman/src/saas-accounts.ts:17`
- `packages/kingsman/package.json`

## Public contract / current implementation
```typescript
export class Accounts {
constructor(private store:Store,private encryptionKey?:Uint8Array,private passwordPolicy:AccountPasswordPolicy={})
async register(tenant:string,input:{email:unknown;password:unknown})
async login(tenant:string,input:{email:unknown;password:unknown})
async challenge(tenant:string,address:unknown,purpose:'verify'|'reset'|'passwordless')
async consume(tenant:string,secret:unknown,purpose:'verify'|'reset'|'passwordless',newPassword?:unknown)
async verify(tenant:string,secret:string):Promise<ActorContext|undefined>
async enrollMfa(ctx:ActorContext,input:{password:unknown})
async confirmMfa(ctx:ActorContext,code:unknown)
async verifyMfa(tenant:string,challenge:unknown,code:unknown)
async revokeMfa(ctx:ActorContext,input:{token:unknown;code:unknown})
async requestChallenge(tenant:string,address:unknown,purpose:'verify'|'reset'|'passwordless',deliver:(message:{email:string;secret:string;purpose:string})=>Promise<void>)
async verifyRecentMfa(ctx:ActorContext,secret:unknown)
async activeUser(tenant:string,id:string)
async cleanup(tenant:string,limit=500)
async logout(ctx:ActorContext,secret:string)
async sessions(ctx:ActorContext)
async roles(ctx:ActorContext,userId:string,roles:unknown)
async directory(ctx:ActorContext)
async invite(ctx:ActorContext,address:unknown,roles:unknown)
async acceptInvite(ctx:ActorContext,secret:unknown)
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
Add a focused fixture for Accounts using its actual declaration, then assert success, edge/error cases and the applicable kingsman acceptance requirements. Test identity API using full RealmConfig, real Argon2id and stable RS256 signer, token/client/realm isolation, OTP, PKCE and refresh replay; run independent OIDC conformance.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
