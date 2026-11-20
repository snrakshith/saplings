# Harbor + Kingsman consolidation test matrix — v0.17.0

## Verified locally (direct compiled-runtime smoke)

| Coverage | Assertion / contract |
|---|---|
| Source ownership | SDK AccessService / Accounts / IdentityService / ImpersonationService re-export one Kingsman class instance/type |
| Tenant RBAC | Role grants cannot cross tenants; grants/denials match legacy API |
| API key | Hash-only API key verification; revocation prevents reuse |
| Accounts | Normalization, email verification, password login and tenant-bound session verification |
| Membership | Organization switching checks actor ownership and tenant |
| HTTP policy | Harbor validates envelopes, versions, rate headers, correlation IDs, error envelopes |
| SAAS-133 | Effective role and explicit scopes checked with backward-compatible `{allowed}` shape |
| Realm config | Kingsman realm is accessible via canonical and legacy SDK accessor |
| SAAS-007 | Kingsman-issued RS256 token is accepted with audience and tenant checks; wrong tenant rejected |
| SDK aliases | Canonical/legacy platform keys resolve to same instance; conflicts reject |
| API key ingress | Harbor fails closed without key, rejects invalid or revoked key, binds trusted tenant only |
| API-key scope | Harbor blocks insufficient scoped key without forwarding |
| Missing resolver | Untrusted tenant mapping fails closed |
| TLS | Harbor probes fixed HTTPS target only; certificate changes require provider approval |
| Catalog | All 182 IDs and registered action lists remain present |
| Shared error class | SDK errors preserve Kingsman class identity and HTTP error shape |

**16 smoke fixtures passed** under the directly compiled Node environment. The corresponding Vitest source tests reside in `tests/v017.test.mjs`. This is not a complete regression suite or certified OIDC/gateway security test.

## Tests still required to close migration

- Execute the complete Vitest suite after frozen pnpm install and confirm old API tests, UI/hook tests, runtime fixtures and V8 coverage.
- Run dual-issuer credential and user-account migration fixtures on actual tenant PostgreSQL/Valkey state. Verify revocation, rolling session/refresh-token migration and credential hash upgrade (legacy scrypt versus Argon2id realm) across two replicas.
- Exercise Harbor-to-Kingsman identity verification through a trusted TLS/mTLS proxy path, including direct upstream spoofing and gateway-bypass attempts. Test API key rotation and cross-replica revocation.
- Verify all gateway routes, security plugins, rate windows and tenant-aware resource access under live load and failover.
- Complete issuer/audience/key rollover, Google/SAML/LDAP integrations, PKCE/refresh family, and OIDC security conformance; obtain independent security approval.

The remaining feature-specific gaps stay explicitly open in `docs/features/` and the 45-gate release policy.
