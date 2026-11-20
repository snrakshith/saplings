# SCAN-32 — Source Code SAST Scanner

Release: 0.17.0 · Technical specification

## Implementation status
heuristic-or-passive; static; independent efficacy pending. Not a complete category or verified vendor parity. Static pattern hits are review candidates, not exploit proof. 

## Source of truth
- `packages/security/src/scanner.ts:38`
- `packages/security/src/scanner.ts:39`
- `packages/security/src/scanner.ts:65`
- `packages/security/src/scanner.ts`
- `packages/security/src/report-adapters.ts`
- `packages/security/src/evidence-adapters.ts`
- `packages/security/src/triage.ts`

## Public contract / current implementation
`runScan({ enabledScannerIds: ['SCAN-32'], root, ...approvedOptions })`; collect executed, skipped and failed scanner IDs and findings.

Current source rules (3 matching declarations):
```typescript
{scannerId:'SCAN-32',checkId:'SHELL_EXEC',title:'Shell execution entry point',pattern:/(?:child_process|node:child_process)[\s\S]{0,120}(?:exec\s*\(|execSync\s*\()/i,severity:'high',remediation:'Avoid shell expansion and never interpolate untrusted values into shell commands.'},
{scannerId:'SCAN-32',checkId:'DISABLE_TLS',title:'Potential disabled TLS verification',pattern:/NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["'`]?0/,severity:'critical',remediation:'Never disable certificate verification; install trusted roots.'},
{scannerId:'SCAN-32',checkId:'UNSAFE_DESERIALIZE',title:'Potential unsafe deserialization',pattern:/yaml\.unsafeLoad|deserialize\(\s*req\./i,severity:'high',remediation:'Use safe parsing and schema validation.'},
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
Seed one vulnerable/misconfigured SAST fixture and one compliant negative control; verify rule/report accuracy, severity, safe bounded execution, explicit unavailable/failed state, source hash and reviewed triage. Run configured engine against authorized fixture; assess misses and false positives.

## Deployment and compatibility
Use pnpm workspace builds and the matching 0.17.0 package versions. Retain the public contract, add type checks, execute relevant integration tests and collect release-source-bound evidence before promotion.

[Product specification](PRODUCT_SPECIFICATION.md) · [Gaps & improvements](GAPS_AND_IMPROVEMENTS.md)
