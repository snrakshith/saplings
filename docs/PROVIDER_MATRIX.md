> **v0.11.0 update:** Cashfree is the preferred payment gateway. See [Cashfree payments](technical-specifications/CASHFREE_PAYMENTS.md) and [feature dossiers](features/README.md). Historical sections below may describe previous releases.

> v0.8.0 update: see [technical specifications](technical-specifications/README.md) for current contracts, validation migration, recurring billing, offboarding, acceptance criteria and release blockers. Historical descriptions below may describe prior releases.

# Provider integration matrix — v0.5.0

Configure instances in the single `sapling.config.ts` under `providers`. All target mappings and service identities are trusted deployment config, never arbitrary client input.

| Feature / service | Concrete code path | Deployment dependency |
|---|---|---|
| SAAS-010/011/012 | `OidcFederationAdapter` + pinned access and ID `JwksAuthenticationAdapter` instances | OIDC issuer, client, callback, broker connections for SAML and social |
| SAAS-043 | `StripePaymentMethodsAdapter` | Stripe test/live account, verified tenant/customer mapping, hosted card collection |
| SAAS-050 | `RazorpayWebhookAdapter` | Raw request body and tenant routing from trusted merchant/order mapping |
| SAAS-085 | `S3PresignAdapter` in adapter-aws | S3 bucket, scoped IAM, object ownership |
| SAAS-092/165/166/168 | `GitHubWorkflowAdapter` | Reviewed workflows for migration, deployment/rollback, OpenTofu/provisioning, physical backup/restore/drill; fixed refs and permitted tenants |
| SAAS-094 | `CloudflareCacheAdapter` purge; GitHub workflow for configure | Cloudflare zone/credentials; action routing to reviewed configuration workflow |
| SAAS-095 | `MediaCapabilityAdapter` + `SharpTransformer` | S3/compatible storage; installed Sharp native dependency; worker isolation |
| SAAS-155 | `OtlpTraceAdapter` | OTLP HTTP collector; actual instrumentation in application |
| SAAS-167 | `KubernetesScaleAdapter` | Kubernetes API; scoped RBAC; fixed namespace/deployment and replica bounds |
| SAAS-055/148 (hybrid) | Local HTTPS check and DNS challenge | Certificate/routing workflow; require verified ownership before activation |
| Database | `DrizzleStore`, migrations 0001–0003 | PostgreSQL non-owner runtime role, backups, connection pooling |
| Notifications and storage | `AwsNotificationsAdapter`, `S3StorageAdapter` | AWS SES/SNS/S3, channel credentials and consent rules |
| Rate limiter | `ValkeyRateState` | Valkey/Redis-compatible client, authenticated TLS and expiry |
| GraphQL | `graphqlExecutor` in adapter-app | Application GraphQLSchema and per-resolver authorization |
| Scanner evidence | `EvidenceReportAdapter`, `SarifReportAdapter` | Actual CI tools or trusted manual assessment; fresh reports |

Example composition (trusted config; placeholders are intentionally not live endpoints):

```ts
const control = new GitHubWorkflowAdapter(owner, repo, token, targets);
const cdn = new CloudflareCacheAdapter(cloudflareToken, zones);
const capabilities = {
  'SAAS-010': oidc, 'SAAS-011': oidc, 'SAAS-012': oidc,
  'SAAS-043': stripe, 'SAAS-050': razorpayWebhook, 'SAAS-085': presigner,
  'SAAS-092': control, 'SAAS-165': control, 'SAAS-166': control, 'SAAS-168': control,
  'SAAS-094': { execute: (request) => request.action === 'purge' ? cdn.execute(request) : control.execute(request) },
  'SAAS-095': media, 'SAAS-155': traces, 'SAAS-167': scaling,
};
// set providers.capabilities: capabilities in defineSaplingConfig
```

An adapter dispatch acceptance is not proof of successful deployment, provisioning, certificate issue or disaster recovery. Application workflows must independently enforce target safety, approval, audit and completion status. All external integrations require live validation; GitHub and Kubernetes transport tests are mocked. AWS, Drizzle, Sharp/GraphQL dependency builds were not possible offline.

Provider API references: [GitHub workflows](https://docs.github.com/en/rest/actions/workflows), [Kubernetes deployment API](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/), [Cloudflare cache purge](https://developers.cloudflare.com/api/resources/cache/methods/purge/), [OTLP specification](https://opentelemetry.io/docs/specs/otlp/), [Stripe SetupIntents](https://docs.stripe.com/api/setup_intents).

Additional v0.4 configuration: `storage.authorizeObject`, `expanded.challengeDelivery`, `expanded.worker.tenantConcurrency`, `expanded.worker.deadlineMs`, `expanded.operations.domainControl`, `expanded.operations.certificateControl`. See release validation for AWS sandbox checks and provider harness.
