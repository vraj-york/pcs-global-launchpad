import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ASSESSMENT_REPORTS_BUCKET_MISSING_MSG } from './assessment.constants';

@Injectable()
export class AssessmentReportsS3Service {
  private readonly logger = new Logger(AssessmentReportsS3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') ?? 'us-east-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const env = this.configService.get<string>('NODE_ENV') ?? 'development';
    const configured = this.configService
      .get<string>('ASSESSMENT_REPORTS_BUCKET')
      ?.trim();
    this.bucket =
      configured && configured.length > 0
        ? configured
        : `bsp-blueprint-${env}-frontend`;
    this.s3 = new S3Client({
      region,
      ...(accessKeyId &&
        secretAccessKey && {
          credentials: { accessKeyId, secretAccessKey },
        }),
    });
  }

  /**
   * Fetches the assessment report PDF from S3 by key. Normalizes the key,
   * maps missing/empty objects to NotFoundException, and rethrows other errors after logging.
   */
  async getReportPdfBuffer(s3Key: string): Promise<Buffer> {
    const bucket = this.requireBucket();
    const key = s3Key.replace(/^\//, '').trim();
    if (!key) {
      throw new NotFoundException('Report file key is missing.');
    }

    try {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      const body = res.Body;
      if (!body) {
        throw new NotFoundException('Report PDF not found in storage.');
      }
      const bytes = await body.transformToByteArray();
      const buffer = Buffer.from(bytes);
      if (buffer.length === 0) {
        throw new NotFoundException('Report PDF is empty.');
      }
      return buffer;
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'NoSuchKey' || name === 'NotFound') {
        throw new NotFoundException('Report PDF not found in storage.');
      }
      this.logger.error(
        `Failed to fetch report from s3://${bucket}/${key}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  /** Returns the configured reports bucket or throws when it is unset. */
  private requireBucket(): string {
    if (!this.bucket) {
      throw new InternalServerErrorException(
        ASSESSMENT_REPORTS_BUCKET_MISSING_MSG,
      );
    }
    return this.bucket;
  }
}
