# Master feature checklist — v0.17.0

All 182 original SaaS IDs and 41 original scanner IDs retained. The registry includes 119 local reference mappings, 49 hybrid mappings and 14 provider-required mappings. A mapped ID is not proof of feature completion. Local means executable reference operations or an exported utility; hybrid means limited local behavior plus application/provider work; provider-required means an adapter must be configured (concrete adapter source is included for every provider-only ID; live provider validation is not complete).

| ID | Feature | Implementation category | Registered operations |
|---|---|---|---|
| SAAS-001 | User registration | local-reference | register |
| SAAS-002 | Passwordless authentication | local-reference | issue; consume |
| SAAS-003 | Email verification | local-reference | issue; consume |
| SAAS-004 | Password reset | local-reference | issue; consume |
| SAAS-005 | Login and logout | local-reference | login; logout |
| SAAS-006 | Session management | local-reference | verify; list; revoke |
| SAAS-007 | JWT validation | hybrid-reference | verify |
| SAAS-008 | API key lifecycle | local-reference | create; list; revoke |
| SAAS-009 | MFA and step-up auth | hybrid-reference | enroll; confirm; challenge; verify; revoke |
| SAAS-010 | SSO and SAML | provider-required | start; callback; metadata |
| SAAS-011 | OAuth2 and OIDC | provider-required | authorize; callback; refresh; revoke |
| SAAS-012 | Social login | provider-required | start; callback |
| SAAS-013 | Device trust | hybrid-reference | register; revoke |
| SAAS-014 | Service accounts | local-reference | create; revoke |
| SAAS-015 | Role-based authorization | local-reference | setRole; check; assign |
| SAAS-016 | Attribute-based authorization | hybrid-reference | check |
| SAAS-017 | Permission policies | hybrid-reference | check |
| SAAS-018 | Account lockout | local-reference | login |
| SAAS-019 | Tenant provisioning | hybrid-reference | provision |
| SAAS-020 | Tenant identification | local-reference | context |
| SAAS-021 | Tenant isolation | hybrid-reference | check |
| SAAS-022 | Tenant context propagation | local-reference | context |
| SAAS-023 | Tenant data residency | hybrid-reference | get |
| SAAS-024 | Tenant offboarding | hybrid-reference | request; approve; status; advance |
| SAAS-025 | Organizations | local-reference | create; get; list; update; delete |
| SAAS-026 | Workspaces | local-reference | create; get; list; update; delete |
| SAAS-027 | Projects | local-reference | create; get; list; update; delete |
| SAAS-028 | Teams | local-reference | create; get; list; update; delete |
| SAAS-029 | Membership management | local-reference | create; get; list; update; delete |
| SAAS-030 | User invitations | local-reference | invite; accept |
| SAAS-031 | Organization switching | local-reference | switch |
| SAAS-032 | Custom roles | local-reference | set |
| SAAS-033 | Impersonation controls | hybrid-reference | start; stop |
| SAAS-034 | Plans and tiers | local-reference | create; list |
| SAAS-035 | Subscriptions | local-reference | create; list |
| SAAS-036 | Subscription lifecycle | hybrid-reference | transition; schedule; issueDue; cancelSchedule; quoteChange |
| SAAS-037 | Free trials | local-reference | start |
| SAAS-038 | Usage metering | local-reference | meter; get |
| SAAS-039 | Quotas | local-reference | set; get |
| SAAS-040 | Entitlements | local-reference | set; check |
| SAAS-041 | Invoices | local-reference | create; get; list |
| SAAS-042 | Payment collection | hybrid-reference | order |
| SAAS-043 | Payment methods | provider-required | attach; list; detach |
| SAAS-044 | Tax calculation | hybrid-reference | calculate |
| SAAS-045 | Coupons and discounts | local-reference | create; redeem |
| SAAS-046 | Credits and wallets | local-reference | post |
| SAAS-047 | Refunds | hybrid-reference | refund |
| SAAS-048 | Dunning and retries | hybrid-reference | enqueue; chargeDue; resume; sweep |
| SAAS-049 | Revenue metrics | local-reference | report |
| SAAS-050 | Webhooks for billing | provider-required | verify; reconcile |
| SAAS-051 | Security scanner | local-reference | scan |
| SAAS-052 | Runtime threat defender | local-reference | assess |
| SAAS-053 | Secrets management | hybrid-reference | get; put; rotate |
| SAAS-054 | Encryption at rest | hybrid-reference | encrypt; decrypt |
| SAAS-055 | Encryption in transit | hybrid-reference | verify; configure |
| SAAS-056 | HTTP security headers | hybrid-reference | policy |
| SAAS-057 | CORS policy | hybrid-reference | policy |
| SAAS-058 | CSRF controls | hybrid-reference | policy |
| SAAS-059 | Rate limiting | hybrid-reference | policy |
| SAAS-060 | Abuse detection | hybrid-reference | policy |
| SAAS-061 | Data retention | local-reference | run |
| SAAS-062 | Data deletion | local-reference | delete |
| SAAS-063 | Consent management | local-reference | record; history |
| SAAS-064 | Privacy export | local-reference | export |
| SAAS-065 | Audit trail | local-reference | list; record |
| SAAS-066 | IP allowlists | hybrid-reference | policy |
| SAAS-067 | IP denylists | hybrid-reference | policy |
| SAAS-068 | Security incident alerts | local-reference | list; ack |
| SAAS-069 | Vulnerability management | local-reference | create; get; list; update; delete |
| SAAS-070 | Compliance evidence | local-reference | create; get; list; update; delete |
| SAAS-071 | Transactional email | hybrid-reference | send |
| SAAS-072 | Bulk email | hybrid-reference | enqueue |
| SAAS-073 | SMS | hybrid-reference | send |
| SAAS-074 | Push notifications | hybrid-reference | send |
| SAAS-075 | In-app notifications | local-reference | send; list; read |
| SAAS-076 | Notification templates | local-reference | create; get; list; update; delete |
| SAAS-077 | User notification preferences | local-reference | set; get |
| SAAS-078 | Delivery tracking | local-reference | list |
| SAAS-079 | Notification retries | hybrid-reference | enqueue |
| SAAS-080 | Notification opt-out | local-reference | optOut |
| SAAS-081 | Webhooks for notifications | hybrid-reference | verify; reconcile |
| SAAS-082 | Multilingual notifications | local-reference | render |
| SAAS-083 | Object storage | hybrid-reference | upload; download; list; delete |
| SAAS-084 | File uploads | hybrid-reference | upload; download; list; delete |
| SAAS-085 | Presigned download URLs | provider-required | sign |
| SAAS-086 | File metadata | local-reference | get |
| SAAS-087 | File versions | local-reference | get |
| SAAS-088 | Document management | local-reference | create; get; list; update; delete |
| SAAS-089 | Import pipelines | local-reference | import |
| SAAS-090 | Data export | local-reference | export |
| SAAS-091 | Backup and restore | hybrid-reference | backup; restore; status |
| SAAS-092 | Data migrations | provider-required | plan; apply; status |
| SAAS-093 | Full-text search | hybrid-reference | search |
| SAAS-094 | CDN integration | provider-required | purge; configure |
| SAAS-095 | Media processing | provider-required | transform; status |
| SAAS-096 | Data validation | local-reference | validate |
| SAAS-097 | Soft delete | local-reference | delete |
| SAAS-098 | Data archival | local-reference | archive |
| SAAS-099 | Data masking | local-reference | mask |
| SAAS-100 | Product events | local-reference | track |
| SAAS-101 | User identification | local-reference | identify |
| SAAS-102 | Group analytics | local-reference | report |
| SAAS-103 | Funnels | local-reference | report |
| SAAS-104 | Retention analysis | local-reference | report |
| SAAS-105 | Cohort analysis | local-reference | report |
| SAAS-106 | Dashboards | local-reference | create; get; list; update; delete |
| SAAS-107 | Reports | local-reference | report |
| SAAS-108 | Scheduled reports | hybrid-reference | schedule |
| SAAS-109 | Custom metrics | local-reference | report |
| SAAS-110 | Error tracking | local-reference | capture; report |
| SAAS-111 | Experiment analytics | local-reference | report |
| SAAS-112 | Usage analytics | local-reference | report |
| SAAS-113 | Background jobs | local-reference | enqueue; list |
| SAAS-114 | Scheduled jobs | local-reference | enqueue; list |
| SAAS-115 | Job retries | local-reference | requeue |
| SAAS-116 | Dead-letter queue | local-reference | list; requeue |
| SAAS-117 | Workflow orchestration | hybrid-reference | start |
| SAAS-118 | Approval workflows | local-reference | request; decide |
| SAAS-119 | Business rules | local-reference | evaluate |
| SAAS-120 | Event-driven automation | hybrid-reference | enqueue |
| SAAS-121 | Webhook triggers | hybrid-reference | verify; dispatch |
| SAAS-122 | Idempotency | local-reference | record |
| SAAS-123 | Outbox pattern | hybrid-reference | append |
| SAAS-124 | REST API patterns | local-reference | envelope |
| SAAS-125 | GraphQL APIs | hybrid-reference | execute; schema |
| SAAS-126 | OpenAPI specification | hybrid-reference | document |
| SAAS-127 | SDK clients | local-reference | generate |
| SAAS-128 | API versioning | local-reference | resolve |
| SAAS-129 | API pagination | local-reference | page |
| SAAS-130 | API filtering | local-reference | filter |
| SAAS-131 | API rate-limit headers | local-reference | headers |
| SAAS-132 | Developer portal | local-reference | create; get; list; update; delete |
| SAAS-133 | API key scopes | local-reference | check |
| SAAS-134 | Webhook signing | local-reference | sign; verify |
| SAAS-135 | Webhook delivery | hybrid-reference | enqueue |
| SAAS-136 | Event bus | hybrid-reference | emit |
| SAAS-137 | Correlation IDs | local-reference | get |
| SAAS-138 | Error envelope | local-reference | envelope |
| SAAS-139 | Feature flags | local-reference | set; evaluate |
| SAAS-140 | Percentage rollouts | local-reference | set; evaluate |
| SAAS-141 | A/B experiments | local-reference | set; evaluate |
| SAAS-142 | Environment configuration | local-reference | get |
| SAAS-143 | Tenant configuration | local-reference | create; get; list; update; delete |
| SAAS-144 | Remote configuration | local-reference | create; get; list; update; delete |
| SAAS-145 | Plugins | hybrid-reference | install; uninstall; list |
| SAAS-146 | Custom integrations | local-reference | create; get; list; update; delete |
| SAAS-147 | White labeling | local-reference | create; get; list; update; delete |
| SAAS-148 | Custom domains | hybrid-reference | request; verify; activate; remove |
| SAAS-149 | Localization | local-reference | format |
| SAAS-150 | Timezone handling | local-reference | format |
| SAAS-151 | Theme configuration | local-reference | create; get; list; update; delete |
| SAAS-152 | App branding | local-reference | create; get; list; update; delete |
| SAAS-153 | Maintenance mode | local-reference | create; get; list; update; delete |
| SAAS-154 | Structured logging | local-reference | log |
| SAAS-155 | Distributed tracing | provider-required | export; status |
| SAAS-156 | Request metrics | local-reference | observe; snapshot |
| SAAS-157 | Application health | local-reference | get |
| SAAS-158 | Readiness checks | local-reference | get |
| SAAS-159 | Circuit breaker | local-reference | describe |
| SAAS-160 | Retry with backoff | local-reference | describe |
| SAAS-161 | Timeouts | local-reference | describe |
| SAAS-162 | Bulkheads | local-reference | describe |
| SAAS-163 | SLO and SLI | local-reference | report |
| SAAS-164 | Alerting | hybrid-reference | record; list |
| SAAS-165 | Deployment pipelines | provider-required | deploy; status; rollback |
| SAAS-166 | Environment provisioning | provider-required | plan; apply; destroy |
| SAAS-167 | Horizontal scaling | provider-required | scale; status |
| SAAS-168 | Disaster recovery | provider-required | backup; restore; drill |
| SAAS-169 | Graceful shutdown | local-reference | status |
| SAAS-170 | Configuration validation | local-reference | validate |
| SAAS-171 | Comments | local-reference | create; get; list; update; delete |
| SAAS-172 | Activity feeds | local-reference | create; get; list; update; delete |
| SAAS-173 | Task assignments | local-reference | create; assign; complete; list |
| SAAS-174 | Approval history | local-reference | list |
| SAAS-175 | Shared resources | local-reference | create; get; list; update; delete |
| SAAS-176 | Contacts and accounts | local-reference | create; get; list; update; delete |
| SAAS-177 | User directories | local-reference | list |
| SAAS-178 | Helpdesk tickets | local-reference | create; update; list |
| SAAS-179 | Feedback collection | local-reference | create; get; list; update; delete |
| SAAS-180 | Admin console | hybrid-reference | overview |
| SAAS-181 | Usage policies | local-reference | create; get; list; update; delete |
| SAAS-182 | Data ownership transitions | hybrid-reference | transfer |

