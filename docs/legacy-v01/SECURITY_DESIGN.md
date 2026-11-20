# Unified security SDK — scanner + defender

## Scanner catalog and source of names

`SCAN-01..SCAN-41` match the **41 public category names** presented at https://checkvibe.dev/security-checks on 11 November 2026. Public page groups: 19 vulnerability, 5 configuration, 8 infrastructure, 1 compliance, 4 monitoring, 1 performance, 1 accessibility, 2 SEO/AEO. The public vendor advertises 200+ individual checks; it does **not** imply that this SDK has implemented those checks. A per-check vendor ground-truth mapping would require separate authorized research and substantial engineering.

Reference code supplies:

- **Source heuristics**: exposed credentials, open redirects, questionable upload patterns, exposed debug routes, unsafe dynamic evaluation, token storage, shell execution, TLS verification disablement, webhooks needing signature validation, possibly unscoped reads, client-defined tenant header usage.
- **Passive HTTP/URL checks**: selected response security headers, HSTS / HTTPS presence, CORS wildcard+credentials combination, cookie flags heuristic, HTTP 5xx response. URL checks require explicit `allowedHosts` and only issue GET; no active payload probing.
- **Source outputs**: check IDs, severity, confidence, redacted evidence, remediation and SARIF formatting.
- **External scanners/integrations not implemented**: SQLi proof, XSS proof, DAST, WAF evaluation, CVE data, GitHub posture, Firebase/Supabase/Vercel/Netlify/Cloudflare accounts, DNS/domain registrar telemetry, SEO 68 checks, AEO 46 checks, Core Web Vitals field/lab scores and WCAG accessibility auditing. Add adapters for ZAP, Semgrep, Gitleaks, Trivy, OWASP Dependency-Check, axe-core and Lighthouse rather than inventing equivalent engines.

**Threat detection design**

- Input: Express request metadata; trusted tenant/actor context supplied by a verified authentication resolver; optional bounded body text. Do not log raw secrets or request bodies.
- Signals: high-risk sensitive-path probing, traversal-like inputs, SQLi/XSS-like indicators, potential LLM prompt probes, known scanner user agents, rate window breach, configurable custom rules.
- Scores: heuristic cumulative score, per-signal weights, configurable alert/block threshold, monitor or block mode. High scores are not guarantees of maliciousness.
- Aggregation: hashed identity and signal fingerprint; alert cooldown per fingerprint; best-effort asynchronous callback.
- Action: send generic `403 REQUEST_BLOCKED` or `429 RATE_LIMITED` error envelope; set request correlation header and selected safe security headers.
- Privacy: keep event evidence descriptive, not raw query strings; avoid sensitive log payloads.
- Operations: monitor false positives, collect metrics, add distributed state, WAF/CDN protection, bot reputation, IP rotation linkage, SIEM persistence and incident lifecycle before production.

## Threat response example

```ts
security: {
  defender: {
    enabled: true,
    mode: 'block',
    blockThreshold: 80,
    alertThreshold: 45,
    rateLimit: { enabled: true, maxRequests: 120, windowMs: 60_000 },
    excludedPaths: ['/health', '/ready'],
    customRules: [{
      id: 'deny-internal-export',
      evaluate: (req) => req.path === '/internal/export'
        ? { id: 'internal-export-probe', weight: 90, evidence: 'Unexpected export route request' }
        : undefined,
    }],
    onAlert: (event) => alertService.handle(event),
  },
}
```

In general, a custom rule may use request headers, URL, body and `tenantId`/`userId`. Do not use regex-only defense instead of safe SQL parameterization, output encoding, CSRF protection or authorization.

## Scan CLI

```bash
node packages/cli/dist/index.js scan --path .
node packages/cli/dist/index.js scan --path src --url https://owned.example --allow-host owned.example
node packages/cli/dist/index.js scan --path src --format sarif > sarif.json
```

Scanner results explicitly distinguish `executedScannerIds` vs `notExecutedScannerIds`. The absence of findings is **never** a security certification.

## Threat-model boundaries

1. Express middleware is not a substitute for an API gateway / edge WAF / DDoS provider.
2. Source heuristics do not validate SQLi/XSS exploitability, auth flow safety, tenant isolation, or webhook verification end-to-end.
3. `x-forwarded-for` and `x-tenant-id` cannot be trusted absent a verified upstream boundary; in-process defender uses socket IP.
4. Multi-instance deployments require centralized counters/incident aggregation and durable audit/logging.
5. Run active DAST only with written authorization and controlled targets; not included in this package.
6. Security checks should be mapped to OWASP ASVS 5.0 requirements for formal verification, but category catalog inclusion is **not** proof of ASVS compliance.
