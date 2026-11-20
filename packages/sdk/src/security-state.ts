import type { Store } from './types.js';
import { atomic, hash } from './primitives.js';
import type { RateState } from '@saplings/security';
/** Distributed if backed by a transactional shared database. Prefer a Valkey implementation at high RPS. */
export class StoreRateState implements RateState {
  constructor(
    private store: Store,
    private shards = 128,
  ) {}
  private scope(key: string) {
    return `__sapling_security:${parseInt(hash(key).slice(0, 8), 16) % this.shards}`;
  }
  async increment(key: string, windowMs: number) {
    const tenant = this.scope(key);
    return atomic(this.store, tenant, async (tx) => {
      const at = Date.now();
      const old = await tx.get<{ id: string; count: number; resetAt: number }>(
        tenant,
        'rate-windows',
        key,
      );
      const r = {
        id: key,
        count: old && old.resetAt > at ? old.count + 1 : 1,
        resetAt: old && old.resetAt > at ? old.resetAt : at + windowMs,
      };
      await tx.put(tenant, 'rate-windows', r);
      return { count: r.count, resetAt: r.resetAt };
    });
  }
  async claimAlert(key: string, ttlMs: number) {
    const tenant = this.scope(key);
    return atomic(this.store, tenant, async (tx) => {
      const at = Date.now();
      const old = await tx.get<{ id: string; expires: number }>(tenant, 'alert-cooldowns', key);
      if (old && old.expires > at) return false;
      await tx.put(tenant, 'alert-cooldowns', { id: key, expires: at + ttlMs });
      return true;
    });
  }
}
