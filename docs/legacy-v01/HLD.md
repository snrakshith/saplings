# HLD — Sapling Unified SDK

```mermaid
flowchart TB
  A[Node.js / Express application] --> CFG[Single sapling.config.ts]
  CFG --> SDK[@sapling/sdk Composition Root]
  SDK --> TEN[Tenancy + Context]
  SDK --> IAM[Auth Adapter + RBAC / ABAC]
  SDK --> CORE[Resources + Audit + Metering + Flags + Jobs]
  SDK --> SEC[Defender Middleware]
  CFG --> SCAN[Security Scanner CLI / CI]
  SCAN --> SRC[Source-pattern checks]
  SCAN --> WEB[Authorized passive HTTP checks]
  CORE --> STORE[Store interface]
  CORE --> PRV[Notification / Payments / Storage interfaces]
  STORE --> MEM[In-memory development]
  STORE --> PG[PostgreSQL + Drizzle optional adapter]
  PRV --> AWS[AWS S3 / SES / SNS optional adapter]
  PRV --> OTHER[Razorpay and custom providers]
  SEC --> OPS[Audit / Alert callback / WAF integration]
```

### Architecture constraints

- All modules receive a trusted `ActorContext` containing a tenant ID and actor ID. The store partitions on tenant ID, and permission gates check context.
- One configuration controls each module and references all master feature IDs. An adapter-only feature switch does not magically implement that service.
- Scanner is CLI/CI/scheduled work; defender is runtime middleware. HTTP middleware is not an appropriate location for S3 uploads, invoices or scheduled jobs.
- `@sapling/catalog` is a public architectural contract: stable IDs, category, module, coverage classification.
- `@sapling/security` owns detection and scanner primitives, not identity or storage.
- SDK service facades own business logic and call provider interfaces. Official AWS SDK and Postgres/Drizzle libraries are used only by optional adapters.

### Deployment paths

- **Local/test:** in-process store, storage, quotas, rate limiter and job polling. No external services required for smoke tests.
- **Production target:** verified IDP, PostgreSQL dedicated schemas/RLS, S3 bucket with versioning, managed message/notification and payment providers, distributed rate limit/WAF, queue workers, OpenTelemetry + SIEM, credential vault and backup/DR.
