import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Prefix a stored file URL must carry to be resolvable back to an S3 key. */
const FILES_URL_PREFIX = '/api/v1/files/';

/** The app's IAM user only has Get/Put/Delete on these prefixes. */
export const ALLOWED_KEY_PREFIXES = ['quests/', 'chat/', 'avatars/'] as const;

/**
 * Thin wrapper around the S3 client used for every user upload (quest source
 * documents, party chat attachments, avatars). Keys are namespaced by prefix
 * (see `ALLOWED_KEY_PREFIXES`) and never exposed directly — callers get back
 * `/api/v1/files/<key>` and the `FilesController` resolves that to a presigned
 * GET URL on demand.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly cfg: ConfigService) {
    this.bucket = this.cfg.getOrThrow<string>('S3_BUCKET');
    const region = this.cfg.get<string>('AWS_REGION', 'us-east-1');
    const endpoint = this.cfg.get<string>('S3_ENDPOINT');

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }

  async put(key: string, buffer: Buffer, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  /** No-op for a `null` key so callers can chain `keyFromUrl(...)` directly. */
  async delete(key: string | null): Promise<void> {
    if (!key) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(`no se pudo borrar ${key}: ${(err as Error).message}`);
    }
  }

  async deleteMany(keys: (string | null | undefined)[]): Promise<void> {
    const valid = keys.filter((key): key is string => !!key);
    if (valid.length === 0) return;

    try {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: valid.map((Key) => ({ Key })) },
        }),
      );
    } catch (err) {
      this.logger.warn(
        `no se pudieron borrar ${valid.length} objetos: ${(err as Error).message}`,
      );
    }
  }

  async presignGet(key: string, ttlSec = 600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: ttlSec });
  }

  /**
   * `true` when the object exists. The app's IAM user has no `s3:ListBucket`,
   * so a missing object can come back as either a `NotFound` (404) or an
   * `AccessDenied` (403, since S3 can't tell "denied" from "doesn't exist"
   * without list permission) — both mean "not found" here.
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 404 || status === 403) return false;
      throw err;
    }
  }

  /** `key/.../file` is valid only under an allowed prefix and never traverses up. */
  isValidKey(key: string): boolean {
    if (!key || key.includes('..')) return false;
    return ALLOWED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
  }

  /**
   * Parses a stored `/api/v1/files/<key>` value back into `<key>`. Returns
   * `null` for anything else (legacy `/uploads/...` rows, absolute URLs,
   * empty values) so callers can skip cleanup instead of erroring.
   */
  keyFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const idx = url.indexOf(FILES_URL_PREFIX);
    if (idx === -1) return null;

    const key = url.slice(idx + FILES_URL_PREFIX.length);
    return this.isValidKey(key) ? key : null;
  }

  urlForKey(key: string): string {
    return `${FILES_URL_PREFIX}${key}`;
  }
}
