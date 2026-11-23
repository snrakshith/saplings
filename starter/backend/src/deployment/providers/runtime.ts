import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { SNSClient } from '@aws-sdk/client-sns';
import { AwsNotificationsAdapter, S3PresignAdapter, S3StorageAdapter } from '@saplings/adapter-aws';
import {
  CashfreeAdapter,
  EnvelopeCrypto,
  type JsonRecord,
  CashfreeWebhookAdapter,
  StoreRateState,
  ValkeyRateState,
  type Store,
} from '@saplings/sdk';
import { createClient } from 'redis';
import nodemailer from 'nodemailer';
import type { DurableSettings } from '../settings.js';
import { providerSettings } from './settings.js';

export const objectPrefix = (actorId: string) => 'starter/' + actorId + '/';
export const objectAllowed = (actorId: string, key: string) =>
  key.startsWith(objectPrefix(actorId));

export async function openStarterProviders(settings: DurableSettings, store: Store) {
  const config = providerSettings(settings.environment);
  const readiness: Record<string, () => Promise<void>> = {};
  const s3 =
    config.s3 &&
    new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      forcePathStyle: Boolean(config.s3.endpoint),
      maxAttempts: 2,
    });
  const storage =
    s3 && config.s3 && new S3StorageAdapter(s3, config.s3.bucket, config.s3.encryptionKeyId, 32768);
  const presign =
    s3 && config.s3 && !config.s3.endpoint
      ? new S3PresignAdapter(s3, config.s3.bucket, (ctx, key) => objectAllowed(ctx.actorId, key))
      : undefined;
  if (s3 && config.s3) {
    const bucket = config.s3.bucket;
    readiness.storage = async () => {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }), {
        abortSignal: AbortSignal.timeout(2500),
      });
    };
  }
  const ses =
    config.notifications === 'aws'
      ? new SESv2Client({ region: config.region, maxAttempts: 2 })
      : undefined;
  const sns =
    config.notifications === 'aws'
      ? new SNSClient({ region: config.region, maxAttempts: 2 })
      : undefined;
  const mail =
    config.smtp &&
    nodemailer.createTransport({
      host: config.smtp.hostname,
      port: Number(config.smtp.port || (config.smtp.protocol === 'smtps:' ? 465 : 1025)),
      secure: config.smtp.protocol === 'smtps:',
      connectionTimeout: 2500,
      greetingTimeout: 2500,
      socketTimeout: 5000,
    });
  const notifications =
    ses && sns
      ? new AwsNotificationsAdapter(ses, sns, config.from!)
      : mail && {
          async send(message: { channel: string; to: string; subject?: string; body: string }) {
            if (message.channel !== 'email')
              throw new Error('This SMTP configuration only supports email.');
            const result = await mail.sendMail({
              from: config.from,
              to: message.to,
              subject: message.subject,
              text: message.body,
            });
            if (!result.accepted.length)
              throw new Error('The SMTP server rejected the notification.');
            return { id: result.messageId, status: 'sent' as const };
          },
        };
  if (mail)
    readiness.mail = async () => {
      await mail.verify();
    };

  const checkoutCrypto = config.encryptionKey
    ? new EnvelopeCrypto(config.encryptionKey, 'starter-checkout-v1')
    : undefined;
  const cashfree =
    config.cashfree &&
    new CashfreeAdapter({
      ...config.cashfree,
      customer: async ({ tenantId, reference }) => {
        const account = await store.get<{ actorId: string; contact: JsonRecord }>(
          tenantId,
          'starter-checkout-customers',
          reference,
        );
        if (!account) throw new Error('Checkout profile required.');
        const ctx = { tenantId, actorId: account.actorId };
        return { id: ctx.actorId, phone: checkoutCrypto!.decrypt(ctx, account.contact) };
      },
      returnUrl: new URL('/providers', settings.origin).href,
      notifyUrl: new URL('/api/webhooks/cashfree', settings.origin).href,
    });
  const webhook = cashfree && new CashfreeWebhookAdapter(store, cashfree);
  const valkey = config.valkey
    ? createClient({
        url: config.valkey,
        socket: { connectTimeout: 2500, reconnectStrategy: false },
      })
    : undefined;
  valkey?.on('error', () => console.error('Starter Valkey connection unavailable.'));
  try {
    await valkey?.connect();
  } catch (error) {
    s3?.destroy();
    ses?.destroy();
    sns?.destroy();
    mail?.close();
    throw error;
  }
  if (valkey)
    readiness.valkey = async () => {
      await valkey.ping();
    };

  return {
    storage,
    presign,
    notifications,
    cashfree,
    webhook,
    readiness,
    checkoutCrypto,
    checkout: config.cashfree && {
      environment: config.cashfree.environment,
      amountMinor: config.cashfree.amountMinor,
    },
    delivery: config.notifications,
    encryptionKey: config.encryptionKey || undefined,
    rateState: valkey ? new ValkeyRateState(valkey) : new StoreRateState(store),
    async close() {
      s3?.destroy();
      ses?.destroy();
      sns?.destroy();
      mail?.close();
      if (valkey?.isOpen) valkey.destroy();
    },
  };
}
