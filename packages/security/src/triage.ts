import { createHash } from 'node:crypto';
import type { ScanResult, Finding } from './scanner.js';
export interface FindingDecision {
  fingerprint: string;
  sourceHash: string;
  status: 'false-positive' | 'accepted-risk' | 'fixed';
  reviewer: string;
  reason: string;
  expiresAt: string;
}
export function findingFingerprint(f: Finding) {
  return createHash('sha256')
    .update(JSON.stringify([f.scannerId, f.checkId, f.location, f.title, f.severity]))
    .digest('hex');
}
/** Annotate, never discard raw findings. Decisions are exact-source, expiring and cannot mark a still-present finding fixed. */
export function evaluateFindings(
  report: ScanResult,
  sourceHash: string,
  decisions: readonly FindingDecision[],
  at = Date.now(),
) {
  if (!/^[a-f0-9]{64}$/.test(sourceHash)) throw Error('Invalid source hash');
  const seen = new Set<string>();
  for (const d of decisions) {
    if (seen.has(d.fingerprint)) throw Error('Duplicate decision');
    seen.add(d.fingerprint);
  }
  const rows = report.findings.map((f) => {
    const fingerprint = findingFingerprint(f),
      d = decisions.find((x) => x.fingerprint === fingerprint);
    const approved =
      !!d &&
      d.sourceHash === sourceHash &&
      ['false-positive', 'accepted-risk'].includes(d.status) &&
      !!d.reviewer.trim() &&
      !!d.reason.trim() &&
      Number.isFinite(Date.parse(d.expiresAt)) &&
      Date.parse(d.expiresAt) > at;
    return { finding: f, fingerprint, decision: approved ? d : undefined, open: !approved };
  });
  return {
    rows,
    openHigh: rows.filter((r) => r.open && ['critical', 'high'].includes(r.finding.severity))
      .length,
    incomplete:
      !!report.coverage?.truncated ||
      !!report.coverage?.findingsTruncated ||
      !!report.coverage?.oversizedFiles ||
      !!report.notExecutedScannerIds.length ||
      !!report.failedScannerIds?.length,
  };
}
