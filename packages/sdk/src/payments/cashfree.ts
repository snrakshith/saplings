import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  ActorContext,
  PaymentAdapter,
  PaymentOrderInput,
  PaymentRefundInput,
  PaymentResult,
  Store,
  FeatureAdapter,
  JsonRecord,
} from '../types.js';
import { atomic, fail, hash, integer, object, text } from '../runtime/primitives.js';
import type { Row } from '../runtime/primitives.js';
import { boundedResponseText } from '../http/http.js';

export interface CashfreeOptions {
  clientId: string;
  clientSecret: string;
  environment?: 'sandbox' | 'production';
  apiVersion?: '2025-01-01' | '2026-01-01';
  /** Resolve customer from trusted tenant-scoped records; never use a browser-supplied tenant ID. */
  customer: (
    input: Readonly<PaymentOrderInput>,
  ) =>
    | Promise<{ id: string; phone: string; email?: string; name?: string }>
    | { id: string; phone: string; email?: string; name?: string };
  returnUrl?: string;
  notifyUrl?: string;
  webhookMaxAgeMs?: number;
}
const identifier = (x: unknown) => {
  const s = text(x, 'Cashfree identifier', 100);
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return fail('Invalid Cashfree identifier');
  return s;
};
const minor = (x: unknown) => {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || !/^\d+(\.\d{1,2})?$/.test(String(x)))
    return fail('Invalid provider amount', 'PAYMENT_MISMATCH', 409);
  const v = Math.round(x * 100);
  return integer(v, 'minor amount');
};
const stable = (kind: string, t: string, key: string) => hash(JSON.stringify([kind, t, key]));
const uuid = (h: string) =>
  `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
const orderId = (i: PaymentOrderInput) =>
  'sp_' + stable('order', i.tenantId, i.idempotencyKey ?? i.reference).slice(0, 40);
const refundId = (i: PaymentRefundInput) =>
  'sr_' + stable('refund', i.tenantId, text(i.idempotencyKey)).slice(0, 32);
const httpsUrl = (v: string | undefined) => {
  if (v) {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.username || u.password || u.hash)
      throw Error('Cashfree callback must be a trusted HTTPS URL');
  }
  return v;
};
export class CashfreeAdapter implements PaymentAdapter {
  readonly name = 'cashfree';
  private base: string;
  private version: string;
  constructor(private options: CashfreeOptions) {
    text(options.clientId, 'Cashfree client ID', 500);
    text(options.clientSecret, 'Cashfree secret', 500);
    if (!['sandbox', 'production'].includes(options.environment ?? 'sandbox'))
      throw Error('Invalid Cashfree environment');
    if (typeof options.customer !== 'function') throw Error('Cashfree customer resolver required');
    this.base =
      options.environment === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';
    this.version = options.apiVersion ?? '2025-01-01';
    if (!['2025-01-01', '2026-01-01'].includes(this.version))
      throw Error('Unsupported Cashfree API version');
    httpsUrl(options.returnUrl);
    httpsUrl(options.notifyUrl);
    integer(options.webhookMaxAgeMs ?? 86400000, 'webhook max age', 1000, 7 * 86400000);
  }
  private async request(path: string, body?: JsonRecord, key?: string) {
    const r = await fetch(this.base + path, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: {
        'x-client-id': this.options.clientId,
        'x-client-secret': this.options.clientSecret,
        'x-api-version': this.version,
        'content-type': 'application/json',
        ...(key ? { 'x-idempotency-key': uuid(key) } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const raw = await boundedResponseText(r, 1_000_000);
    if (!r.ok)
      return fail(
        `Cashfree HTTP ${r.status}`,
        r.status === 404 ? 'PROVIDER_NOT_FOUND' : 'PAYMENT_PROVIDER_ERROR',
        502,
      );
    return JSON.parse(raw) as unknown;
  }
  private validateOrder(i: PaymentOrderInput, r: unknown): PaymentResult {
    const x = object(r),
      id = orderId(i);
    if (
      x.order_id !== id ||
      minor(x.order_amount) !== i.amountMinor ||
      x.order_currency !== i.currency
    )
      return fail('Cashfree order mismatch', 'PAYMENT_MISMATCH', 409);
    const status = text(x.order_status, 'order status', 50);
    return {
      id,
      status,
      provider: 'cashfree',
      ...(status === 'ACTIVE'
        ? { checkoutSessionId: text(x.payment_session_id, 'session', 4096) }
        : {}),
    };
  }
  async createOrder(i: PaymentOrderInput): Promise<PaymentResult> {
    integer(i.amountMinor, 'amount', 100, 99999999999);
    if (i.currency !== 'INR') return fail('Cashfree adapter initially supports INR only');
    const customer = await this.options.customer(i);
    const id = identifier(customer.id);
    if (!/^\+?[0-9]{8,15}$/.test(customer.phone)) return fail('Valid customer phone required');
    const meta = {
      ...(this.options.returnUrl ? { return_url: this.options.returnUrl } : {}),
      ...(this.options.notifyUrl ? { notify_url: this.options.notifyUrl } : {}),
    };
    return this.validateOrder(
      i,
      await this.request(
        '/orders',
        {
          order_id: orderId(i),
          order_amount: i.amountMinor / 100,
          order_currency: i.currency,
          customer_details: {
            customer_id: id,
            customer_phone: customer.phone,
            ...(customer.email ? { customer_email: text(customer.email, 'email', 320) } : {}),
            ...(customer.name ? { customer_name: text(customer.name, 'name', 200) } : {}),
          },
          ...(Object.keys(meta).length ? { order_meta: meta } : {}),
        },
        stable('order', i.tenantId, i.idempotencyKey ?? i.reference),
      ),
    );
  }
  async recoverOrder(i: PaymentOrderInput) {
    return this.validateOrder(i, await this.request('/orders/' + orderId(i)));
  }
  private validateRefund(i: PaymentRefundInput, r: unknown): PaymentResult {
    const x = object(Array.isArray(r) && r.length === 1 ? r[0] : r);
    if (
      x.order_id !== i.orderId ||
      x.refund_id !== refundId(i) ||
      String(x.cf_payment_id) !== i.paymentId ||
      minor(x.refund_amount) !== i.amountMinor ||
      x.refund_currency !== 'INR'
    )
      return fail('Cashfree refund mismatch', 'PAYMENT_MISMATCH', 409);
    const raw = text(x.refund_status, 'refund status', 50);
    if (
      !['SUCCESS', 'PENDING', 'PENDING_APPROVAL', 'CANCELLED', 'ONHOLD', 'REJECTED'].includes(raw)
    )
      return fail('Unknown Cashfree refund status', 'PAYMENT_MISMATCH', 409);
    return {
      id: refundId(i),
      status:
        raw === 'SUCCESS'
          ? 'processed'
          : ['CANCELLED', 'REJECTED'].includes(raw)
            ? 'failed'
            : 'pending',
      provider: 'cashfree',
    };
  }
  async refund(i: PaymentRefundInput) {
    integer(i.amountMinor, 'refund amount', 1);
    return this.validateRefund(
      i,
      await this.request(
        `/orders/${identifier(i.orderId)}/refunds`,
        { refund_id: refundId(i), refund_amount: i.amountMinor! / 100, refund_speed: 'STANDARD' },
        stable('refund', i.tenantId, text(i.idempotencyKey)),
      ),
    );
  }
  async recoverRefund(i: PaymentRefundInput) {
    return this.validateRefund(
      i,
      await this.request(`/orders/${identifier(i.orderId)}/refunds/${refundId(i)}`),
    );
  }
  async fetchPayment(order: string, payment: string) {
    return object(
      await this.request(`/orders/${identifier(order)}/payments/${identifier(payment)}`),
    );
  }
  verifyWebhook(raw: string | Uint8Array, timestamp: string, signature: string, at = Date.now()) {
    if (
      !/^\d{13}$/.test(timestamp) ||
      Math.abs(at - Number(timestamp)) > (this.options.webhookMaxAgeMs ?? 86400000) ||
      !/^[A-Za-z0-9+/]{43}=$/.test(signature) ||
      Buffer.from(raw).byteLength > 1_000_000
    )
      return false;
    const actual = Buffer.from(signature, 'base64'),
      expected = createHmac('sha256', this.options.clientSecret)
        .update(timestamp)
        .update(raw)
        .digest();
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  /** Verified provider read + atomic tenant-local capture. Never use a browser callback as payment evidence. */
  async reconcilePayment(store: Store, ctx: ActorContext, orderId: string, paymentId: string) {
    const order = await store.get<Row>(ctx.tenantId, 'payment-orders', orderId);
    if (!order || order.provider !== 'cashfree')
      return fail('Cashfree tenant order not found', 'PAYMENT_MISMATCH', 409);
    const p = await this.fetchPayment(orderId, paymentId);
    if (
      String(p.cf_payment_id) !== paymentId ||
      p.order_id !== orderId ||
      p.payment_status !== 'SUCCESS' ||
      p.is_captured !== true ||
      minor(p.payment_amount) !== order.amountMinor ||
      p.payment_currency !== order.currency
    )
      return fail('Cashfree payment not matched/captured', 'PAYMENT_MISMATCH', 409);
    return atomic(store, ctx.tenantId, async (tx) => {
      const current = await tx.get<Row>(ctx.tenantId, 'payment-orders', orderId);
      if (
        !current ||
        current.provider !== 'cashfree' ||
        current.amountMinor !== order.amountMinor ||
        current.currency !== order.currency ||
        current.invoiceId !== order.invoiceId ||
        (current.paymentId && current.paymentId !== paymentId)
      )
        return fail('Order changed or already captured', 'PAYMENT_MISMATCH', 409);
      const old = await tx.get<Row>(ctx.tenantId, 'verified-payments', paymentId);
      if (old) {
        if (old.provider !== 'cashfree' || old.orderId !== orderId)
          return fail('Payment identity conflict', 'CONFLICT', 409);
        return { processed: false, duplicate: true, paymentId };
      }
      if (current.invoiceId) {
        const invoice = await tx.get<Row>(ctx.tenantId, 'invoices', String(current.invoiceId));
        if (
          !invoice ||
          invoice.status !== 'open' ||
          invoice.totalMinor !== current.amountMinor ||
          invoice.currency !== current.currency
        )
          return fail('Invoice mismatch', 'PAYMENT_MISMATCH', 409);
        await tx.put(ctx.tenantId, 'invoices', {
          ...invoice,
          status: 'paid',
          paymentId,
          paidAt: new Date().toISOString(),
        });
      }
      await tx.put(ctx.tenantId, 'verified-payments', {
        id: paymentId,
        provider: 'cashfree',
        orderId,
        amountMinor: current.amountMinor,
        currency: current.currency,
        status: 'captured',
      });
      await tx.put(ctx.tenantId, 'payment-orders', { ...current, status: 'captured', paymentId });
      return { processed: true, paymentId };
    });
  }
}
/** Only mount on an authenticated provider callback route with a server-resolved tenant. */
export class CashfreeWebhookAdapter implements FeatureAdapter {
  constructor(
    private store: Store,
    private gateway: CashfreeAdapter,
  ) {}
  async execute(r: Parameters<FeatureAdapter['execute']>[0]) {
    if (r.featureId !== 'SAAS-050' || !['verify', 'reconcile'].includes(r.action))
      return fail('Unsupported Cashfree action');
    const raw = text(r.input.rawBody, 'raw body', 1_000_000),
      ts = text(r.input.timestamp, 'timestamp', 13),
      sig = text(r.input.signature, 'signature', 100);
    if (!this.gateway.verifyWebhook(raw, ts, sig))
      return fail('Invalid Cashfree signature', 'UNAUTHENTICATED', 401);
    if (r.action === 'verify') return { valid: true };
    const e = object(JSON.parse(raw));
    if (e.type !== 'PAYMENT_SUCCESS_WEBHOOK')
      return {
        processed: false,
        reason: 'unsupported-event; reconcile refunds using payments.reconcileRefund',
      };
    const d = object(e.data),
      o = object(d.order),
      p = object(d.payment);
    if (typeof p.cf_payment_id !== 'string' && !Number.isSafeInteger(p.cf_payment_id))
      return fail('Unsafe payment identifier');
    return this.gateway.reconcilePayment(
      this.store,
      r.ctx,
      identifier(o.order_id),
      identifier(String(p.cf_payment_id)),
    );
  }
}
