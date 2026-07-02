import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as Sentry from '@sentry/nestjs';
import { randomInt } from 'crypto';
import {
  CognitoIdentityProviderClient,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminUserGlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ConfirmResetDto, RequestResetDto, ValidateResetDto } from './dto';
import { ApiResponse, ResponseHelper } from '../common';
import { sendPasswordUpdatedConfirmationEmail } from './password-updated-email.util';
import { EmailService } from '../email';
import { PrismaService } from '../prisma';
import {
  PASSWORD_RESET_SUBJECT,
  getPasswordResetHtml,
  getPasswordResetText,
} from './templates';
import {
  PASSWORD_RESET_CODE_SENT_MSG,
  PASSWORD_RESET_SUCCESS_MSG,
  RESET_CODE_VALID_MSG,
  INVALID_RESET_CODE_MSG,
  RESET_CODE_EXPIRED_MSG,
  PASSWORD_RESET_FAILED_MSG,
  PASSWORD_RESET_DB_ERROR_MSG,
  RESET_CODE_EXPIRED_MSG_USER,
  PASSWORD_RESET_RATE_LIMIT_MSG,
  PASSWORD_RESET_MAX_PER_HOUR,
} from './constants';
import { AUDIT_DOMAINS, PASSWORD_RESET_AUDIT_EVENTS } from '../audit';

/** Number of consecutive cleanup failures before logging at error level (for alerting). */
const CLEANUP_FAILURE_ALERT_THRESHOLD = 3;

@Injectable()
export class PasswordResetService implements OnModuleInit {
  private readonly logger = new Logger(PasswordResetService.name);

  onModuleInit() {}
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly tokenExpiryMinutes = 3;
  private cleanupConsecutiveFailures = 0;

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    const region = process.env.AWS_REGION || 'us-east-1';

    // Build AWS client configuration for Cognito (optional explicit credentials)
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const baseConfig: {
      region: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
    } = { region };

    if (accessKeyId && secretAccessKey) {
      baseConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
      this.logger.log(
        'AWS clients configured with explicit credentials from environment variables',
      );
    } else {
      this.logger.warn(
        'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY not set. AWS clients will use default credential chain (AWS CLI config, IAM role, etc.)',
      );
    }

    this.cognitoClient = new CognitoIdentityProviderClient(baseConfig);

