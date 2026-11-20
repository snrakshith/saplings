# Single-file configuration reference

The exported `defineSaplingConfig()` takes a typed object, and `resolveSaplingConfig()` applies defaults plus sanity checks. One file can own every installed adapter and module toggle. The SDK does not currently ship full Zod schemas; TypeScript compile-time checking plus selected runtime validation is available.

| Section | Key settings | Runtime effect |
|---|---|---|
| `app` | `id`, `environment`, `name` | Environment-specific safety restrictions |
| `runtime` | `allowInMemoryInProduction`, `maxUploadBytes` | Development-only escape hatch; upload cap |
| `tenancy` | `enabled`, `enforceContext` | Require authenticated tenant context in middleware |
| `auth` | `enabled`, `apiKeys.enabled`, `defaultTtlDays` | API key defaults; IDP integration remains adapter |
| `access` | `enabled`, `enforceOnServices`, `defaultDecision` | Facade authorization controls |
| `security.scanner` | `enabled`, `enabledScannerIds`, `allowedHosts`, `root` | CLI/explicit scan selection |
| `security.defender` | `enabled`, `mode`, `blockThreshold`, `alertThreshold`, `rateLimit`, `customRules`, `onThreat`, `onAlert`, `excludedPaths` | Request threat analysis and response |
| `billing` | `enabled`, `currency` | Billing defaults (meter/quotas reference; full billing service not included) |
| `storage` | `provider`, `maxUploadBytes` | Memory or injected provider |
| `notifications`, `payments` | `enabled`, `provider` | Provider declaration; implementation must be injected |
| `audit`, `analytics`, `featureFlags`, `workflows`, `observability` | `enabled`; `workflows.maxAttempts` | Module defaults and per-job retries |
| `features` | `SAAS-XXX: {enabled, provider, options}` | Catalog-level metadata overrides; not auto-integration |
| `providers` | `{store, storage, notifications, payments, authentication, telemetry, capabilities}` | Real adapters supplied by composition root |
| `hooks` | `resolveRequestContext`, `onError` | Trusted identity and error callback extension points |

Note: some module-level `enabled` flags are currently descriptive rather than hard enforcement on every method. Disable only after reviewing SDK behavior. Configuration completeness is a roadmap item, not a current guarantee.

## Example custom access policy

```ts
const sdk = createSapling(config);
sdk.access.addRule((ctx,permission,resource) => {
  if(permission.endsWith(':delete')) return ctx.attributes?.canDelete === true;
  return true;
});
```

The rule is restrictive only; it cannot grant permissions that the caller does not possess. For contextual default-deny ABAC, extend policy evaluation and test both resource and tenant attributes.
