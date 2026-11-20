import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  createSapling,
  InMemoryStore,
  RecurringBilling,
  TenantOffboarding,
  offboardingSteps,
} from '@saplings/sdk';
const ctx = { tenantId: 'a', actorId: 'owner', permissions: ['*'] },
  other = { ...ctx, tenantId: 'b' },
  approver = { ...ctx, actorId: 'approver' };
async function fixture(store) {
  await store.put('a', 'plans', { id: 'plan', priceMinor: 1000, currency: 'INR' });
  await store.put('a', 'subscriptions', {
    id: 'sub',
    planId: 'plan',
    customerId: 'customer',
    status: 'active',
  });
}
test('recurring schedule creates one invoice under concurrent issue calls; verified paid closes it', async () => {
  const store = new InMemoryStore();
  await fixture(store);
  let charges = 0;
  const billing = new RecurringBilling(store, {
    gateway: {
      charge: async (r) => {
        charges++;
        assert.equal(r.amountMinor, 1000);
        return { status: 'paid', reference: 'payment-1' };
      },
    },
  });
  await billing.schedule(ctx, {
    id: 'sub',
    intervalDays: 30,
    firstDueAt: new Date(Date.now() - 1000).toISOString(),
  });
  const invoices = await Promise.all(Array.from({ length: 8 }, () => billing.issueDue(ctx, 'sub')));
  const issued = invoices.filter((x) => x.id);
  assert.equal(issued.length, 1);
  assert.equal((await store.list('a', 'invoices')).length, 1);
  assert.equal((await billing.chargeDue(ctx, issued[0].id)).status, 'paid');
  assert.equal((await billing.chargeDue(ctx, issued[0].id)).status, 'not_due');
  assert.equal(charges, 1);
  assert.equal((await store.get('a', 'invoices', issued[0].id)).status, 'paid');
  await assert.rejects(billing.issueDue(other, 'sub'), /not found/i);
});
test('ambiguous recurring charge reuses same idempotency key, declined attempts advance retry policy', async () => {
  const store = new InMemoryStore();
  await fixture(store);
  const keys = [];
  const billing = new RecurringBilling(store, {
    retryDays: [1],
    gateway: {
      charge: async (r) => {
        keys.push(r.idempotencyKey);
        if (keys.length === 1) throw Error('timeout');
        return { status: 'declined', reference: 'decline' };
      },
    },
  });
  await billing.schedule(ctx, {
    id: 'sub',
    intervalDays: 30,
    firstDueAt: new Date(Date.now() - 1000).toISOString(),
  });
  const invoice = await billing.issueDue(ctx, 'sub');
  await assert.rejects(billing.chargeDue(ctx, invoice.id), /timeout/);
  let a = await store.get('a', 'billing-attempts', invoice.id);
  await store.put('a', 'billing-attempts', { ...a, nextAttemptAt: 0 });
  assert.equal((await billing.chargeDue(ctx, invoice.id)).status, 'due');
  assert.equal(keys[0], keys[1]);
  a = await store.get('a', 'billing-attempts', invoice.id);
  assert.equal(a.attempt, 1);
  await store.put('a', 'billing-attempts', { ...a, nextAttemptAt: 0 });
  assert.equal((await billing.chargeDue(ctx, invoice.id)).status, 'exhausted');
  assert.notEqual(keys[1], keys[2]);
  assert.equal((await store.get('a', 'subscriptions', 'sub')).status, 'past_due');
});
test('offboarding requires explicit confirmation, distinct approval and all evidence steps; freeze blocks generic capability', async () => {
  const store = new InMemoryStore();
  await store.put('a', 'tenant-profile', { id: 'profile', status: 'active' });
  const seen = [];
  const sdk = createSapling({
    app: { id: 'test', environment: 'test' },
    providers: { store },
    expanded: {
      offboarding: {
        handlers: Object.fromEntries(
          offboardingSteps.map((s) => [
            s,
            async (_c, i) => {
              seen.push(s);
              assert.ok(i.operationId);
              return { evidenceId: s + '-proof' };
            },
          ]),
        ),
      },
    },
  });
  const cap = sdk.capabilities;
  await assert.rejects(
    cap.invoke(ctx, 'SAAS-024', 'request', { reason: 'close' }),
    /confirmation/i,
  );
  await cap.invoke(ctx, 'SAAS-024', 'request', { reason: 'close', confirm: 'a' });
  await assert.rejects(cap.invoke(ctx, 'SAAS-024', 'approve'), /approver/i);
  await assert.rejects(cap.invoke(ctx, 'SAAS-025', 'list'), /offboarding/i);
  await cap.invoke(approver, 'SAAS-024', 'approve');
  for (const _ of offboardingSteps) await cap.invoke(approver, 'SAAS-024', 'advance');
  assert.deepEqual(seen, offboardingSteps);
  assert.equal((await cap.invoke(approver, 'SAAS-024', 'status')).status, 'complete');
  assert.equal((await store.get('a', 'tenant-profile', 'profile')).status, 'offboarded');
});
test('memory transaction uncommitted reads and external concurrent writes are isolated', async () => {
  const s = new InMemoryStore();
  await s.put('a', 'x', { id: '1', v: 0 });
  let proceed, entered;
  const gate = new Promise((r) => (proceed = r)),
    ready = new Promise((r) => (entered = r));
  const tx = s.transaction('a', async (t) => {
    await t.put('a', 'x', { id: '1', v: 1 });
    entered();
    await gate;
    throw Error('rollback');
  });
  await ready;
  assert.equal((await s.get('a', 'x', '1')).v, 0);
  const write = s.put('a', 'x', { id: '2', v: 2 });
  await s.put('b', 'x', { id: '1', v: 3 });
  proceed();
  await assert.rejects(tx, /rollback/);
  await write;
  assert.equal((await s.get('a', 'x', '1')).v, 0);
  assert.equal((await s.get('a', 'x', '2')).v, 2);
  assert.equal((await s.get('b', 'x', '1')).v, 3);
});

test('bounded recurring sweep issues and charges, freezes offboarding tenant', async () => {
  const store = new InMemoryStore();
  await fixture(store);
  const billing = new RecurringBilling(store, {
    gateway: { charge: async () => ({ status: 'paid', reference: 'payment' }) },
  });
  await billing.schedule(ctx, {
    id: 'sub',
    intervalDays: 30,
    firstDueAt: new Date(Date.now() - 1000).toISOString(),
  });
  assert.deepEqual(await billing.sweep(ctx), {
    issued: 1,
    charged: 1,
    errors: 0,
    scheduleAfter: undefined,
    attemptAfter: undefined,
  });
  await store.put('a', 'tenant-profile', { id: 'profile', status: 'offboarding' });
  const schedule = await store.get('a', 'billing-schedules', 'sub');
  await store.put('a', 'billing-schedules', { ...schedule, nextDueAt: Date.now() - 1000 });
  assert.equal((await billing.sweep(ctx)).issued, 0);
  assert.equal((await store.list('a', 'invoices')).length, 1);
});
