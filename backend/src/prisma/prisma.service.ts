import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';

/** Default path for RDS CA bundle when bundled in the container (e.g. Docker). */
const RDS_CA_BUNDLE_DEFAULT_PATH = '/app/certs/rds-global-bundle.pem';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  /**
   * Resolves CA certificate for RDS SSL verification. Uses, in order:
   * - DATABASE_SSL_CA: path to a PEM file
   * - DATABASE_SSL_CA_PEM: PEM content (e.g. from Secrets Manager)
   * - Bundled RDS global bundle at RDS_CA_BUNDLE_DEFAULT_PATH if present
   */
  private static resolveSslCa(
    configService: ConfigService,
  ): string | undefined {
    const caPath = configService.get<string>('DATABASE_SSL_CA')?.trim();
    if (caPath && fs.existsSync(caPath)) {
      return fs.readFileSync(caPath, 'utf8');
    }
    const caPem = configService.get<string>('DATABASE_SSL_CA_PEM')?.trim();
    if (caPem) {
      return caPem;
    }
    if (fs.existsSync(RDS_CA_BUNDLE_DEFAULT_PATH)) {
      return fs.readFileSync(RDS_CA_BUNDLE_DEFAULT_PATH, 'utf8');
    }
    return undefined;
  }

  constructor(private readonly configService: ConfigService) {
    let databaseUrl = configService.get<string>('DATABASE_URL');
    let requireSsl = false;

    // If DATABASE_URL is not set, construct from individual vars (used by ECS)
    if (!databaseUrl || !databaseUrl.trim()) {
      const host = configService.get<string>('DATABASE_HOST');
      const port = configService.get<string>('DATABASE_PORT') ?? '5432';
      const name = configService.get<string>('DATABASE_NAME');
      const username = configService.get<string>('DATABASE_USERNAME');
      const password = configService.get<string>('DATABASE_PASSWORD');

      if (host && name && username && password) {
        const encodedPassword = encodeURIComponent(password);
        // RDS requires SSL when connecting from ECS; verify-full = encrypt + verify cert + verify hostname
        databaseUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${name}?schema=public&sslmode=verify-full&sslrootcert=${RDS_CA_BUNDLE_DEFAULT_PATH}`;
        requireSsl = true;
      }
    } else if (
      databaseUrl.includes('sslmode=verify-full') ||
      databaseUrl.includes('sslmode=verify-ca') ||
      databaseUrl.includes('sslmode=require')
    ) {
      requireSsl = true;
    }

    if (!databaseUrl || !databaseUrl.trim()) {
      throw new Error(
        'DATABASE_URL is not configured. Please set DATABASE_URL or (DATABASE_HOST, DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD) in your environment.',
      );
    }

    const poolConfig: ConstructorParameters<typeof Pool>[0] = {
      connectionString: databaseUrl,
    };
    if (requireSsl) {
      const ca = PrismaService.resolveSslCa(configService);
      poolConfig.ssl = {
        rejectUnauthorized: true,
        ...(ca ? { ca } : {}),
      };
    }
    const pool = new Pool(poolConfig);
    const adapter = new PrismaPg(pool);

    super({
      adapter,
    });

    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await (this as unknown as PrismaClient).$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await (this as unknown as PrismaClient).$disconnect();
    await this.pool.end();
    this.logger.log('Disconnected from database');
  }
}
