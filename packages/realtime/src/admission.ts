import { randomUUID } from 'node:crypto';
import type { Principal } from './index.js';
import type { RedisJournalClient } from './journal.js';
export interface ConnectionAdmission {
  acquire(principal: Principal, ttlMs: number): Promise<(() => Promise<void>) | undefined>;
}
function valid(n: number, max: number) {
  if (!Number.isSafeInteger(n) || n < 1 || n > max) throw Error('Invalid admission limit');
}
/** Shared reference quota; use Redis for independent replicas. Each reservation expires after the session TTL. */
export class MemoryConnectionAdmission implements ConnectionAdmission {
  private readonly tenants = new Map<string, Map<string, number>>();
  constructor(
    private readonly limit: number,
    private readonly maxTenants = 10000,
  ) {
    valid(limit, 100000);
    valid(maxTenants, 100000);
  }
  async acquire(p: Principal, ttl: number) {
    valid(ttl, 86400000);
    const now = Date.now();
    for (const [key, leases] of this.tenants) {
      for (const [id, expiry] of leases) if (expiry <= now) leases.delete(id);
      if (!leases.size) this.tenants.delete(key);
    }
    let leases = this.tenants.get(p.tenantId);
    if (!leases) {
      if (this.tenants.size >= this.maxTenants) return;
      leases = new Map();
      this.tenants.set(p.tenantId, leases);
    }
    if (leases.size >= this.limit) return;
    const id = randomUUID();
    leases.set(id, now + ttl);
    return async () => {
      const current = this.tenants.get(p.tenantId);
      current?.delete(id);
      if (current && !current.size) this.tenants.delete(p.tenantId);
    };
  }
}
const acquireScript = `local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000); redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',now); if redis.call('ZCARD',KEYS[1])>=tonumber(ARGV[1]) then return 0 end; redis.call('ZADD',KEYS[1],now+tonumber(ARGV[2]),ARGV[3]); local last=redis.call('ZREVRANGE',KEYS[1],0,0,'WITHSCORES'); redis.call('PEXPIREAT',KEYS[1],math.ceil(tonumber(last[2]))); return 1`;
const releaseScript = `redis.call('ZREM',KEYS[1],ARGV[1]); if redis.call('ZCARD',KEYS[1])==0 then redis.call('DEL',KEYS[1]) end; return 1`;
/** Single-key atomic tenant-wide cap across replicas. Lease TTL bounds orphaned slots after crashes. */
export class RedisConnectionAdmission implements ConnectionAdmission {
  constructor(
    private readonly client: RedisJournalClient,
    private readonly limit: number,
    private readonly prefix = 'sapling:connections:',
  ) {
    valid(limit, 100000);
    if (!/^[\w:-]{1,128}$/.test(prefix)) throw Error('Invalid admission prefix');
  }
  async acquire(p: Principal, ttl: number) {
    valid(ttl, 86400000);
    if (!/^[\w.:-]{1,128}$/.test(p.tenantId)) throw Error('Invalid tenant');
    const key = this.prefix + encodeURIComponent(p.tenantId),
      id = randomUUID();
    const result = await this.client.eval(acquireScript, {
      keys: [key],
      arguments: [String(this.limit), String(ttl), id],
    });
    if (result === 0) return;
    if (result !== 1) throw Error('Invalid admission response');
    return async () => {
      await this.client.eval(releaseScript, { keys: [key], arguments: [id] });
    };
  }
}
/** One shared global key gives atomic system, tenant and user limits. Single shard by design; capacity must be benchmarked. */
const multiAcquire = `local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000); local expiry=now+tonumber(ARGV[4]); for i=1,3 do redis.call('ZREMRANGEBYSCORE',KEYS[i],'-inf',now); if redis.call('ZCARD',KEYS[i])>=tonumber(ARGV[i]) then return 0 end end; for i=1,3 do redis.call('ZADD',KEYS[i],expiry,ARGV[5]); local last=redis.call('ZREVRANGE',KEYS[i],0,0,'WITHSCORES'); redis.call('PEXPIREAT',KEYS[i],math.ceil(tonumber(last[2]))) end; return 1`;
const multiRelease = `for i=1,3 do redis.call('ZREM',KEYS[i],ARGV[1]); if redis.call('ZCARD',KEYS[i])==0 then redis.call('DEL',KEYS[i]) end end; return 1`;
export class RedisHierarchicalAdmission implements ConnectionAdmission {
  constructor(
    private client: RedisJournalClient,
    private caps: { global: number; tenant: number; user: number },
    private prefix = 'sapling:connections',
  ) {
    for (const n of Object.values(caps)) valid(n, 1000000);
    if (!/^[\w:-]{1,100}$/.test(prefix)) throw Error('Invalid prefix');
  }
  async acquire(p: Principal, ttl: number) {
    valid(ttl, 86400000);
    if (!/^[\w.:-]{1,128}$/.test(p.tenantId) || !/^[\w.:-]{1,128}$/.test(p.userId))
      throw Error('Invalid principal');
    const root = this.prefix + ':{admission}:',
      tenant = encodeURIComponent(p.tenantId),
      user = encodeURIComponent(p.userId),
      keys = [root + 'global', root + 'tenant:' + tenant, root + 'user:' + tenant + '/' + user],
      id = randomUUID();
    const result = await this.client.eval(multiAcquire, {
      keys,
      arguments: [
        String(this.caps.global),
        String(this.caps.tenant),
        String(this.caps.user),
        String(ttl),
        id,
      ],
    });
    if (result === 0) return;
    if (result !== 1) throw Error('Invalid admission response');
    return async () => {
      await this.client.eval(multiRelease, { keys, arguments: [id] });
    };
  }
}
/** Volatile counterpart with deterministic global/user/tenant capacity and expiration. */
export class MemoryHierarchicalAdmission implements ConnectionAdmission {
  private leases = new Map<string, { tenant: string; user: string; expiry: number }>();
  constructor(private caps: { global: number; tenant: number; user: number }) {
    for (const n of Object.values(caps)) valid(n, 1000000);
  }
  async acquire(p: Principal, ttl: number) {
    valid(ttl, 86400000);
    const now = Date.now();
    let tenant = 0,
      user = 0;
    for (const [id, l] of this.leases) {
      if (l.expiry <= now) {
        this.leases.delete(id);
        continue;
      }
      if (l.tenant === p.tenantId) {
        tenant++;
        if (l.user === p.userId) user++;
      }
    }
    if (
      this.leases.size >= this.caps.global ||
      tenant >= this.caps.tenant ||
      user >= this.caps.user
    )
      return;
    const id = randomUUID();
    this.leases.set(id, { tenant: p.tenantId, user: p.userId, expiry: now + ttl });
    return async () => {
      this.leases.delete(id);
    };
  }
}