    if (!process.env.COGNITO_USER_POOL_ID) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
    }
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
  }

  async requestReset(dto: RequestResetDto): Promise<ApiResponse> {
    const { email } = dto;

    const { exists: userExists } = await this.checkUserExists(email);

    // Always return success to prevent email enumeration attacks
    if (!userExists) {
      this.logger.warn(
        `Password reset requested for non-existent user: ${email}`,
      );
      return ResponseHelper.success(PASSWORD_RESET_CODE_SENT_MSG);
    }

    await this.assertPasswordResetRequestAllowed(email);

    await this.invalidateExistingTokens(email);

    const token = randomInt(100000, 999999).toString();
    const expiresAt =
      Math.floor(Date.now() / 1000) + this.tokenExpiryMinutes * 60;

    await this.storeToken(token, email, expiresAt);

    await this.sendResetEmail(email, token);

    this.logger.log(`Password reset token generated for: ${email}`);

    return ResponseHelper.success(PASSWORD_RESET_CODE_SENT_MSG);
  }

  async confirmReset(dto: ConfirmResetDto): Promise<ApiResponse> {
    const { email, token, newPassword } = dto;
    const tokenData = await this.getToken(token);

    if (!tokenData) {
      throw new BadRequestException(INVALID_RESET_CODE_MSG);
    }

    if (tokenData.email !== email.toLowerCase()) {
      throw new BadRequestException(INVALID_RESET_CODE_MSG);
    }

    const now = Math.floor(Date.now() / 1000);
    if (tokenData.expiresAt < now) {
      await this.deleteToken(token);
      throw new BadRequestException(RESET_CODE_EXPIRED_MSG_USER);
    }

    await this.setUserPassword(email, newPassword);
    await this.invalidateAllUserSessions(email);
    await this.deleteToken(token);
    await sendPasswordUpdatedConfirmationEmail({
      emailService: this.emailService,
      prisma: this.prisma,
      logger: this.logger,
      email,
    });

    this.logger.log(`Password successfully reset for: ${email}`);

    return ResponseHelper.success(PASSWORD_RESET_SUCCESS_MSG);
  }

  async resendResetCode(dto: RequestResetDto): Promise<ApiResponse> {
    return this.requestReset(dto);
  }

  async validateResetCode(dto: ValidateResetDto): Promise<ApiResponse> {
    const { email, token } = dto;
    const tokenData = await this.getToken(token);

    if (!tokenData) {
      throw new BadRequestException(INVALID_RESET_CODE_MSG);
    }

    if (tokenData.email !== email.toLowerCase()) {
      throw new BadRequestException(INVALID_RESET_CODE_MSG);
    }

    const now = Math.floor(Date.now() / 1000);
    if (tokenData.expiresAt < now) {
      await this.deleteToken(token);
      throw new BadRequestException(RESET_CODE_EXPIRED_MSG);
    }

    this.logger.log(`Reset code validated for: ${email}`);

    return ResponseHelper.success(RESET_CODE_VALID_MSG);
  }

  /**
   * Checks if user exists in Cognito User Pool and returns their sub (user ID).
   * Returns { exists: false, userId: null } for non-existent users, throws for other errors.
   */
  private async checkUserExists(
    email: string,
  ): Promise<{ exists: boolean; userId: string | null }> {
    try {
      const result = await this.cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: this.userPoolId,
          Username: email,
        }),
      );
      const sub =
        result.UserAttributes?.find((attr) => attr.Name === 'sub')?.Value ??
        null;
      return { exists: true, userId: sub };
    } catch (error) {
      // UserNotFoundException is expected - convert to false (not an error).
      // Other errors propagate to global exception filter.
      if ((error as Error).name === 'UserNotFoundException') {
        return { exists: false, userId: null };
      }
      throw error;
    }
  }

  private async storeToken(
    token: string,
    email: string,
    expiresAt: number,
  ): Promise<void> {
    try {
      await this.prisma.passwordResetToken.create({
        data: {
          token,
          email: email.toLowerCase(),
          expiresAt,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to store password reset token for ${email}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(PASSWORD_RESET_DB_ERROR_MSG);
    }
  }

  private async getToken(
    token: string,
  ): Promise<{ email: string; expiresAt: number } | null> {
    try {
      const row = await this.prisma.passwordResetToken.findUnique({
        where: { token },
      });
      if (!row) return null;
      return {
        email: row.email,
        expiresAt: row.expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to look up password reset token: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(PASSWORD_RESET_DB_ERROR_MSG);
    }
  }

  private async deleteToken(token: string): Promise<void> {
    try {
      await this.prisma.passwordResetToken.deleteMany({ where: { token } });
    } catch (error) {
      this.logger.warn(
        `Failed to delete password reset token (best-effort): ${(error as Error).message}`,
      );
      // Best-effort: do not fail the request (e.g. after confirm reset already succeeded)
    }
  }

  /**
   * Deletes all existing reset tokens for the user.
   * Ensures only one valid token exists at a time.
   */
  private async invalidateExistingTokens(email: string): Promise<void> {
    try {
      await this.prisma.passwordResetToken.deleteMany({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      this.logger.error(
        `Failed to invalidate existing tokens for ${email}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(PASSWORD_RESET_DB_ERROR_MSG);
    }
  }

  /**
   * Scheduled cleanup of expired password reset tokens. Runs every hour at minute 0.
   * Logs errors and tracks consecutive failures for alerting; does not throw.
   */
  @Cron('0 * * * *')
  async cleanupExpiredTokens(): Promise<void> {
    await Sentry.withIsolationScope(async () => {
      const now = Math.floor(Date.now() / 1000);
      try {
        const result = await this.prisma.passwordResetToken.deleteMany({
          where: { expiresAt: { lt: now } },
        });
        this.cleanupConsecutiveFailures = 0;
        if (result.count > 0) {
          this.logger.log(
            `Password reset cleanup: removed ${result.count} expired token(s)`,
          );
        }
      } catch (error) {
        this.cleanupConsecutiveFailures += 1;
        const message = (error as Error).message;
        this.logger.warn(
          `Password reset cleanup failed (consecutive #${this.cleanupConsecutiveFailures}): ${message}`,
        );
        if (
          this.cleanupConsecutiveFailures >= CLEANUP_FAILURE_ALERT_THRESHOLD
        ) {
          this.logger.error(
            `Repeated password reset cleanup failures (${this.cleanupConsecutiveFailures} consecutive). Expired tokens may be accumulating.`,
            (error as Error).stack,
          );
        }
      }
    });
  }

  /**
   * Sets user password using Cognito Admin API.
   * Password must meet Cognito policy requirements.
   */
  private async setUserPassword(
    email: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await this.cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: this.userPoolId,
          Username: email,
          Password: newPassword,
          Permanent: true,
        }),
      );
    } catch {
      throw new BadRequestException(PASSWORD_RESET_FAILED_MSG);
    }
  }

  /**
   * Invalidates all active sessions for a user by signing them out from all devices.
   * This is a security best practice when a password is reset.
   */
  private async invalidateAllUserSessions(email: string): Promise<void> {
    try {
      await this.cognitoClient.send(
        new AdminUserGlobalSignOutCommand({
          UserPoolId: this.userPoolId,
          Username: email,
        }),
      );
      this.logger.log(`All active sessions invalidated for: ${email}`);
    } catch (error) {
      this.logger.error(error as Error);
      throw error;
    }
  }

  private async sendResetEmail(email: string, token: string): Promise<void> {
    const templateParams = {
      token,
      expiryMinutes: this.tokenExpiryMinutes,
    };

    await this.emailService.sendEmail({
      to: email,
      subject: PASSWORD_RESET_SUBJECT,
      htmlBody: getPasswordResetHtml(templateParams),
      textBody: getPasswordResetText(templateParams),
    });
  }

  /**
   * Enforces per-email hourly reset request limits using password-reset audit logs.
   */
  private async assertPasswordResetRequestAllowed(
    email: string,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const count = await this.prisma.auditLog.count({
        where: {
          domain: AUDIT_DOMAINS.PASSWORD_RESET,
          eventType: PASSWORD_RESET_AUDIT_EVENTS.RESET_REQUEST,
          entityId: normalizedEmail,
          createdAt: { gte: oneHourAgo },
        },
      });

      if (count >= PASSWORD_RESET_MAX_PER_HOUR) {
        throw new BadRequestException(PASSWORD_RESET_RATE_LIMIT_MSG);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Password reset rate limit check failed for ${normalizedEmail}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(PASSWORD_RESET_DB_ERROR_MSG);
    }
  }
}
