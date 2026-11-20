# kingsman-index-identityplatform — IdentityPlatform (kingsman/index)

Release: 0.17.0 · Product specification

## Purpose and users
Reusable public implementation exported by kingsman/index.ts.

**Primary consumer:** Realm / identity security engineer.

## Functional contract
Use IdentityPlatform through its public package entry point. The declaration in the technical specification is the current contract.

## Product requirements
- Expose documented operations only; return an explicit failure rather than silently reporting success when unavailable.
- Test identity API using full RealmConfig, real Argon2id and stable RS256 signer, token/client/realm isolation, OTP, PKCE and refresh replay; run independent OIDC conformance. For IdentityPlatform, explicitly cover its documented arguments, output, error behavior and boundaries in the source declaration below.
- Preserve existing public API compatibility unless a documented migration is required.

## User journey and outcomes
1. Consumer configures the feature and prerequisites in the appropriate application/workspace.
2. Consumer invokes the documented API, suite or control; implementation validates its input and scope.
3. Success or explicit error is returned; durable or external effects are reconciled where applicable.
4. Owner reviews evidence and uses the documented recovery path when a prerequisite or operation fails.

## Acceptance
Add a focused fixture for IdentityPlatform using its actual declaration, then assert success, edge/error cases and the applicable kingsman acceptance requirements. Test identity API using full RealmConfig, real Argon2id and stable RS256 signer, token/client/realm isolation, OTP, PKCE and refresh replay; run independent OIDC conformance.

## Scope and non-goals
Source declaration retained; individual exhaustive production/conformance verification not established. 

## Status
Source implementation exists; dedicated parity proof pending. This is a specification for the current and target behavior, not a production certification.

[Technical specification](TECHNICAL_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
