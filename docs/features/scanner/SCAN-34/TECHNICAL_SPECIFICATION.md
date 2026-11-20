# SCAN-34 — IDOR & Broken Access Control Scanner

Release: 0.17.0 · Technical specification

## Implementation status
heuristic-or-passive; static; independent efficacy pending. Not a complete category or verified vendor parity. Static pattern hits are review candidates, not exploit proof. 

## Source of truth
- `packages/security/src/scanner.ts:41`
- `packages/security/src/scanner.ts:67`
- `packages/security/src/scanner.ts`
- `packages/security/src/report-adapters.ts`
- `packages/security/src/evidence-adapters.ts`
- `packages/security/src/triage.ts`

## Public contract / current implementation
`runScan({ enabledScannerIds: ['SCAN-34'], root, ...approvedOptions })`; collect executed, skipped and failed scanner IDs and findings.

Current source rules (2 matching declarations):
```typescript
{scannerId:'SCAN-34',checkId:'UNSCOPED_QUERY',title:'Potential unscoped ORM read',pattern:/\b(?:findMany|findFirst|findUnique)\s*\(\s*\{\s*(?:take|skip|orderBy|select|include)\s*:/i,severity:'low',remediation:'Verify tenantId or mandatory row-level security applies to all protected reads.'},
{scannerId:'SCAN-34',checkId:'DIRECT_PARAM_LOOKUP',title:'Object lookup from route parameter',pattern:/findById\(\s*req\.params\.|findUnique\(\s*\{\s*where\s*:\s*\{\s*id\s*:\s*req\.params/i,severity:'medium',remediation:'Apply resource authorization and tenant scope.'},
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
Seed one vulnerable/misconfigured IDOR/access fixture and one compliant negative control; verify rule/report accuracy, severity, safe bounded execution, explicit unavailable/failed state, source hash and reviewed triage. Run configured engine against authorized fixture; assess misses and false positives.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
