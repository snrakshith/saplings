> **v0.15.0:** [Flat SDK implementation and critical-code changes](../technical-specifications/ENGINEERING_015.md) · [evidence-based production assessment](../technical-specifications/PRODUCTION_READINESS_015.md). P0/P1 items below remain open until real accepted evidence; older version claims are historical.

**Delta:** confidential-client-only access-token introspection/revocation, refresh-family session invalidation, client-scope checks, OTP replay fencing and remember-me fixes implemented. Still open: real signing/KMS, Argon2, federation, OIDC conformance, WebAuthn, multi-replica persistence and accepted security review.

# Multi-Tenant Identity Platform — Detailed Gap & Improvement Backlog

Version v0.13.0. **Core authentication implemented; Keycloak-equivalent identity platform is not complete.** The uploaded realm configuration contains more desired-state functionality than this release supports. Production `Ready` must be established independently after integration and verification.

## P0 — security, protocol, and data integrity
- [ ] Implement a real Argon2id provider with parameter policy, calibration, pepper/secret rotation and secure memory cleanup; validate against known vectors. Test adapter uses scrypt only to simulate interface and is not a replacement.
- [ ] Implement KMS/HSM or vault-backed RS256 key generation/import, scheduled overlap and JWKS rotation, audit, revocation, expiry, disaster recovery and deployment-safe key consistency. Ephemeral dev keys are not production keys.
- [ ] Add robust, application-owned secure browser login session/cookie management with CSRF, SameSite, origin, session fixation prevention and independent MFA step-up. HTTP handler does not bundle login UI.
- [ ] Complete standards conformance for OIDC discovery, claims/mappers, ID Token nonce/at_hash, UserInfo, consent, logout, revocation, introspection, backchannel/frontchannel, error codes and replay semantics; run certified/independent OIDC suite.
- [ ] Implement account access recovery and history checks with durable one-time action delivery, idempotent outbox, retries and provider bounce/complaint handling, without exposing whether an email account exists.
- [ ] Persist encrypted TOTP credentials with key rotation and MFA backup/recovery workflows, safe enrollment confirmation and step-up. Production TOTP enrollment is blocked until protected storage is supplied.
- [ ] Guarantee confidential client authentication through scoped secret rotation/mTLS and private-key-jwt/JWKS pinning, proof-of-possession (DPoP) and replay stores. `partner-erp` private-key-jwt is **not supported** yet.
- [ ] Implement role/group/organization administration with comprehensive service permissions, conflict/last-owner protection, verified email/domain ownership and resource/field policy integration.
- [ ] Make account suspension, role revocation and refresh/logout invalidation consistent across Redis/DB replicas; add per-client/session/device revocation and refresh family lifetime limits. Self-contained access tokens are valid until expiration unless runtime/session check used.
- [ ] Add real identity audit trail and approved SIEM integration with immutable security events, redaction, finite retention, high-risk alerting and independent privacy review.

## P1 — configuration features declared but not implemented
- [ ] **Federation:** Google OIDC broker/PKCE/callback/first login/verified-email rules; district SAML metadata/certificate rollover/signatures/relay-state; LDAP secure sync, connection pooling and read-only user mapping; per-org provider routing.
- [ ] **WebAuthn:** credentials/RP origin/attestation, device trust/recovery/passkeys and phishing-resistant step-up for protected flows.
- [ ] **Client policies:** apply all `strict-public` and `strict-confidential` executors, dynamic policy conditions and `firstBrokerLogin`/`clientAuthentication`/direct-grant flow bindings; unsupported grants must remain disabled, not silently permitted.
- [ ] **Client scopes/mappers:** implement profile, email, roles, groups, school, audience and organization mapper rules, default/optional scope negotiation, token size budgets, access/ID/UserInfo destinations and audience restrictions per client.
- [ ] **User profile:** schema validation/permissions at read/update, attribute groups, sensitive-field encryption, multi-valued attributes and admin-only edits. Current registration validates user-editable string attributes only.
- [ ] **Organizations:** invitation domain policy, verified domains, multi-membership, per-org default roles, owner transfer/approval, domain autojoin opt-out and hierarchy.
- [ ] **Bootstrap:** idempotent create-only secret-resolved admin provisioning; temporary passwords, mandatory first-login actions and no accidental overwrite; integrate approved GitOps reconciliation and drift.
- [ ] **SMTP/themes/locales:** implementation of secure reset/verify/invite mail templates, multilang/branding UI, asset sanitization, email signing/delivery feedback and accessible WCAG login screens.
- [ ] **Sessions:** Redis-specific session storage, rememberMe/offline policies, configurable sliding expiry, transaction fencing, expiration sweep, OTP recovery and cross-replica revocation SLA.
- [ ] **Action tokens:** complete invite, terms, change profile/email, OTP enrollment and password change required actions; only verify email/reset are currently wired.
- [ ] **Observability:** real realm metrics per-client, failure/mfa/auth latency, health endpoints, audit listeners, HTTP SIEM/webhook integrations and key events.

## P1 — acceptance and production infrastructure
- [ ] Use real PostgreSQL/Redis transactional store, Argon2, KMS/HSM signer and secret manager; test concurrent registration/code redemption/refresh replay and crash persistence on multiple replicas.
- [ ] Run Keycloak-inspired feature compliance tests and independent OIDC, OWASP ASVS/OAuth BCP protocol/security audit with approved fixture clients.
- [ ] Validate SSO browser cookie, callback, auth CSRF, PKCE downgrade, misconfigured redirect, sessions, logout and cross-tenant/organization isolation in real clients.
- [ ] Run load, soak, failure injections and credential/key disaster recovery; publish RPO/RTO and token revocation SLO.
- [ ] Map realm users/roles/orgs to existing Sapling tenant/auth domain without duplicate identity or permission escalation. Do not assume the two storage models are equivalent.

## P2 — control plane and developer experience
- [ ] Build realm admin API, versioned GitOps controller, dry-run/diff/rollback, schema/codegen and drift review. Current `metadata`/`status` are descriptive only.
- [ ] Support multi-realm operational routing/quotas and tenant lifecycle migration; current `IdentityPlatform` represents **one** realm instance, with organizations inside it. Use separate instances and properly separated stores for more realms.
- [ ] Add SDK React hooks/admin screens for login/consent/settings, localized templates, activity history and audit portal with clear least-privilege permissions.

## Exit criteria
Before claiming production readiness, execute every required supported flow with real security providers and independent audit, map remaining config sections to functioning drivers or explicitly reject them, verify deployment-safe keys/state and tenant boundaries, and close source-bound gateway/identity release gates. A source config `status.phase=Ready` or mocked test is not sufficient.

**Production startup guard:** an enabled external IdP (Google in the supplied realm) causes startup failure until an approved broker is implemented or the realm config explicitly disables the feature.
