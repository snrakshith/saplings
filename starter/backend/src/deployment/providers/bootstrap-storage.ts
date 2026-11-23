import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { setTimeout } from 'node:timers/promises';
import { providerSettings } from './settings.js';

const storage = providerSettings('staging').s3;
if (!storage?.endpoint || new URL(storage.endpoint).hostname !== 'object-store')
  throw new Error('Sandbox bucket initialization requires the local object-store service.');
const client = new S3Client({
  region: storage.region,
  endpoint: storage.endpoint,
  forcePathStyle: true,
  maxAttempts: 1,
});
try {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await client.send(new CreateBucketCommand({ Bucket: storage.bucket }), {
        abortSignal: AbortSignal.timeout(2500),
      });
      break;
    } catch (error) {
      if (error instanceof Error && error.name === 'BucketAlreadyOwnedByYou') break;
      if (attempt === 19) throw new Error('The sandbox bucket could not be initialized.');
      await setTimeout(600);
    }
  }
} finally {
  client.destroy();
}
