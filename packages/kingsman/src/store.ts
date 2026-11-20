import type { IdentityStore, RealmRow } from './types.js';
import { IdentityError } from './config.js';
/** Per-process reference implementation. Use persistent transactional storage for production. */
export class MemoryIdentityStore implements IdentityStore {
  private data = new Map<string, RealmRow>();
  private locks = new Map<string, Promise<void>>();
  private key(t: string, c: string, i: string) {
    if (!t || !c || !i) throw new IdentityError('INVALID_SCOPE', 'Missing realm/storage key');
    return JSON.stringify([t, c, i]);
  }
  async get<T>(t: string, c: string, i: string): Promise<T | undefined> {
    const x = this.data.get(this.key(t, c, i));
    return x === undefined ? undefined : (structuredClone(x) as T);
  }
  async list<T>(t: string, c: string): Promise<T[]> {
    const prefix = JSON.stringify([t, c]).slice(0, -1) + ',';
    return [...this.data]
      .filter(([k]) => k.startsWith(prefix))
      .map(([, v]) => structuredClone(v) as T);
  }
  async put<T extends { id: string }>(t: string, c: string, row: T): Promise<void> {
    await this.transaction(t, async (tx) => tx.put(t, c, row));
  }
  async delete(t: string, c: string, id: string): Promise<boolean> {
    return this.transaction(t, async (tx) => tx.delete(t, c, id));
  }
  async transaction<T>(tenant: string, callback: (tx: IdentityStore) => Promise<T>): Promise<T> {
    const before = this.locks.get(tenant) ?? Promise.resolve();
    let release!: () => void;
    const pending = new Promise<void>((r) => (release = r)),
      next = before.then(() => pending);
    this.locks.set(tenant, next);
    await before;
    const prefix = JSON.stringify([tenant]).slice(0, -1) + ',';
    const staged = new Map([...this.data].filter(([k]) => k.startsWith(prefix)));
    let active = true;
    const guard = (t: string) => {
      if (!active || t !== tenant)
        throw new IdentityError('TRANSACTION_SCOPE', 'Expired/cross-realm transaction', 403);
    };
    const tx: IdentityStore = {
      get: async (t, c, i) => {
        guard(t);
        const v = staged.get(this.key(t, c, i));
        return v === undefined ? undefined : (structuredClone(v) as never);
      },
      put: async (t, c, r) => {
        guard(t);
        staged.set(this.key(t, c, r.id), structuredClone(r));
      },
      delete: async (t, c, i) => {
        guard(t);
        return staged.delete(this.key(t, c, i));
      },
      list: async (t, c) => {
        guard(t);
        return [...staged]
          .filter(([k]) => k.startsWith(JSON.stringify([t, c]).slice(0, -1) + ','))
          .map(([, v]) => structuredClone(v)) as never;
      },
      transaction: async (t, fn) => {
        guard(t);
        return fn(tx);
      },
    };
    try {
      const result = await callback(tx);
      for (const key of this.data.keys()) if (key.startsWith(prefix)) this.data.delete(key);
      for (const [key, value] of staged) this.data.set(key, value);
      return result;
    } finally {
      active = false;
      release();
      if (this.locks.get(tenant) === next) this.locks.delete(tenant);
    }
  }
}
