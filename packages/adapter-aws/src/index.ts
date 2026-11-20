import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FeatureAdapter } from '@saplings/sdk';
/** AWS production-provider sketches using official SDK commands. Review IAM, encryption, limits,
 *  provider quotas, failures/retries and integration-test with real AWS before deployment. */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import type { StorageAdapter, NotificationAdapter } from '@saplings/sdk';
import { SaplingError } from '@saplings/sdk';
function safeSegment(s: string) {
  return Buffer.from(s, 'utf8').toString('base64url');
}
function objectPath(tenantId: string, key: string) {
  if (
    !tenantId ||
    !key ||
    key.startsWith('/') ||
    key.includes('\\') ||
    key.split('/').some((x) => x === '..' || x === '.' || !x)
  )
    throw new SaplingError('BAD_OBJECT_KEY', 'Unsafe tenant or object key');
  return `tenants/${safeSegment(tenantId)}/${key}`;
}
export class S3StorageAdapter implements StorageAdapter {
  constructor(
    private client: S3Client,
    private bucket: string,
    private encryptionKeyId?: string,
    private maxDownloadBytes = 10 * 1024 * 1024,
  ) {}
  async put(
    tenantId: string,
    key: string,
    data: Uint8Array,
    metadata: Record<string, string> = {},
  ) {
    const result = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectPath(tenantId, key),
        Body: data,
        Metadata: metadata,
        ServerSideEncryption: this.encryptionKeyId ? 'aws:kms' : 'AES256',
        SSEKMSKeyId: this.encryptionKeyId,
      }),
    );
    return { key, version: result.VersionId ?? 'latest', size: data.byteLength };
  }
  async get(tenantId: string, key: string, version?: string) {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: objectPath(tenantId, key),
          VersionId: version && version !== 'latest' ? version : undefined,
        }),
      );
      if (!result.Body) return undefined;
      if (result.ContentLength !== undefined && result.ContentLength > this.maxDownloadBytes) {
        result.Body.transformToWebStream()
          .cancel()
          .catch(() => {});
        throw new SaplingError('FILE_TOO_LARGE', 'Object exceeds download limit', 413);
      }
      const reader = result.Body.transformToWebStream().getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const item = await reader.read();
          if (item.done) break;
          size += item.value.byteLength;
          if (size > this.maxDownloadBytes)
            throw new SaplingError('FILE_TOO_LARGE', 'Object exceeds download limit', 413);
          chunks.push(item.value);
        }
        return {
          data: Buffer.concat(chunks),
          metadata: result.Metadata ?? {},
          version: result.VersionId ?? 'latest',
        };
      } catch (e) {
        await reader.cancel().catch(() => {});
        throw e;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && ['NoSuchKey', 'NotFound', 'NoSuchVersion'].includes(error.name))
        return undefined;
      throw error;
    }
  }
  async list(tenantId: string, prefix = '') {
    const base = objectPath(tenantId, '_placeholder').replace(/_placeholder$/, '');
    const result: { key: string; version: string; size: number }[] = [];
    let token: string | undefined;
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: base + prefix,
          ContinuationToken: token,
        }),
      );
      for (const obj of response.Contents ?? [])
        if (obj.Key?.startsWith(base))
          result.push({ key: obj.Key.slice(base.length), version: 'latest', size: obj.Size ?? 0 });
      token = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (token);
    return result;
  }
  async delete(tenantId: string, key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectPath(tenantId, key) }),
    );
  }
}
export class AwsNotificationsAdapter implements NotificationAdapter {
  constructor(
    private ses: SESv2Client,
    private sns: SNSClient,
    private fromEmail: string,
  ) {}
  async send(message: {
    tenantId: string;
    channel: 'email' | 'sms' | 'push' | 'inapp';
    to: string;
    subject?: string;
    body: string;
  }) {
    if (message.channel === 'email') {
      const output = await this.ses.send(
        new SendEmailCommand({
          FromEmailAddress: this.fromEmail,
          Destination: { ToAddresses: [message.to] },
          Content: {
            Simple: {
              Subject: { Data: message.subject ?? 'Notification' },
              Body: { Text: { Data: message.body } },
            },
          },
        }),
      );
      if (!output.MessageId)
        throw new SaplingError('SEND_FAILED', 'SES did not return a MessageId', 502);
      return { id: output.MessageId, status: 'sent' as const };
    }
    if (message.channel === 'sms') {
      const output = await this.sns.send(
        new PublishCommand({ PhoneNumber: message.to, Message: message.body }),
      );
      if (!output.MessageId)
        throw new SaplingError('SEND_FAILED', 'SNS did not return a MessageId', 502);
      return { id: output.MessageId, status: 'sent' as const };
    }
    throw new SaplingError('NOT_SUPPORTED', `AWS adapter does not support ${message.channel}`, 400);
  }
}

/** SAAS-085: configure this explicit capability adapter with tenant-scoped S3 keys. */
export class S3PresignAdapter implements FeatureAdapter {
  constructor(
    private client: S3Client,
    private bucket: string,
    private authorize?: (
      ctx: import('@saplings/sdk').ActorContext,
      key: string,
    ) => Promise<boolean> | boolean,
  ) {}
  async execute(request: Parameters<FeatureAdapter['execute']>[0]) {
    if (request.featureId !== 'SAAS-085' || request.action !== 'sign')
      throw new SaplingError('UNKNOWN_ACTION', 'Unsupported operation');
    const key = request.input.key,
      expires = request.input.expiresIn ?? 300;
    if (
      typeof key !== 'string' ||
      typeof expires !== 'number' ||
      !Number.isInteger(expires) ||
      expires < 1 ||
      expires > 900
    )
      throw new SaplingError('INVALID_INPUT', 'Invalid key or expiry');
    if (this.authorize && !(await this.authorize(request.ctx, key)))
      throw new SaplingError('FORBIDDEN', 'Object access denied', 403);
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectPath(request.ctx.tenantId, key) }),
      { expiresIn: expires },
    );
    return { url, expiresIn: expires };
  }
}
