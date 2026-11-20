# v0.15.0 production-readiness assessment — evidence-based

## Is 75% achieved?

**Unverified; do not claim 75% production readiness.** The earlier 35% estimate was subjective, lacked a denominator, weighting, environment, risk threshold and auditable evidence. It cannot be converted into a measured 40 percentage-point improvement just by writing code or passing local tests. This release implements meaningful hardening, but the production gates remain incomplete. A score should be assigned only after the rubric below is approved by engineering, security and operations and applied to real evidence.

## Suggested scoring rubric (proposal, not measured scores)

| Weighted area | Weight | Required source-bound evidence for award of points |
|---|---:|---|
| SaaS data correctness / 182 domain capabilities | 20 | Per-feature authorization, transaction/concurrency, import/export and lifecycle acceptance tests, realistic backing stores |
| Authentication / realm security | 20 | Argon2id, HSM/KMS signing, OIDC test matrix, federation, session and MFA recovery, multi-replica revocation |
| Gateway / edge security | 15 | Trusted ingress, production proxy, TLS/cert lifecycle, JWT/ACL/key auth, multi-window shared limits, WAF/bot, rate/failover stress |
| Payments and finance | 15 | Cashfree sandbox live capture/recovery/refunds, ledger and settlement proof, concurrent operations and tax/legal review; Stripe/Razorpay alternatives tested |
| Persistent workflows and infrastructure | 10 | PostgreSQL and Valkey live transactions, lease/retry/crash/recovery, restore drills, retention and legal hold |
| Scanner / Defender / observability | 10 | 41 scanner category execution/coverage, actual detection precision and false positives, SIEM/audit, signed source-bound findings |
| UI web/native and accessibility | 5 | Actual React 19, RN iOS/Android/Metro, accessibility and usability acceptance, license/attribution |
| Supply chain, deployment and independent approvals | 5 | pnpm frozen lockfile, container/K8s staging, security audit, backup/soak/load, SRE approvals |
| **Total** | **100** | **Cannot be scored until evidence criteria are assessed** |

**Score policy:** a feature or subcriterion with only a registry ID, speculative adapter, mock-only test, generated document, shim-only typecheck or an unexecuted live test cannot earn its deployment points. Security-critical open P0 items block certification independently of any aggregate number. Score only the explicit, approved, testable criteria; never fabricate completion of the remainder.

## What genuinely improved in v0.15.0

- 31 nested SDK modules moved into root, public API stays flat; verifier added.
- Gateway per-request production proxy enforcement, strict request/path handling, authorization plugin and injected bot challenge/ban drivers; persistent transactional limiter and bans including independent short and long windows.
- Identity confidential client token revocation/introspection, refresh replay session revocation and absolute family lifetime, allowed-scope checks, OTP replay fence, remembered-session policy and reduced user-profile mass assignment.
- Tenant export policies for field/row read, strict allowlists, bounded cursor pagination and server-side audit.
- Added 23 focused local regression tests and updated all 182 SaaS dossiers and the ongoing gap audit. No new feature falsely marked done.

## P0/P1 release blockers that still prevent a credible 75% label

1. **Identity and authorization:** real Argon2id, protected key manager, stable persistent store/session revocation across replicas, full OIDC/PKCE/Keycloak-style first-broker login/required actions, WebAuthn and independent auth security review; reconcile existing identity service with realm identity.
2. **Gateway and edge:** verified real TLS proxy topology, approved bot challenge and WAF/DDoS provider, production Redis/Valkey atomic limit/ban performance, scoped consumer ACL, upstream failover, request smuggling suite, plugin/config governance and tracing.
3. **Payments and financial invariants:** live Cashfree merchant sandbox, timeout and refund status/dispute callbacks, subscriptions/mandates, settlement ledger reconciliation, production KMS credentials and finance signoff; Razorpay/Stripe separately.
4. **SaaS feature-specific correctness:** the 182 feature dossiers retain P0/P1 integration and authorization acceptance; 143 still map to previous reference paths. Test actual resource permissions, tenant/field grants, durable workflows, remote deletes, imports/exports and legal holds, not just catalog inventory.
5. **Infrastructure and reliability:** PostgreSQL/Valkey provider builds, Kubernetes multi-replica integration, backup/restore/PITR, failure injection, staging load/soak, alert delivery, DR runbooks and measured RTO/RPO.
6. **Supply chain, scanner, UI:** pnpm lockfile/frozen install, live scanner findings and triage, independent high/critical audit, React Native native device build, web browser tests/accessibility and Murphi source rights.

## Release decision

Release v0.15.0 as an **engineering source candidate**, not a certified production platform. The local gate manifest retains every outstanding original gate and adds specific root-refactor and new security hardening gates. Passing local gates does not automatically close any live or independent approval. Measure the rubric in a real staging and audit environment before publishing any percentage.
