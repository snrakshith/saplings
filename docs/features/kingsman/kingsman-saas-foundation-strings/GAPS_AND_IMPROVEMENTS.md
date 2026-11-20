# kingsman-saas-foundation-strings — strings (kingsman/saas-foundation)

Release: 0.17.0 · Engineering backlog · **OPEN until evidence proves closure**

## Current limitations
Source declaration retained; individual exhaustive production/conformance verification not established. 

## P0 — correctness and security (implementation + verification)
- [ ] Test identity API using full RealmConfig, real Argon2id and stable RS256 signer, token/client/realm isolation, OTP, PKCE and refresh replay; run independent OIDC conformance. For strings, explicitly cover its documented arguments, output, error behavior and boundaries in the source declaration below.
- [ ] Verify PKCE, issuer/audience/RS256, anti-replay and least-privileged client grants; never accept untrusted realm/tenant or persist plaintext credentials.
- [ ] Exercise the invalid-input, permission/scope and failure branches of the exact public contract; remove any unguarded side-effect path.

## P1 — reliability, data and operational design
- [ ] Realm-scoped atomic credential/session/action/token transactions, stable production RSA and Argon2id provider, rotating refresh and bounded crypto/HTTP execution.
- [ ] Implement explicit failure classification, bounded execution and documented safe recovery. For external effects retain the operation identity and reconcile before retrying.
- [ ] Login errors, MFA required, token/replay/refresh rejection, breached-password checks, session revocation lag and credential events.

## P1 — acceptance tests (do not close with inventory or mock evidence alone)
- [ ] Add a focused fixture for strings using its actual declaration, then assert success, edge/error cases and the applicable kingsman acceptance requirements. Test identity API using full RealmConfig, real Argon2id and stable RS256 signer, token/client/realm isolation, OTP, PKCE and refresh replay; run independent OIDC conformance.
- [ ] Add feature-specific unit and integration fixtures; where applicable include restart, concurrent requests, dependency outage and rollback scenarios. Record expected versus actual outputs and persistent state.
- [ ] Run against a representative staging environment when browser, DB, broker, external provider or engine behavior is required; retain redacted evidence and reviewed source hash.

## P2 — operability and release
- [ ] Document exact configuration, permissions, dependencies, recovery and upgrade/rollback steps. Use the matching package export/subpath and required peer/optional runtime dependencies from package.json. 
- [ ] Define and approve relevant SLO/limits and alert owner with a representative workload; verify resource ceilings, error rates and recovery before production.
- [ ] Obtain code owner review and required independent security/operations approval. No feature is approved merely because its ID exists.

**Suggested owner:** Realm / identity security engineer.
**Exit criteria:** every applicable task accepted, risk exceptions explicitly approved, source-bound evidence attached, and required release gates passed. Distinguish engineering completion from external validation.

[Product specification](PRODUCT_SPECIFICATION.md) · [Technical specification](TECHNICAL_SPECIFICATION.md)
