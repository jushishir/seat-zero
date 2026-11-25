import crypto from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 storage credentials are not configured');
  }

  return new S3Client({
    region: process.env.S3_REGION ?? 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function optimizeAndUploadBanner(
  inputBuffer: Buffer,
): Promise<string> {
  const bucket = process.env.S3_BUCKET;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (!bucket || !publicBaseUrl) {
    throw new Error('S3_BUCKET or S3_PUBLIC_BASE_URL is missing');
  }

  // sharp দিয়ে ছবি যাচাই, সোজা করা (.rotate) এবং 1200px WebP বানানো
  const optimizedBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const key = `banners/${Date.now()}-${crypto.randomUUID()}.webp`;

  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: optimizedBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return `${publicBaseUrl}/${key}`;
}
