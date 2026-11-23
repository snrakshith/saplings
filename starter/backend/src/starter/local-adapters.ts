import { randomUUID } from 'node:crypto';
import type { NotificationAdapter, OperationDriver, PaymentAdapter } from '@saplings/sdk';

/** Development adapters keep the starter runnable before a provider account is connected. */
export const localNotifications: NotificationAdapter = {
  async send() {
    return { id: randomUUID(), status: 'sent' };
  },
};

export const localPayments: PaymentAdapter = {
  name: 'custom',
  async createOrder() {
    return { id: randomUUID(), status: 'created', provider: 'custom' };
  },
  async refund() {
    return { id: randomUUID(), status: 'refunded', provider: 'custom' };
  },
};

export const localOperation: OperationDriver = {
  async submit(_ctx, operationId) {
    return { state: 'accepted', reference: operationId };
  },
  async inspect(_ctx, _operationId, reference) {
    return { state: 'succeeded', reference };
  },
};
