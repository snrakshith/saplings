# External provider / Sapling platform integration matrix

A provider entry is a **design contract**, not proof of API integration. The single config `providers` property injects actual implementations. Existing Sapling PaaS offerings can implement exactly the same contracts.

| Capability | Candidate provider | Status in ZIP | Notes |
|---|---|---|---|
| Identity / SSO / OAuth | Better Auth, IdentityOS, Auth0, Keycloak | Interface | Verify sessions, MFA, token revocation, social/OIDC before production |
| RBAC / ABAC | Sapling AccessService, CASL | Reference native | Deny by default; model all tenancy rules explicitly |
| Tenant data | Postgres + Drizzle | Optional adapter source | JSONB store demonstration; add RLS, transactions, atomic metering |
| File storage | AWS S3 | Optional adapter source | S3/SES/SNS code in adapter-aws, IAM and SSE required |
| DocumentOS | Sapling DocumentOS | Interface | Build versioning, signed URLs, retention, lifecycle provider |
| Payments | Razorpay | Adapter implementation | Order/refund basic API; verify webhook signatures and payment capture separately |
| Subscription platform | Kubera / LedgerX | Interface | Invoice, settlement, dunning, taxes, entitlements |
| Transactional email | AWS SES | Optional adapter source | Configure sender verified, throttling and delivery events |
| SMS | AWS SNS, MSG91 | SNS adapter source / MSG91 interface | Country regulations and delivery receipts |
| Push | FCM | Interface | APNs bridge and device-token lifecycle |
| In-app notifications | Novu, Sapling NotificationOS | Interface | Preference and template workflows |
| Workflow/queues | BullMQ + Valkey / Temporal | In-process job reference + external adapter target | Durable leases, retries, DLQ and distributed worker needed |
| KV/cache | Valkey | Interface | TTL and eviction contracts |
| Pub/sub | Kafka | In-memory event bus reference / interface | Persistent offset and event schema needed |
| Search | Meilisearch, OpenSearch, Sapling Search | Interface | Per-tenant search filtering and ACLs |
| Product analytics | PostHog / InsightOS | Tenant-scoped event store reference | Ingestion, funnels, cohorts and retention are separate workloads |
| Feature flags | Unleash / InsightOS | Native hash-based reference | Add server-evaluated variants, control plane and targeting |
| Logs | Pino | Telemetry adapter contract | Redaction, sampling, sinks and retention |
| Traces | OpenTelemetry | Telemetry adapter contract | End-to-end distributed context propagation |
| Errors | Sentry | Telemetry adapter contract | Upload source maps, scrub sensitive data |
| Metrics | Prometheus / Grafana | Telemetry adapter contract | SLIs, dashboards and alert policy |
| Security SAST | Semgrep, CodeQL | Scanner adapter targets | Needs subprocess APIs, output normalization and CI |
| Dependency / containers | Trivy / OSV | Scanner adapter targets | Reproducible SBOM and vulnerability feeds |
| Secrets | Gitleaks | Scanner adapter target | Existing native regex is not a secrets scanner equivalent |
| Dynamic testing | OWASP ZAP | Scanner adapter target | Only target authorized applications |
| Web accessibility | axe-core | Scanner adapter target | WCAG review also needs manual testing |
| Web performance | Lighthouse, CrUX | Scanner adapter target | Labs + field performance separate |

## Integration contract model

```ts
interface StorageAdapter {
  put(tenantId: string, key: string, bytes: Uint8Array, metadata?: Record<string,string>): Promise<...>;
  get(tenantId: string, key: string, version?: string): Promise<...>;
  list(tenantId: string, prefix?: string): Promise<...>;
  delete(tenantId: string, key: string): Promise<void>;
}
```

Services are selected in config via `providers: { storage: new S3StorageAdapter(s3Client, bucket) }`. The same pattern applies to notifications, payments, authentication, persistence and telemetry. Validate per-provider behavior with sandbox credentials before launch.
