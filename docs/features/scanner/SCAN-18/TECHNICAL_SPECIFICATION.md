# SCAN-18 — File Upload Security Scanner

Release: 0.17.0 · Technical specification

## Implementation status
heuristic-or-passive; static; independent efficacy pending. Not a complete category or verified vendor parity. Static pattern hits are review candidates, not exploit proof. 

## Source of truth
- `packages/security/src/scanner.ts:34`
- `packages/security/src/scanner.ts:58`
- `packages/security/src/scanner.ts`
- `packages/security/src/report-adapters.ts`
- `packages/security/src/evidence-adapters.ts`
- `packages/security/src/triage.ts`

## Public contract / current implementation
`runScan({ enabledScannerIds: ['SCAN-18'], root, ...approvedOptions })`; collect executed, skipped and failed scanner IDs and findings.

Current source rules (2 matching declarations):
```typescript
{scannerId:'SCAN-18',checkId:'UNRESTRICTED_UPLOAD',title:'Upload handler may not enforce content validation',pattern:/(?:multer\s*\(\s*\{\s*dest\s*:|file\.mv\s*\(\s*req\.|writeFile\s*\(\s*req\.files)/i,severity:'medium',remediation:'Enforce file-size limits, extension/content match, malware scanning and isolated storage.'},
{scannerId:'SCAN-18',checkId:'ANY_UPLOAD',title:'Unrestricted upload middleware',pattern:/\.any\(\)|fileFilter\s*:\s*null/i,severity:'medium',remediation:'Restrict file types, content, size and malware risk.'},
```

## Configuration and dependencies
Scan root, approved host allowlist, configured DNS/IOC feed or external report engine as applicable; current mode: static.

## Execution, persistence and consistency
Bound file count/size, elapsed time, output and external host scope; preserve original source-bound findings and expiring review decisions. Do not treat import or skipped coverage as a pass.

## Security boundary
Read-only approved scope, no exploitation of third-party assets, redacted evidence, verified report digest and strict path/host validation.

## Failure and recovery
Validate before side effects; reject invalid or unauthorized input. Return typed or structured errors where supported; surface failures, use bounded retries only for safe operations, and reconcile ambiguous external results before repeating mutations.

## Observability and capacity
Executed/failed/skipped count, rule fixture recall/precision, severity distribution, scan duration and triage age.

## Verification design
Seed one vulnerable/misconfigured File upload fixture and one compliant negative control; verify rule/report accuracy, severity, safe bounded execution, explicit unavailable/failed state, source hash and reviewed triage. Run configured engine against authorized fixture; assess misses and false positives.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
