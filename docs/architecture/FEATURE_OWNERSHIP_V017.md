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
| SAAS-001 | User registration | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-002 | Passwordless authentication | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-003 | Email verification | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-004 | Password reset | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-005 | Login and logout | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-006 | Session management | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-007 | JWT validation | @sapling/kingsman | Kingsman realm verifier or explicit external adapter | implemented-delegate; live validation pending |
| SAAS-008 | API key lifecycle | @sapling/kingsman | Kingsman API-key service | implemented-delegate; live validation pending |
| SAAS-009 | MFA and step-up auth | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-010 | SSO and SAML | @sapling/kingsman | provider-required (NOT moved as working code) | partial/provider-needed |
| SAAS-011 | OAuth2 and OIDC | @sapling/kingsman | provider-required (NOT moved as working code) | partial/provider-needed |
| SAAS-012 | Social login | @sapling/kingsman | provider-required (NOT moved as working code) | partial/provider-needed |
| SAAS-013 | Device trust | @sapling/kingsman | SDK device record (hardware attestation missing) | partial/provider-needed |
| SAAS-014 | Service accounts | @sapling/kingsman | Kingsman API-key service | implemented-delegate; live validation pending |
| SAAS-015 | Role-based authorization | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-016 | Attribute-based authorization | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-017 | Permission policies | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-018 | Account lockout | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-019 | Tenant provisioning | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-020 | Tenant identification | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-021 | Tenant isolation | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-022 | Tenant context propagation | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-023 | Tenant data residency | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-024 | Tenant offboarding | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-025 | Organizations | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-026 | Workspaces | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-027 | Projects | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-028 | Teams | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-029 | Membership management | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-030 | User invitations | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-031 | Organization switching | @sapling/kingsman | KingsmanMembership on existing SDK membership rows | implemented-delegate; live validation pending |
| SAAS-032 | Custom roles | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-033 | Impersonation controls | @sapling/kingsman | Kingsman-owned scoped impersonation service | implemented-delegate; live validation pending |
| SAAS-034 | Plans and tiers | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-035 | Subscriptions | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-036 | Subscription lifecycle | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-037 | Free trials | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-038 | Usage metering | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-039 | Quotas | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-040 | Entitlements | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-041 | Invoices | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-042 | Payment collection | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-043 | Payment methods | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-044 | Tax calculation | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-045 | Coupons and discounts | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-046 | Credits and wallets | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-047 | Refunds | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-048 | Dunning and retries | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-049 | Revenue metrics | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-050 | Webhooks for billing | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-051 | Security scanner | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-052 | Runtime threat defender | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-053 | Secrets management | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-054 | Encryption at rest | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-055 | Encryption in transit | @sapling/harbor | GatewayTlsPolicy behind SDK Operations TLS facade | implemented-delegate; live validation pending |
| SAAS-056 | HTTP security headers | @sapling/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-057 | CORS policy | @sapling/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-058 | CSRF controls | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-059 | Rate limiting | @sapling/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-060 | Abuse detection | @sapling/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-061 | Data retention | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-062 | Data deletion | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-063 | Consent management | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-064 | Privacy export | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-065 | Audit trail | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-066 | IP allowlists | @sapling/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-067 | IP denylists | @sapling/harbor | Harbor edge plugin and SDK defender policy view | partial/shared enforcement |
| SAAS-068 | Security incident alerts | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-069 | Vulnerability management | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-070 | Compliance evidence | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-071 | Transactional email | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-072 | Bulk email | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-073 | SMS | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-074 | Push notifications | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-075 | In-app notifications | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-076 | Notification templates | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-077 | User notification preferences | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-078 | Delivery tracking | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-079 | Notification retries | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-080 | Notification opt-out | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-081 | Webhooks for notifications | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-082 | Multilingual notifications | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-083 | Object storage | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-084 | File uploads | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-085 | Presigned download URLs | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-086 | File metadata | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-087 | File versions | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-088 | Document management | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-089 | Import pipelines | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-090 | Data export | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-091 | Backup and restore | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-092 | Data migrations | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-093 | Full-text search | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-094 | CDN integration | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-095 | Media processing | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-096 | Data validation | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-097 | Soft delete | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-098 | Data archival | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-099 | Data masking | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-100 | Product events | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-101 | User identification | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-102 | Group analytics | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-103 | Funnels | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-104 | Retention analysis | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-105 | Cohort analysis | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-106 | Dashboards | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-107 | Reports | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-108 | Scheduled reports | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-109 | Custom metrics | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-110 | Error tracking | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-111 | Experiment analytics | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-112 | Usage analytics | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-113 | Background jobs | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-114 | Scheduled jobs | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-115 | Job retries | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-116 | Dead-letter queue | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-117 | Workflow orchestration | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-118 | Approval workflows | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-119 | Business rules | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-120 | Event-driven automation | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-121 | Webhook triggers | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-122 | Idempotency | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-123 | Outbox pattern | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-124 | REST API patterns | @sapling/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-125 | GraphQL APIs | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-126 | OpenAPI specification | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-127 | SDK clients | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-128 | API versioning | @sapling/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-129 | API pagination | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-130 | API filtering | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-131 | API rate-limit headers | @sapling/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-132 | Developer portal | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-133 | API key scopes | @sapling/harbor | Kingsman AccessService authorization consumed at HTTP boundary | partial/shared enforcement |
| SAAS-134 | Webhook signing | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-135 | Webhook delivery | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-136 | Event bus | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-137 | Correlation IDs | @sapling/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-138 | Error envelope | @sapling/harbor | GatewayHttpPolicies SDK binding | implemented-delegate; live validation pending |
| SAAS-139 | Feature flags | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-140 | Percentage rollouts | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-141 | A/B experiments | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-142 | Environment configuration | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-143 | Tenant configuration | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-144 | Remote configuration | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-145 | Plugins | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-146 | Custom integrations | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-147 | White labeling | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-148 | Custom domains | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-149 | Localization | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-150 | Timezone handling | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-151 | Theme configuration | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-152 | App branding | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-153 | Maintenance mode | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-154 | Structured logging | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-155 | Distributed tracing | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-156 | Request metrics | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-157 | Application health | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-158 | Readiness checks | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-159 | Circuit breaker | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-160 | Retry with backoff | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-161 | Timeouts | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-162 | Bulkheads | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-163 | SLO and SLI | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-164 | Alerting | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-165 | Deployment pipelines | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-166 | Environment provisioning | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-167 | Horizontal scaling | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-168 | Disaster recovery | @sapling/sdk | SDK capability adapter or provider placeholder | provider-needed |
| SAAS-169 | Graceful shutdown | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-170 | Configuration validation | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-171 | Comments | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-172 | Activity feeds | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-173 | Task assignments | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-174 | Approval history | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-175 | Shared resources | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-176 | Contacts and accounts | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-177 | User directories | @sapling/kingsman | Kingsman legacy account/role/MFA lifecycle | implemented-delegate; live validation pending |
| SAAS-178 | Helpdesk tickets | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-179 | Feedback collection | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-180 | Admin console | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
| SAAS-181 | Usage policies | @sapling/sdk | SDK local binding | existing-implementation; feature-specific acceptance pending |
| SAAS-182 | Data ownership transitions | @sapling/sdk | SDK hybrid binding | existing-implementation; feature-specific acceptance pending |
