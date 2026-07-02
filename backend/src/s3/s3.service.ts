import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const S3_FRONTEND_BUCKET_PREFIX = 'bsp-blueprint';
const BRAND_LOGOS_PREFIX = 'corporation-brand-logos/';
const COMPANY_BRAND_LOGOS_PREFIX = 'company-brand-logos/';
const USER_AVATARS_PREFIX = 'app-user-avatars/';
const SUPPORT_REQUEST_ATTACHMENTS_PREFIX = 'support-request-attachments/';
const USER_DATA_EXPORTS_PREFIX = 'user-data-exports/';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION')!;
    const env = this.configService.get<string>('NODE_ENV');
    this.bucket = `${S3_FRONTEND_BUCKET_PREFIX}-${env}-frontend`;
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    this.s3 = new S3Client({
      region: this.region,
      ...(accessKeyId &&
        secretAccessKey && {
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        }),
    });
  }

  /**
   * Returns the full public URL for an S3 object key.
   * Uses CLOUDFRONT_URL only when set; otherwise builds S3 URL.
   */
  getPublicUrl(key: string): string {
    const cloudfrontUrl = this.configService
      .get<string>('CLOUDFRONT_URL')
      ?.trim();
    if (cloudfrontUrl) {
      const normalized = cloudfrontUrl.replace(/\/$/, '');
      return `${normalized}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Uploads a file to the frontend bucket under the given key.
   * @param key - S3 object key (e.g. brand-logos/uuid.png)
   * @param body - Buffer or Uint8Array
   * @param contentType - MIME type
   */
  async upload(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Uploaded to s3://${this.bucket}/${key}`);
  }

  /**
   * Returns true if an object exists at the given key.
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes an object from the frontend bucket.
   * @param key - S3 object key
   */
  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    this.logger.log(`Deleted s3://${this.bucket}/${key}`);
  }

  /**
   * Returns the S3 key prefix for brand logos.
   */
  getBrandLogosPrefix(): string {
    return BRAND_LOGOS_PREFIX;
  }

  /**
   * Builds full S3 key for a brand logo file.
   */
  buildBrandLogoKey(filename: string): string {
    return `${BRAND_LOGOS_PREFIX}${filename}`;
  }

  /**
   * Returns the S3 key prefix for company brand logos.
   */
  getCompanyBrandLogosPrefix(): string {
    return COMPANY_BRAND_LOGOS_PREFIX;
  }

  /**
   * Builds full S3 key for a company brand logo file.
   */
  buildCompanyBrandLogoKey(filename: string): string {
    return `${COMPANY_BRAND_LOGOS_PREFIX}${filename}`;
  }

  /**
   * Returns the S3 key prefix for app user avatars.
   */
  getUserAvatarsPrefix(): string {
    return USER_AVATARS_PREFIX;
  }

  /**
   * Builds full S3 key for an app user avatar file.
   */
  buildUserAvatarKey(filename: string): string {
    return `${USER_AVATARS_PREFIX}${filename}`;
  }

  /**
   * Returns the S3 key prefix for support request attachment images.
   */
  getSupportRequestAttachmentsPrefix(): string {
    return SUPPORT_REQUEST_ATTACHMENTS_PREFIX;
  }

  /**
   * Builds full S3 key for a support request attachment file.
   */
  buildSupportRequestAttachmentKey(filename: string): string {
    return `${SUPPORT_REQUEST_ATTACHMENTS_PREFIX}${filename}`;
  }

  /**
   * Returns the S3 key prefix for user data export ZIP archives.
   */
  getUserDataExportsPrefix(): string {
    return USER_DATA_EXPORTS_PREFIX;
  }

  /**
   * Builds full S3 key for a user data export ZIP file.
   */
  buildUserDataExportKey(filename: string): string {
    return `${USER_DATA_EXPORTS_PREFIX}${filename}`;
  }

  /**
   * Returns a short-lived presigned GET URL for a private object.
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3 as never, command, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Downloads an object from the frontend bucket into a Buffer.
   */
  async download(key: string): Promise<Buffer | null> {
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      const body = response.Body;
      if (!body) {
        return null;
      }
      const bytes = await body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error) {
      this.logger.warn(
        `Failed to download s3://${this.bucket}/${key}: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
