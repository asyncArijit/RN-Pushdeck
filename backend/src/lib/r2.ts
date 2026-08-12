import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Bindings } from '../types';

const PRESIGN_EXPIRES_SECONDS = 60 * 15;

export function createR2Client(env: Bindings) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export async function getPresignedUploadUrl(
  env: Bindings,
  key: string,
  contentType: string
) {
  const client = createR2Client(env);
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRES_SECONDS });
}

export function publicUrlFor(env: Bindings, key: string) {
  return `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
}

export function bundleStorageKey(projectKey: string, version: string, filename: string) {
  return `${projectKey}/${version}/${filename}`;
}
