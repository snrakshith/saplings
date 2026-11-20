# v0.17.0 — 182-feature ownership and package migration

**Harbor and Kingsman are reusable packages, not separate deployed platforms.** All original catalog IDs/actions remain in the SDK facade. The owner field identifies implementation authority, not automatic completion.

- Kingsman: 23 entries (account, key, role, MFA, invitations, tenant membership, impersonation); 10–13 still have provider/hardware-specific gaps.
- Harbor: 13 entries (ingress TLS, headers/CORS/rate/IP policy, API contracts, correlation). Some are shared edge/SDK policy, not fully moved code.
- SDK: 146 entries (business, data, billing, storage, workflow and application policy); partial overlaps intentionally retained.

## Principles

1. One authoritative IAM implementation under Kingsman, with SDK re-export compatibility for user/account/key/role interfaces.
2. Harbor authenticates requests and owns edge security/HTTP policy. SDK must independently enforce tenant/row/field permissions, CSRF and billing quotas.
3. Provider placeholders (SAML/social, attestation, WAF, external audit) stay open and fail closed. Do not mark moved from an identifier mapping alone.
4. Retain source store collections and hashed tokens; changing the package does **not** migrate data. Preserve old platform config getters as deprecated aliases only.
5. Run full Vitest and production gates before publishing; local smoke tests are not substitute.

