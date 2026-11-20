import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import type { Finding, ScannerAdapter } from './scanner.js';
export interface ThreatIndicator {
  type: 'domain' | 'sha256' | 'ip';
  value: string;
}
export interface ThreatIntelligenceOptions {
  path: string;
  sha256: string;
  indicators: ThreatIndicator[];
  maxAgeMs?: number;
  maxBytes?: number;
}
const canonical = (i: ThreatIndicator) => {
  if (!i || typeof i.value !== 'string' || i.value.length > 253) throw Error('Invalid indicator');
  const value = i.value.toLowerCase().replace(/\.$/, '');
  if (
    (i.type === 'sha256' && !/^[a-f0-9]{64}$/.test(value)) ||
    (i.type === 'domain' && !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(value)) ||
    (i.type === 'ip' &&
      !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value) &&
      !/^[a-f0-9:]+:[a-f0-9:]+$/.test(value)) ||
    !['sha256', 'domain', 'ip'].includes(i.type)
  )
    throw Error('Invalid indicator');
  return `${i.type}:${value}`;
};
/** Exact-match offline feed; authorized assets only. Pin feed hash in reviewed configuration. No external probing. */
export class ThreatIntelligenceAdapter implements ScannerAdapter {
  constructor(private config: ThreatIntelligenceOptions) {}
  async scan(_options?: import('./scanner.js').ScanOptions): Promise<Finding[]> {
    const { path, sha256, indicators } = this.config;
    const max = this.config.maxBytes ?? 2_000_000,
      age = this.config.maxAgeMs ?? 86400000;
    if (
      !/^[a-f0-9]{64}$/.test(sha256) ||
      !Number.isSafeInteger(max) ||
      max < 1 ||
      max > 16_000_000 ||
      !Number.isSafeInteger(age) ||
      age < 1 ||
      age > 30 * 86400000 ||
      !Array.isArray(indicators) ||
      !indicators.length ||
      indicators.length > 10000
    )
      throw Error('Invalid threat intelligence configuration');
    const handle = await fs.open(path, 'r');
    let data: Buffer;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > max) throw Error('Invalid threat intelligence feed size');
      data = Buffer.alloc(stat.size + 1);
      const result = await handle.read(data, 0, data.length, 0);
      if (result.bytesRead !== stat.size) throw Error('Feed changed during read');
      data = data.subarray(0, result.bytesRead);
    } finally {
      await handle.close();
    }
    if (createHash('sha256').update(data).digest('hex') !== sha256)
      throw Error('Threat intelligence feed hash mismatch');
    const feed = JSON.parse(data.toString('utf8'));
    const generated = Date.parse(feed.generatedAt);
    if (
      !Number.isFinite(generated) ||
      generated > Date.now() ||
      Date.now() - generated > age ||
      !Array.isArray(feed.indicators) ||
      !feed.indicators.length ||
      feed.indicators.length > 100000
    )
      throw Error('Incomplete or stale threat intelligence feed');
    const set = new Set<string>();
    for (const i of feed.indicators) set.add(canonical(i));
    const matches = [...new Set(indicators.map(canonical))].filter((i) => set.has(i));
    if (matches.length > 2000) throw Error('Threat intelligence findings exceed limit');
    return matches.map((i, n) => ({
      id: `SCAN-15:IOC:${n + 1}`,
      scannerId: 'SCAN-15',
      checkId: 'IOC_EXACT_MATCH',
      severity: 'high',
      title: 'Configured asset matches threat indicator',
      location: `indicator:${createHash('sha256').update(i).digest('hex').slice(0, 16)}`,
      evidence: 'Indicator withheld; review pinned feed and asset inventory.',
      confidence: 'medium',
      remediation: 'Validate attribution and isolate or remediate confirmed affected assets.',
    }));
  }
}
