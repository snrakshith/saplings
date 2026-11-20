> **v0.17.0 package identity:** `@sapling/harbor` is a reusable library, not a deployed platform on its own. Previous package name deprecated; update imports.

# @sapling/harbor

Kong-inspired **config-driven HTTP gateway core** for Node 22 and TypeScript, retaining the uploaded GatewayConfig JSON/YAML structure (`gateway.sapling.dev/v1alpha1`). Supports route/service/upstream definitions, scoped plugin pipeline, host/method/prefix routing, weighted selection, active healthchecks, breaker, safe retries, JWT/ACL hooks, bounded input/output and TLS listener with SNI.

```ts
import {Gateway,loadGatewayConfig} from '@sapling/harbor';
const config=await loadGatewayConfig('./GatewayConfig.json');
const gateway=new Gateway(config,{verifyJwt:yourIssuerVerifier,rateLimit:yourDistributedLimiter,threatIp:yourTrustedFeed,resolveSecret:yourVaultResolver});
// Production: provide real certificates and call listenTls(); or explicit trusted TLS ingress.
const port=await gateway.listen(0,'127.0.0.1');
```

`loadGatewayConfig('.yaml')` uses the declared `yaml` dependency. Store secrets as vault references and inject a trusted resolver. Do not use the volatile limiter in production. See `docs/platforms/gateway/{PRODUCT_SPECIFICATION,TECHNICAL_SPECIFICATION,GAPS_AND_IMPROVEMENTS}.md` in the monorepo and `docs/platforms/CONFIG_COVERAGE.md`. Incomplete provider/edge plugins explicitly fail closed or are documented as partial; this is not Kong certification.
