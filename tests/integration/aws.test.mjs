import { test } from 'vitest';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { SNSClient } from '@aws-sdk/client-sns';
import {
  S3StorageAdapter,
  S3PresignAdapter,
  AwsNotificationsAdapter,
} from '../../packages/adapter-aws/dist/index.js';
function config() {
  if (
    process.env.SAPLING_SANDBOX_CONFIRM !== 'yes' ||
    !process.env.TEST_AWS_BUCKET ||
    !process.env.AWS_REGION
  )
    throw Error('Approved AWS sandbox bucket and region required');
  return { bucket: process.env.TEST_AWS_BUCKET, region: process.env.AWS_REGION };
}
test('live S3 tenant isolation, round trip, presign and cleanup', async () => {
  const { bucket, region } = config(),
    client = new S3Client({ region });
  const a = 'sapling-test-' + randomUUID(),
    b = 'sapling-test-' + randomUUID(),
    key = 'release-check.txt',
    data = Buffer.from('sapling release check');
  const storage = new S3StorageAdapter(client, bucket);
  let version;
  try {
    version = (await storage.put(a, key, data)).version;
    assert.deepEqual(Buffer.from((await storage.get(a, key, version)).data), data);
    assert.equal(await storage.get(b, key), undefined);
    const signer = new S3PresignAdapter(client, bucket);
    const result = await signer.execute({
      ctx: { tenantId: a, actorId: 'test' },
      featureId: 'SAAS-085',
      action: 'sign',
      input: { key },
      options: {},
    });
    const response = await fetch(result.url, { redirect: 'error' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), data.toString());
  } finally {
    if (version)
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: `tenants/${Buffer.from(a).toString('base64url')}/${key}`,
          VersionId: version === 'latest' ? undefined : version,
        }),
      );
    client.destroy();
  }
});
test('live SES/SNS send to approved sandbox recipients', async () => {
  const { region } = config();
  if (
    process.env.SAPLING_TEST_SEND_CONFIRM !== 'yes' ||
    !process.env.TEST_SES_FROM ||
    !process.env.TEST_SES_TO ||
    !process.env.TEST_SNS_TO
  )
    throw Error('Explicit send approval and sandbox destinations required');
  const ses = new SESv2Client({ region }),
    sns = new SNSClient({ region });
  try {
    const a = new AwsNotificationsAdapter(ses, sns, process.env.TEST_SES_FROM);
    for (const [channel, to] of [
      ['email', process.env.TEST_SES_TO],
      ['sms', process.env.TEST_SNS_TO],
    ]) {
      const r = await a.send({
        tenantId: 'release-test',
        channel,
        to,
        body: 'Sapling SDK sandbox integration check',
      });
      assert.ok(r.id);
      assert.equal(r.status, 'sent');
    }
  } finally {
    ses.destroy();
    sns.destroy();
  }
});