| SaaS ID | Feature | Owner | Current implementation | Verification gap |
|---|---|---|---|---|
| SAAS-001 | User registration | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-002 | Passwordless authentication | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-003 | Email verification | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-004 | Password reset | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-005 | Login and logout | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-006 | Session management | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-007 | JWT validation | @saplings/kingsman | Kingsman realm verifier or explicit external adapter | implemented-delegate; live validation pending |
| SAAS-008 | API key lifecycle | @saplings/kingsman | Kingsman API-key service | implemented-delegate; live validation pending |
| SAAS-009 | MFA and step-up auth | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-010 | SSO and SAML | @saplings/kingsman | provider-required (NOT moved as working code) | partial/provider-needed |
| SAAS-011 | OAuth2 and OIDC | @saplings/kingsman | provider-required (NOT moved as working code) | partial/provider-needed |
| SAAS-012 | Social login | @saplings/kingsman | provider-required (NOT moved as working code) | partial/provider-needed |
| SAAS-013 | Device trust | @saplings/kingsman | SDK device record (hardware attestation missing) | partial/provider-needed |
| SAAS-014 | Service accounts | @saplings/kingsman | Kingsman API-key service | implemented-delegate; live validation pending |
| SAAS-015 | Role-based authorization | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-016 | Attribute-based authorization | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-017 | Permission policies | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-018 | Account lockout | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-019 | Tenant provisioning | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-020 | Tenant identification | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-021 | Tenant isolation | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-022 | Tenant context propagation | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-023 | Tenant data residency | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-024 | Tenant offboarding | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-025 | Organizations | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-026 | Workspaces | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-027 | Projects | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-028 | Teams | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-029 | Membership management | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-030 | User invitations | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-031 | Organization switching | @saplings/kingsman | KingsmanMembership on existing SDK membership rows | implemented-delegate; live validation pending |
| SAAS-032 | Custom roles | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-033 | Impersonation controls | @saplings/kingsman | Kingsman-owned scoped impersonation service | implemented-delegate; live validation pending |
| SAAS-034 | Plans and tiers | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-035 | Subscriptions | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-036 | Subscription lifecycle | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-037 | Free trials | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-038 | Usage metering | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-039 | Quotas | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-040 | Entitlements | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-041 | Invoices | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-042 | Payment collection | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-043 | Payment methods | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-044 | Tax calculation | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-045 | Coupons and discounts | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-046 | Credits and wallets | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-047 | Refunds | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-048 | Dunning and retries | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-049 | Revenue metrics | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-050 | Webhooks for billing | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-051 | Security scanner | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-052 | Runtime threat defender | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-053 | Secrets management | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-054 | Encryption at rest | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-055 | Encryption in transit | @saplings/harbor | GatewayTlsPolicy behind SDK Operations TLS facade | implemented-delegate; live validation pending |
| SAAS-056 | HTTP security headers | @saplings/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-057 | CORS policy | @saplings/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-058 | CSRF controls | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-059 | Rate limiting | @saplings/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-060 | Abuse detection | @saplings/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-061 | Data retention | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-062 | Data deletion | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-063 | Consent management | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-064 | Privacy export | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-065 | Audit trail | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-066 | IP allowlists | @saplings/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-067 | IP denylists | @saplings/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-068 | Security incident alerts | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-069 | Vulnerability management | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-070 | Compliance evidence | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-071 | Transactional email | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-072 | Bulk email | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-073 | SMS | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-074 | Push notifications | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-075 | In-app notifications | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-076 | Notification templates | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-077 | User notification preferences | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-078 | Delivery tracking | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-079 | Notification retries | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-080 | Notification opt-out | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-081 | Webhooks for notifications | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-082 | Multilingual notifications | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-083 | Object storage | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-084 | File uploads | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-085 | Presigned download URLs | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-086 | File metadata | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-087 | File versions | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-088 | Document management | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-089 | Import pipelines | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-090 | Data export | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-091 | Backup and restore | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-092 | Data migrations | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-093 | Full-text search | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-094 | CDN integration | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-095 | Media processing | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-096 | Data validation | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-097 | Soft delete | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-098 | Data archival | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-099 | Data masking | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-100 | Product events | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-101 | User identification | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-102 | Group analytics | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-103 | Funnels | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-104 | Retention analysis | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-105 | Cohort analysis | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-106 | Dashboards | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-107 | Reports | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-108 | Scheduled reports | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-109 | Custom metrics | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-110 | Error tracking | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-111 | Experiment analytics | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-112 | Usage analytics | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-113 | Background jobs | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-114 | Scheduled jobs | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-115 | Job retries | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-116 | Dead-letter queue | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-117 | Workflow orchestration | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-118 | Approval workflows | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-119 | Business rules | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-120 | Event-driven automation | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-121 | Webhook triggers | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-122 | Idempotency | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-123 | Outbox pattern | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-124 | REST API patterns | @saplings/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-125 | GraphQL APIs | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-126 | OpenAPI specification | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-127 | SDK clients | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-128 | API versioning | @saplings/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-129 | API pagination | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-130 | API filtering | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-131 | API rate-limit headers | @saplings/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-132 | Developer portal | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-133 | API key scopes | @saplings/harbor | Kingsman AccessService authorization consumed at HTTP boundary | partial/shared enforcement |
| SAAS-134 | Webhook signing | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-135 | Webhook delivery | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-136 | Event bus | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-137 | Correlation IDs | @saplings/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-138 | Error envelope | @saplings/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-139 | Feature flags | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-140 | Percentage rollouts | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-141 | A/B experiments | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-142 | Environment configuration | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-143 | Tenant configuration | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-144 | Remote configuration | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-145 | Plugins | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-146 | Custom integrations | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-147 | White labeling | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-148 | Custom domains | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-149 | Localization | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-150 | Timezone handling | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-151 | Theme configuration | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-152 | App branding | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-153 | Maintenance mode | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-154 | Structured logging | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-155 | Distributed tracing | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-156 | Request metrics | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-157 | Application health | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-158 | Readiness checks | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-159 | Circuit breaker | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-160 | Retry with backoff | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-161 | Timeouts | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-162 | Bulkheads | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-163 | SLO and SLI | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-164 | Alerting | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-165 | Deployment pipelines | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-166 | Environment provisioning | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-167 | Horizontal scaling | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-168 | Disaster recovery | @saplings/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-169 | Graceful shutdown | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-170 | Configuration validation | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-171 | Comments | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-172 | Activity feeds | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-173 | Task assignments | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-174 | Approval history | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-175 | Shared resources | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-176 | Contacts and accounts | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-177 | User directories | @saplings/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-178 | Helpdesk tickets | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-179 | Feedback collection | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-180 | Admin console | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-181 | Usage policies | @saplings/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-182 | Data ownership transitions | @saplings/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