## Scanner categories

| ID | Category | Execution |
|---|---|---|
| SCAN-01 | SQL Injection Scanner | external |
| SCAN-02 | Cross-Site Scripting (XSS) Scanner | external |
| SCAN-03 | Security Headers Scanner | passive-http |
| SCAN-04 | API Key Exposure Scanner | external |
| SCAN-05 | SSL/TLS Security Scanner | passive-http |
| SCAN-06 | CORS Misconfiguration Scanner | passive-http |
| SCAN-07 | CSRF Protection Scanner | external |
| SCAN-08 | Cookie & Session Security Scanner | passive-http |
| SCAN-09 | Authentication Flow Scanner | external |
| SCAN-10 | DNS & Email Security Scanner | dns (configured) |
| SCAN-11 | Open Redirect Scanner | external |
| SCAN-12 | GraphQL Security Scanner | external |
| SCAN-13 | JWT Security Audit | external |
| SCAN-14 | Tech Stack & CVE Scanner | external |
| SCAN-15 | Threat Intelligence Scanner | offline IOC feed (configured) |
| SCAN-16 | Legal Compliance Scanner | external |
| SCAN-17 | DDoS Protection Scanner | external |
| SCAN-18 | File Upload Security Scanner | external |
| SCAN-19 | Audit Logging & Monitoring Scanner | external |
| SCAN-20 | Mobile API Rate Limiting Scanner | external |
| SCAN-21 | Domain Hijacking Detection | dns (configured) |
| SCAN-22 | Debug Endpoints Scanner | external |
| SCAN-23 | Input Validation Scanner | external |
| SCAN-24 | Vercel Hosting Security Scanner | external |
| SCAN-25 | Netlify Hosting Security Scanner | external |
| SCAN-26 | Cloudflare Security Scanner | external |
| SCAN-27 | Dependency Vulnerability Scanner | external |
| SCAN-28 | Supabase Security Scanner | external |
| SCAN-29 | Firebase Security Scanner | external |
| SCAN-30 | GitHub Repository Security Scanner | external |
| SCAN-31 | Browser Storage & Session Token Scanner | external |
| SCAN-32 | Source Code SAST Scanner | external |
| SCAN-33 | Webhook Signature Verification Scanner | external |
| SCAN-34 | IDOR & Broken Access Control Scanner | external |
| SCAN-35 | Tenant Isolation Scanner | external |
| SCAN-36 | SEO Scanner | external |
| SCAN-37 | AEO Scanner (AI Visibility) | external |
| SCAN-38 | Uptime Monitoring & Status Pages | passive-http |
| SCAN-39 | Performance & Core Web Vitals Scanner | external |
| SCAN-40 | Accessibility Scanner (WCAG) | external |
| SCAN-41 | Domain Watchtower | dns (configured) |

Static/passive categories: 5; configured DNS adds 3 categories. SCAN-15 has a configured offline IOC feed; live feed sourcing and efficacy validation remain required. All categories support evidence import; an evidence import is not a scanner implementation. The original vendor 200+ check inventory is not reproduced. No scan result establishes the absence of vulnerabilities.

See GAPS_AND_IMPROVEMENTS.md for release gates.
