import type { QualitySuiteConfig } from './config.js';
export interface Metrics {
  requests: number;
  errors: number;
  p95Ms: number;
  p99Ms: number;
  requestsPerSecond: number;
  durationMs: number;
}
export interface SuiteResult {
  id: string;
  category: string;
  engine: string;
  status: 'passed' | 'failed' | 'blocked';
  durationMs: number;
  metrics?: Metrics;
  reason?: string;
}
export interface QualityReport {
  version: '0.6.0';
  environment: string;
  at: string;
  results: SuiteResult[];
  passed: boolean;
}
export function percentile(xs: number[], p: number) {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}
export function summarize(xs: number[], errors: number, durationMs: number): Metrics {
  return {
    requests: xs.length,
    errors,
    p95Ms: percentile(xs, 0.95),
    p99Ms: percentile(xs, 0.99),
    requestsPerSecond: xs.length / Math.max(durationMs / 1000, 0.001),
    durationMs,
  };
}
export function thresholdFailures(m: Metrics, t: QualitySuiteConfig['thresholds'] = {}): string[] {
  const f: string[] = [];
  if (!m.requests) f.push('No requests');
  if (m.errors / m.requests > (t.maxErrorRate ?? 0)) f.push('Error rate exceeded');
  if (t.maxP95Ms !== undefined && m.p95Ms > t.maxP95Ms) f.push('p95 exceeded');
  if (t.maxP99Ms !== undefined && m.p99Ms > t.maxP99Ms) f.push('p99 exceeded');
  if (t.minRequestsPerSecond !== undefined && m.requestsPerSecond < t.minRequestsPerSecond)
    f.push('Throughput below minimum');
  return f;
}
