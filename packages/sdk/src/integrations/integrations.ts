import { boundedResponseText } from '../http/http.js';
import { atomic, fail, hash, integer, text } from '../runtime/primitives.js';
import type { Row } from '../runtime/primitives.js';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import type {
  ActorContext,
  NotificationAdapter,
  PaymentAdapter,
  PaymentResult,
  PaymentOrderInput,
  PaymentRefundInput,
  JsonRecord,
  TelemetryAdapter,
  Store,
} from '../types.js';
import { SaplingError } from '../types.js';
import { AccessService } from '../identity/access.js';
import { AuditService } from '../audit/audit.js';
export interface SaplingEvent {
  id: string;
  type: string;
  tenantId: string;
  at: string;
  data: JsonRecord;
  correlationId?: string;
}
export class EventService {
  private listeners = new Map<string, Set<(event: SaplingEvent) => void | Promise<void>>>();
  on(type: string, handler: (event: SaplingEvent) => void | Promise<void>) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(handler);
    this.listeners.set(type, set);
    return () => set.delete(handler);
  }
  async emit(ctx: ActorContext, type: string, data: JsonRecord) {
    const event: SaplingEvent = {
      id: randomUUID(),
      type,
      tenantId: ctx.tenantId,
      at: new Date().toISOString(),
      data,
      correlationId: ctx.correlationId,
    };
    for (const fn of [...(this.listeners.get(type) ?? []), ...(this.listeners.get('*') ?? [])])
      await fn(event);
    return event;
  }
}
export class NotificationService {
  constructor(
    private provider: NotificationAdapter | undefined,
    private audit: AuditService,
  ) {}
  async send(
    ctx: ActorContext,
    input: {
      channel: 'email' | 'sms' | 'push' | 'inapp';
      to: string;
      subject?: string;
      body: string;
      template?: string;
      metadata?: JsonRecord;
    },
  ) {
    if (!this.provider) throw new SaplingError('NOT_CONFIGURED', 'Notification provider required');
    const result = await this.provider.send({ tenantId: ctx.tenantId, ...input });
    await this.audit.record(ctx, 'notification.sent', 'notifications', result.id, {
      channel: input.channel,
    });
    return result;
  }
}
export class PaymentService {
  constructor(
    private provider: PaymentAdapter | undefined,
    private audit: AuditService,
    private store?: Store,
    private access?: AccessService,
    private providerName = provider?.name ?? 'custom',
  ) {}
  private async ready(ctx: ActorContext, permission: string) {
    if (
      !ctx.tenantId ||
      !ctx.actorId ||
      ctx.impersonatorId ||
      ctx.tenantId.startsWith('__sapling_')
    )
      throw new SaplingError('FORBIDDEN', 'Verified non-impersonated tenant context required', 403);
    await this.access?.requireService(ctx, permission);
    if (this.store) {
      const profile = await this.store.get<Row>(ctx.tenantId, 'tenant-profile', 'profile');
      if (profile && ['offboarding', 'offboarded'].includes(String(profile.status)))
        return fail('Tenant frozen', 'TENANT_FROZEN', 403);
    }
    if (!this.provider || !this.store)
      throw new SaplingError(
        'NOT_CONFIGURED',
        `${this.providerName} payment adapter and store required`,
        503,
      );
    return { provider: this.provider, store: this.store };
  }
  private async order(
    ctx: ActorContext,
    input: Omit<PaymentOrderInput, 'tenantId'> & { invoiceId?: string },
    recover: boolean,
  ): Promise<PaymentResult> {
    const { provider, store } = await this.ready(ctx, 'payments:write');
    integer(input.amountMinor, 'amount', 1);
    if (!/^[A-Z]{3}$/.test(input.currency)) return fail('ISO currency required');
    const idempotencyKey = text(input.idempotencyKey ?? input.reference, 'idempotencyKey', 200),
      key = hash(`order:${idempotencyKey}`);
    text(input.reference, 'reference', 200);
    const request: PaymentOrderInput = {
      tenantId: ctx.tenantId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      reference: input.reference,
      idempotencyKey,
    };
    const reservation = await atomic(store, ctx.tenantId, async (tx) => {
      const old = await tx.get<Row>(ctx.tenantId, 'payment-requests', key);
      if (old) {
        if (
          (old.provider !== this.providerName &&
            !(old.provider === undefined && this.providerName === 'razorpay')) ||
          old.amountMinor !== input.amountMinor ||
          old.currency !== input.currency ||
          old.reference !== input.reference ||
          old.invoiceId !== input.invoiceId
        )
          return fail('Payment request key conflict', 'CONFLICT', 409);
        if (old.result) return { existing: old.result as PaymentResult };
        if (!recover)
          return fail('Payment request outcome pending reconciliation', 'PAYMENT_PENDING', 409);
        return {};
      }
      if (recover) return fail('Payment request not found', 'NOT_FOUND', 404);
      if (input.invoiceId) {
        const invoice = await tx.get<Row>(ctx.tenantId, 'invoices', input.invoiceId);
        if (
          !invoice ||
          invoice.status !== 'open' ||
          invoice.totalMinor !== input.amountMinor ||
          invoice.currency !== input.currency
        )
          return fail('Invoice does not match order', 'PAYMENT_MISMATCH', 409);
      }
      await tx.put(ctx.tenantId, 'payment-requests', {
        id: key,
        ...input,
        provider: this.providerName,
        status: 'pending',
      });
      return {};
    });
    if (reservation.existing) return reservation.existing;
    const result = recover
      ? provider.recoverOrder
        ? await provider.recoverOrder(request)
        : fail('Provider order recovery unavailable', 'PROVIDER_REQUIRED', 503)
      : await provider.createOrder(request);
    return atomic(store, ctx.tenantId, async (tx) => {
      const old = await tx.get<Row>(ctx.tenantId, 'payment-requests', key);
      if (old?.result) {
        const previous = old.result as PaymentResult;
        if (previous.id !== result.id)
          return fail('Provider returned conflicting order', 'CONFLICT', 409);
        return previous;
      }
      const existing = await tx.get<Row>(ctx.tenantId, 'payment-orders', result.id);
      if (existing) return fail('Provider order already mapped', 'CONFLICT', 409);
      await tx.put(ctx.tenantId, 'payment-orders', {
        id: result.id,
        provider: this.providerName,
        amountMinor: input.amountMinor,
        currency: input.currency,
        reference: input.reference,
        invoiceId: input.invoiceId,
        status: result.status,
      });
      await tx.put(ctx.tenantId, 'payment-requests', {
        id: key,
        ...input,
        provider: this.providerName,
        status: 'accepted',
        result,
      });
      await this.audit.record(
        ctx,
        'payment.order-created',
        'payments',
        result.id,
        { amountMinor: input.amountMinor, currency: input.currency, provider: this.providerName },
        tx,
      );
      return result;
    });
  }
  createOrder(
    ctx: ActorContext,
    input: Omit<PaymentOrderInput, 'tenantId'> & { invoiceId?: string },
  ) {
    return this.order(ctx, input, false);
  }
  /** Read-only provider recovery; never blindly resubmit an ambiguous mutation. */
  recoverOrder(
    ctx: ActorContext,
    input: Omit<PaymentOrderInput, 'tenantId'> & { invoiceId?: string },
  ) {
    return this.order(ctx, input, true);
  }
  async reconcilePayment(ctx: ActorContext, input: { orderId: string; paymentId: string }) {
    const { provider, store } = await this.ready(ctx, 'payments:reconcile');
    if (!provider.reconcilePayment)
      return fail('Provider payment reconciliation unavailable', 'PROVIDER_REQUIRED', 503);
    return provider.reconcilePayment(
      store,
      ctx,
      text(input.orderId, 'order ID', 200),
      text(input.paymentId, 'payment ID', 200),
    );
  }
  async refund(
    ctx: ActorContext,
    input: { paymentId: string; amountMinor?: number; idempotencyKey?: string },
  ) {
    return this.processRefund(ctx, input, false);
  }
  async reconcileRefund(
    ctx: ActorContext,
    input: { paymentId: string; amountMinor?: number; idempotencyKey?: string },
  ) {
    return this.processRefund(ctx, input, true);
  }
  private async processRefund(
    ctx: ActorContext,
    input: { paymentId: string; amountMinor?: number; idempotencyKey?: string },
    recover: boolean,
  ): Promise<PaymentResult> {
    const { provider, store } = await this.ready(ctx, 'payments:refund');
    const idempotencyKey = text(input.idempotencyKey, 'idempotencyKey', 200),
      key = hash(`refund:${idempotencyKey}`);
    const reservation = await atomic(store, ctx.tenantId, async (tx) => {
      const payment = await tx.get<Row>(ctx.tenantId, 'verified-payments', input.paymentId);
      if (
        !payment ||
        payment.status !== 'captured' ||
        (payment.provider ?? 'razorpay') !== this.providerName
      )
        return fail('Verified payment for selected provider required', 'PAYMENT_NOT_FOUND', 404);
      const old = await tx.get<Row>(ctx.tenantId, 'refund-requests', key);
      if (old) {
        if (
          (old.provider ?? 'razorpay') !== this.providerName ||
          old.paymentId !== input.paymentId ||
          old.requestedAmount !== input.amountMinor
        )
          return fail('Refund key conflict', 'CONFLICT', 409);
        if (old.result && (!recover || old.reconciled === true))
          return {
            existing: old.result as PaymentResult,
            amountMinor: Number(old.amountMinor),
            orderId: String(payment.orderId),
          };
        if (!recover) return fail('Refund outcome pending reconciliation', 'PAYMENT_PENDING', 409);
        return { amountMinor: Number(old.amountMinor), orderId: String(payment.orderId) };
      }
      if (recover) return fail('Refund request not found', 'NOT_FOUND', 404);
      const amount = integer(
        input.amountMinor ?? payment.amountMinor,
        'amount',
        1,
        Number(payment.amountMinor),
      );
      const reserved = Number(payment.refundReservedMinor ?? 0);
      if (reserved + amount > Number(payment.amountMinor))
        return fail('Refund exceeds remaining captured payment', 'CONFLICT', 409);
      await tx.put(ctx.tenantId, 'verified-payments', {
        ...payment,
        refundReservedMinor: reserved + amount,
      });
      await tx.put(ctx.tenantId, 'refund-requests', {
        id: key,
        provider: this.providerName,
        paymentId: input.paymentId,
        amountMinor: amount,
        requestedAmount: input.amountMinor,
        status: 'pending',
      });
      return { amountMinor: amount, orderId: String(payment.orderId) };
    });
    if (reservation.existing) return reservation.existing;
    const request: PaymentRefundInput = {
      tenantId: ctx.tenantId,
      paymentId: input.paymentId,
      orderId: reservation.orderId,
      amountMinor: reservation.amountMinor,
      idempotencyKey,
    };
    const result = recover
      ? provider.recoverRefund
        ? await provider.recoverRefund(request)
        : fail('Provider refund recovery unavailable', 'PROVIDER_REQUIRED', 503)
      : await provider.refund(request);
    return atomic(store, ctx.tenantId, async (tx) => {
      const row = await tx.get<Row>(ctx.tenantId, 'refund-requests', key);
      if (!row) return fail('Refund reservation missing', 'CONFLICT', 409);
      if (row.providerRefundId && row.providerRefundId !== result.id)
        return fail('Refund reference conflict', 'CONFLICT', 409);
      if (row.reconciled === true) return row.result as PaymentResult;
      const terminal =
        ['cashfree', 'stripe'].includes(this.providerName) &&
        ['processed', 'failed'].includes(result.status);
      if (terminal) {
        const payment = await tx.get<Row>(ctx.tenantId, 'verified-payments', input.paymentId);
        if (!payment) return fail('Payment missing', 'CONFLICT', 409);
        await tx.put(ctx.tenantId, 'verified-payments', {
          ...payment,
          refundReservedMinor:
            result.status === 'failed'
              ? Number(payment.refundReservedMinor ?? 0) - reservation.amountMinor
              : payment.refundReservedMinor,
          refundedMinor:
            result.status === 'processed'
              ? Number(payment.refundedMinor ?? 0) + reservation.amountMinor
              : Number(payment.refundedMinor ?? 0),
        });
      }
      await tx.put(ctx.tenantId, 'refund-requests', {
        ...row,
        status: result.status,
        result,
        providerRefundId: result.id,
        reconciled: terminal,
      });
      await tx.put(ctx.tenantId, 'provider-refunds', {
        id: result.id,
        provider: this.providerName,
        requestId: key,
        paymentId: input.paymentId,
        amountMinor: reservation.amountMinor,
        status: result.status,
        reconciled: terminal,
      });
      await this.audit.record(
        ctx,
        'payment.refund-requested',
        'payments',
        result.id,
        undefined,
        tx,
      );
      return result;
    });
  }
}
export class WebhookService {
  /** Timestamp + payload are authenticated; callers must persist event IDs for durable replay protection. */
  sign(payload: string, secret: string, timestampSeconds = Math.floor(Date.now() / 1000)) {
    if (secret.length < 16)
      throw new SaplingError('WEAK_WEBHOOK_SECRET', 'Webhook secret must be >=16 characters');
    return {
      timestamp: timestampSeconds,
      signature: createHmac('sha256', secret)
        .update(`${timestampSeconds}.${payload}`)
        .digest('hex'),
    };
  }
  verify(
    payload: string,
    secret: string,
    timestamp: number,
    signature: string,
    maxAgeSeconds = 300,
  ) {
    if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > maxAgeSeconds)
      return false;
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const expected = this.sign(payload, secret, timestamp).signature;
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  }
}
export class TelemetryService {
  constructor(private provider?: TelemetryAdapter) {}
  log(level: 'debug' | 'info' | 'warn' | 'error', event: string, fields?: JsonRecord) {
    return this.provider?.log({ level, event, at: new Date().toISOString(), fields });
  }
}
/** Sample S3 adapter: inject an AWS SDK v3 compatible client and configured bucket. */
export interface S3LikeClient {
  send(command: unknown): Promise<any>;
}
export class S3StorageAdapterExample {
  static guidance =
    'Implement StorageAdapter using @aws-sdk/client-s3 commands; prefix object keys with tenant-scoped IDs, enforce IAM, SSE-KMS, and size controls.';
}
/** Razorpay: provider owns payment verification and idempotency; do not treat an order as paid. */
export class RazorpayAdapter implements PaymentAdapter {
  readonly name = 'razorpay';
  constructor(
    private keyId: string,
    private secret: string,
    private apiBase = 'https://api.razorpay.com/v1',
  ) {
    const url = new URL(apiBase);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
      throw Error('Fixed HTTPS Razorpay endpoint required');
  }
  private async request(path: string, body: JsonRecord) {
    const header = 'Basic ' + Buffer.from(`${this.keyId}:${this.secret}`).toString('base64');
    const response = await fetch(`${this.apiBase}${path}`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
      headers: { authorization: header, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = JSON.parse(await boundedResponseText(response, 1000000)) as {
      id?: string;
      status?: string;
      error?: { description?: string };
    };
    if (!response.ok || !data.id)
      throw new SaplingError('PAYMENT_PROVIDER_ERROR', 'Provider rejected request', 502);
    return { id: data.id, status: data.status ?? 'created' };
  }
  async createOrder(input: {
    tenantId: string;
    amountMinor: number;
    currency: string;
    reference: string;
  }) {
    return this.request('/orders', {
      amount: input.amountMinor,
      currency: input.currency,
      receipt: input.reference,
      notes: { tenantId: input.tenantId },
    });
  }
  async refund(input: { tenantId: string; paymentId: string; amountMinor?: number }) {
    const payload: JsonRecord = { notes: { tenantId: input.tenantId } };
    if (input.amountMinor !== undefined) payload.amount = input.amountMinor;
    return this.request(`/payments/${encodeURIComponent(input.paymentId)}/refund`, payload);
  }
}
