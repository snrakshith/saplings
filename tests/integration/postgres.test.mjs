import { test } from 'vitest';
import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzleStore } from '../../packages/adapter-drizzle/dist/index.js';
import { createSapling } from '../../packages/sdk/dist/index.js';
import { randomUUID } from 'node:crypto';
test('live PostgreSQL: non-owner RLS, scoped transactions, immutable audit, atomic quotas', async () => {
  if (!process.env.TEST_DATABASE_URL) throw Error('TEST_DATABASE_URL required; use disposable DB');
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const store = new DrizzleStore(drizzle(pool));
  const a = randomUUID(),
    b = randomUUID();
  try {
    await store.put(a, 'projects', { id: 'p', name: 'private' });
    assert.equal(await store.get(b, 'projects', 'p'), undefined);
    assert.equal(
      (await pool.query('SELECT * FROM sapling_records WHERE tenant_id=$1', [a])).rowCount,
      0,
    );
    await assert.rejects(() => store.transaction(a, (tx) => tx.get(b, 'projects', 'p')));
    await store.put(a, 'audit', { id: 'a' });
    await assert.rejects(() => store.put(a, 'audit', { id: 'a', changed: true }));
    await assert.rejects(() =>
      store.transaction(a, async () => {
        throw Error('rollback');
      }),
    );
    const s = createSapling({
      app: { id: 'integration', environment: 'test' },
      providers: { store },
    });
    const c = { tenantId: a, actorId: 'admin', permissions: ['*'] };
    await s.billing.setQuota(c, 'api', 3);
    const r = await Promise.allSettled(Array.from({ length: 8 }, () => s.billing.meter(c, 'api')));
    assert.equal(r.filter((x) => x.status === 'fulfilled').length, 3);
  } finally {
    await pool.end();
  }
});
test('live PostgreSQL: role health, rollback, cursor and lease fencing', async () => {
  if (!process.env.TEST_DATABASE_URL) throw Error('TEST_DATABASE_URL required');
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const store = new DrizzleStore(drizzle(pool)),
    a = randomUUID();
  const ctx = { tenantId: a, actorId: 'worker', permissions: ['*'] };
  try {
    await store.health();
    await assert.rejects(() =>
      store.transaction(a, async (tx) => {
        await tx.put(a, 'projects', { id: 'rollback' });
        throw Error('rollback');
      }),
    );
    assert.equal(await store.get(a, 'projects', 'rollback'), undefined);
    for (let n = 0; n < 5; n++) await store.put(a, 'projects', { id: `p${n}`, name: `test ${n}` });
    const p = await store.page(a, 'projects', 2);
    assert.equal(p.items.length, 2);
    assert.ok(p.next);
    assert.equal((await store.page(a, 'projects', 2, p.next)).items[0].id, 'p2');
    assert.equal((await store.search(a, 'projects', 'test', ['name'], 3)).length, 3);
    const s = createSapling({
      app: { id: 'integration', environment: 'test' },
      providers: { store },
    });
    const w = s.automation;
    await w.enqueue(ctx, { type: 'report.generate', idempotencyKey: 'once' });
    const claims = await Promise.all([w.claim(ctx, 1000), w.claim(ctx, 1000)]);
    assert.equal(claims.filter(Boolean).length, 1);
    await new Promise((r) => setTimeout(r, 1100));
    const next = await w.claim(ctx);
    assert.ok(next);
    await assert.rejects(() => w.finish(ctx, claims.find(Boolean), true), { code: 'CONFLICT' });
    await w.finish(ctx, next, true);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('sapling.tenant_id',$1,true)", [a]);
      await assert.rejects(() =>
        client.query(
          'INSERT INTO sapling_records(tenant_id,collection,id,body) VALUES($1,$2,$3,$4)',
          [a, 'projects', 'bad', { id: 'different' }],
        ),
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
});

test('live PostgreSQL: retained transaction handles cannot access pooled connections', async () => {
  if (!process.env.TEST_DATABASE_URL) throw Error('TEST_DATABASE_URL required');
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const store = new DrizzleStore(drizzle(pool));
  let retained;
  const tenant = randomUUID();
  try {
    await store.transaction(tenant, async (tx) => {
      retained = tx;
      await tx.put(tenant, 'projects', { id: 'retained' });
    });
    await assert.rejects(retained.get(tenant, 'projects', 'retained'), /closed/);
    await assert.rejects(retained.put(tenant, 'projects', { id: 'bad' }), /closed/);
  } finally {
    await pool.end();
  }
});

import { transactionalHttpOperation, TransactionalEventConsumer } from '@saplings/sdk';
import { MemoryEventJournal, RealtimeHub } from '@saplings/realtime';
test('live PostgreSQL: transactional mutation replay and durable consumer commit', async () => {
  if (!process.env.TEST_DATABASE_URL) throw Error('TEST_DATABASE_URL required');
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL }),
    store = new DrizzleStore(drizzle(pool)),
    tenantId = randomUUID(),
    ctx = { tenantId, actorId: 'worker' },
    principal = { tenantId, userId: 'worker' },
    journal = new MemoryEventJournal(),
    hub = new RealtimeHub({ authenticate: () => principal, authorize: () => true, journal });
  try {
    let calls = 0;
    const request = {
      operation: 'project:create',
      method: 'POST',
      key: 'stable',
      input: { name: 'example' },
    };
    const handler = async (tx) => {
      calls++;
      await tx.put(tenantId, 'projects', { id: 'p', name: 'example' });
      return { status: 201, body: { id: 'p' } };
    };
    const results = await Promise.all(
      Array.from({ length: 5 }, () => transactionalHttpOperation(store, ctx, request, handler)),
    );
    assert.equal(calls, 1);
    assert.equal(results.filter((r) => !r.replayed).length, 1);
    await hub.publish(principal, 'updates', 1);
    const consumer = new TransactionalEventConsumer(store, journal);
    await assert.rejects(
      consumer.process(ctx, 'updates', 'worker', async (tx, e) => {
        await tx.put(tenantId, 'effects', { id: e.id });
        throw Error('rollback');
      }),
    );
    assert.equal((await store.list(tenantId, 'effects')).length, 0);
    const r = await consumer.process(ctx, 'updates', 'worker', async (tx, e) =>
      tx.put(tenantId, 'effects', { id: e.id }),
    );
    assert.equal(r.processed, 1);
    assert.equal((await consumer.process(ctx, 'updates', 'worker', async () => {})).processed, 0);
  } finally {
    await hub.close();
    await pool.end();
  }
});

test('live PostgreSQL: indexed public text search remains tenant scoped and excludes deleted records', async () => {
  if (!process.env.TEST_DATABASE_URL) throw Error('TEST_DATABASE_URL required');
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL }),
    s = new DrizzleStore(drizzle(pool)),
    a = randomUUID(),
    b = randomUUID();
  try {
    await s.put(a, 'projects', { id: '1', name: 'blue ocean' });
    await s.put(a, 'projects', {
      id: '2',
      name: 'blue ocean',
      deletedAt: new Date().toISOString(),
    });
    await s.put(b, 'projects', { id: '3', name: 'blue ocean' });
    assert.deepEqual(
      (await s.fullTextSearch(a, 'projects', 'blue ocean')).map((r) => r.id),
      ['1'],
    );
    assert.equal((await s.fullTextSearch(a, 'projects', 'unmatched')).length, 0);
  } finally {
    await pool.end();
  }
});
