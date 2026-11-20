import type { RecurringGateway } from './recurring.js';
import { timingSafeEqual } from 'node:crypto';
import type { Store } from './types.js';
import { atomic, fail, hash, integer, object, text, sign } from './primitives.js';
import { boundedResponseText } from './http.js';
import { Bulkhead, timeout } from './reliability.js';
export interface StripeCustomerMandate {
  customer: string;
  paymentMethod: string;
  offSessionApproved: boolean;
}
type Charge = Parameters<RecurringGateway['charge']>[0];
type Attempt = {
  id: string;
  fingerprint: string;
  intent?: string;
  createdAt: string;
  invoiceId?: string;
  customer?: string;
  amountMinor?: number;
  currency?: string;
  chargeKey?: string;
};
/** Fixed Stripe account and trusted mandate resolver. No card data is accepted. Never blindly recreate an ambiguous PaymentIntent. */
export class StripeRecurringGateway implements RecurringGateway {
  private bulkhead = new Bulkhead(16);
  constructor(
    private store: Store,
    private token: () => Promise<string>,
    private mandate: (tenantId: string, customerId: string) => Promise<StripeCustomerMandate>,
  ) {}
  private async request(
    path: string,
    signal: AbortSignal | undefined,
    params?: Record<string, string>,
    key?: string,
  ) {
    return this.bulkhead.run(() =>
      timeout(async (deadline) => {
        const token = await this.token();
        const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
        if (combined.aborted) throw Error('Aborted');
        const response = await fetch('https://api.stripe.com/v1' + path, {
          method: params ? 'POST' : 'GET',
          redirect: 'error',
          signal: combined,
          headers: {
            authorization: `Bearer ${token}`,
            ...(params ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
            ...(key ? { 'idempotency-key': key } : {}),
          },
          body: params ? new URLSearchParams(params) : undefined,
        });
        const parsed = object(JSON.parse(await boundedResponseText(response, 1_000_000)));
        if (response.ok) return parsed;
        if (response.status === 402) {
          const err = object(parsed.error ?? {});
          if (err.payment_intent) return object(err.payment_intent);
        }
        throw Error(`Stripe HTTP ${response.status}`);
      }, 12000),
    );
  }
  private fingerprint(req: Charge) {
    return hash(
      JSON.stringify([
        req.tenantId,
        req.customerId,
        req.invoiceId,
        req.amountMinor,
        req.currency.toLowerCase(),
      ]),
    );
  }
  private async mapping(req: Charge) {
    if (req.signal?.aborted) throw Error('Aborted');
    text(req.tenantId, 'tenant', 200);
    text(req.customerId, 'customer', 200);
    text(req.invoiceId, 'invoice', 200);
    text(req.idempotencyKey, 'idempotency key', 200);
    integer(req.amountMinor, 'amount', 1);
    if (!/^[A-Za-z]{3}$/.test(req.currency)) throw Error('Invalid currency');
    const mandate = await timeout(() => this.mandate(req.tenantId, req.customerId), 5000);
    if (
      !mandate.offSessionApproved ||
      !/^cus_[A-Za-z0-9]+$/.test(mandate.customer) ||
      !/^pm_[A-Za-z0-9]+$/.test(mandate.paymentMethod)
    )
      return fail('Verified off-session mandate required', 'FORBIDDEN', 403);
    return mandate;
  }
  private verify(
    intent: Record<string, unknown>,
    req: Charge,
    mandate: StripeCustomerMandate,
    id: string,
  ) {
    const reference = text(intent.id, 'intent', 200);
    if (
      !/^pi_[A-Za-z0-9]+$/.test(reference) ||
      intent.customer !== mandate.customer ||
      intent.amount !== req.amountMinor ||
      intent.currency !== req.currency.toLowerCase() ||
      object(intent.metadata ?? {}).sapling_attempt !== id
    )
      return fail('Stripe intent does not match invoice', 'PROVIDER_FAILED', 502);
    return reference;
  }
  private async persist(req: Charge, id: string, reference: string) {
    return atomic(this.store, req.tenantId, async (tx) => {
      const row = await tx.get<Attempt>(req.tenantId, 'stripe-recurring-attempts', id);
      if (
        !row ||
        row.fingerprint !== this.fingerprint(req) ||
        (row.intent && row.intent !== reference)
      )
        return fail('Payment reconciliation conflict', 'CONFLICT', 409);
      await tx.put(req.tenantId, 'stripe-recurring-attempts', { ...row, intent: reference });
    });
  }
  async charge(req: Charge) {
    const mandate = await this.mapping(req);
    const id = hash(JSON.stringify([req.tenantId, req.idempotencyKey])),
      fingerprint = this.fingerprint(req);
    const claim = await atomic(this.store, req.tenantId, async (tx) => {
      const row = await tx.get<Attempt>(req.tenantId, 'stripe-recurring-attempts', id);
      if (row) {
        if (row.fingerprint !== fingerprint)
          return fail('Payment idempotency conflict', 'CONFLICT', 409);
        return { row, created: false };
      }
      const next = {
        id,
        fingerprint,
        createdAt: new Date().toISOString(),
        invoiceId: req.invoiceId,
        customer: mandate.customer,
        amountMinor: req.amountMinor,
        currency: req.currency.toLowerCase(),
        chargeKey: req.idempotencyKey,
      };
      await tx.put(req.tenantId, 'stripe-recurring-attempts', next);
      return { row: next as Attempt, created: true };
    });
    if (!claim.created && !claim.row.intent)
      return { status: 'pending' as const, reference: `pending:${id}` };
    const intent = claim.row.intent
      ? await this.request('/payment_intents/' + encodeURIComponent(claim.row.intent), req.signal)
      : await this.request(
          '/payment_intents',
          req.signal,
          {
            amount: String(req.amountMinor),
            currency: req.currency.toLowerCase(),
            customer: mandate.customer,
            payment_method: mandate.paymentMethod,
            confirm: 'true',
            off_session: 'true',
            'payment_method_types[0]': 'card',
            'metadata[sapling_attempt]': id,
          },
          id,
        );
    const reference = this.verify(intent, req, mandate, id);
    if (claim.row.intent && claim.row.intent !== reference)
      throw Error('Unexpected intent reference');
    await this.persist(req, id, reference);
    if (intent.status === 'succeeded' && intent.amount_received === req.amountMinor)
      return { status: 'paid' as const, reference };
    if (intent.status === 'canceled') return { status: 'declined' as const, reference };
    if (intent.status === 'requires_action' || intent.status === 'requires_payment_method')
      return { status: 'requires_action' as const, reference };
    return { status: 'pending' as const, reference };
  }
  /** Trusted reconciliation only, after provider-side discovery; verify amount/customer/metadata before binding. */
  async recover(req: Charge, providerIntentId: string) {
    if (!/^pi_[A-Za-z0-9]+$/.test(providerIntentId)) throw Error('Invalid intent ID');
    const mandate = await this.mapping(req),
      id = hash(JSON.stringify([req.tenantId, req.idempotencyKey]));
    const intent = await this.request(
      '/payment_intents/' + encodeURIComponent(providerIntentId),
      req.signal,
    );
    const reference = this.verify(intent, req, mandate, id);
    if (reference !== providerIntentId) throw Error('Unexpected intent reference');
    await this.persist(req, id, reference);
    return { reference };
  }
}
/** Trusted raw-body webhook endpoint. Tenant must be resolved from verified account routing, never payload. Wakes polling; never marks an invoice paid from a webhook alone. */
export class StripeRecurringWebhook {
  constructor(
    private store: Store,
    private secret: string,
    private toleranceSeconds = 300,
  ) {
    if (secret.length < 16) throw Error('Webhook secret too short');
    integer(toleranceSeconds, 'tolerance', 1, 600);
  }
  async receive(tenant: string, raw: string, header: string, at = Date.now()) {
    text(tenant, 'tenant', 200);
    text(raw, 'raw', 1_000_000);
    if (Buffer.byteLength(raw) > 1_000_000) throw Error('Webhook too large');
    text(header, 'signature', 2048);
    const parts = header.split(',').map((s) => s.trim());
    const timestamps = parts.filter((s) => s.startsWith('t='));
    const signatures = parts.filter((s) => /^v1=[a-f0-9]{64}$/i.test(s)).map((s) => s.slice(3));
    if (timestamps.length !== 1 || !/^t=\d{1,12}$/.test(timestamps[0]) || !signatures.length)
      return fail('Invalid webhook signature', 'UNAUTHENTICATED', 401);
    const stamp = Number(timestamps[0].slice(2));
    const expected = Buffer.from(sign(`${stamp}.${raw}`, this.secret), 'hex');
    if (
      Math.abs(at / 1000 - stamp) > this.toleranceSeconds ||
      !signatures.some((s) => timingSafeEqual(Buffer.from(s, 'hex'), expected))
    )
      return fail('Invalid webhook signature', 'UNAUTHENTICATED', 401);
    const event = object(JSON.parse(raw)),
      eventId = text(event.id, 'event ID', 200);
    if (!/^evt_[A-Za-z0-9]+$/.test(eventId)) return fail('Invalid event ID');
    if (
      ![
        'payment_intent.succeeded',
        'payment_intent.canceled',
        'payment_intent.payment_failed',
        'payment_intent.requires_action',
        'payment_intent.processing',
      ].includes(String(event.type))
    )
      return { processed: false, reason: 'unsupported' };
    const intent = object(object(event.data).object),
      attemptId = text(object(intent.metadata).sapling_attempt, 'attempt ID', 64);
    if (!/^[a-f0-9]{64}$/.test(attemptId)) return fail('Invalid attempt ID');
    return atomic(this.store, tenant, async (tx) => {
      const prior = await tx.get(tenant, 'stripe-webhook-inbox', eventId);
      if (prior) return { processed: false, duplicate: true };
      const map = await tx.get<Attempt>(tenant, 'stripe-recurring-attempts', attemptId);
      if (
        !map ||
        !map.invoiceId ||
        !map.chargeKey ||
        !map.intent ||
        map.intent !== intent.id ||
        map.customer !== intent.customer ||
        map.amountMinor !== intent.amount ||
        map.currency !== intent.currency
      )
        return fail('Unmatched recurring intent', 'PAYMENT_MISMATCH', 409);
      const a = await tx.get<Record<string, unknown> & { id: string }>(
        tenant,
        'billing-attempts',
        map.invoiceId,
      );
      if (!a || a.idempotencyKey !== map.chargeKey)
        return fail('Unmatched billing attempt', 'PAYMENT_MISMATCH', 409);
      let woken = false;
      if (['requires_action', 'pending'].includes(String(a.status))) {
        await tx.put(
          tenant,
          'billing-attempts',
          a.lease ? { ...a, wakeRequested: true } : { ...a, status: 'pending', nextAttemptAt: at },
        );
        woken = true;
      }
      await tx.put(tenant, 'stripe-webhook-inbox', {
        id: eventId,
        attemptId,
        receivedAt: new Date(at).toISOString(),
      });
      return { processed: true, woken };
    });
  }
}
