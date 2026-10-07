import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ErrorCode } from '@vrp/shared-types';
import type { UploadUrlDto } from '@vrp/shared-types';
import type { UploadUrlRequest } from '@vrp/validation';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const EXTENSIONS: Record<UploadUrlRequest['contentType'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const URL_TTL_SECONDS = 300;

let client: S3Client | null = null;
function s3(): S3Client {
  // Credentials come from the default provider chain: the ECS task role in
  // AWS, environment variables locally. Nothing is hard-coded.
  client ??= new S3Client({
    region: env.S3_REGION,
    // The SDK otherwise signs a checksum of the (empty) body at presign time,
    // which no real upload can match.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
  });
  return client;
}

export const uploadService = {
  isConfigured(): boolean {
    return Boolean(env.S3_BUCKET && env.S3_PUBLIC_BASE_URL);
  },

  keyPrefixFor(ownerId: string): string {
    return `vehicles/${ownerId}/`;
  },

  publicUrlFor(key: string): string {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  },

  /**
   * Issues a short-lived presigned PUT. The signature pins the content type
   * and exact byte length, so the browser can upload only what was declared,
   * and only into this owner's prefix. The file never passes through the API.
   */
  async createVehicleImageUpload(
    ownerId: string,
    request: UploadUrlRequest,
  ): Promise<UploadUrlDto> {
    if (!this.isConfigured()) {
      throw new AppError(
        503,
        ErrorCode.SERVICE_UNAVAILABLE,
        'Photo uploads aren’t configured here. Paste an image URL instead.',
      );
    }
    const key = `${this.keyPrefixFor(ownerId)}${randomUUID()}.${EXTENSIONS[request.contentType]}`;
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: request.contentType,
      ContentLength: request.contentLength,
      CacheControl: 'public, max-age=31536000, immutable',
    });
    const uploadUrl = await getSignedUrl(s3(), command, { expiresIn: URL_TTL_SECONDS });
    return {
      uploadUrl,
      key,
      publicUrl: this.publicUrlFor(key),
      expiresIn: URL_TTL_SECONDS,
      headers: { 'Content-Type': request.contentType },
    };
  },

  /** Rejects images that claim an S3 key outside the owner's own prefix. */
  assertOwnedImages(ownerId: string, images: { url: string; key?: string | undefined }[]): void {
    for (const image of images) {
      if (!image.key) continue;
      if (
        !image.key.startsWith(this.keyPrefixFor(ownerId)) ||
        image.url !== this.publicUrlFor(image.key)
      ) {
        throw AppError.badRequest('One of the photos doesn’t belong to your account.');
      }
    }
  },
};
