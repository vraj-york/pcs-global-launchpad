import { randomInt } from 'crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as Sentry from '@sentry/nestjs';
import {
  AdminGetUserCommand,
  AdminSetUserMFAPreferenceCommand,
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { ApiResponse, ResponseHelper } from '../common';
import { EmailService } from '../email';
import { PrismaService } from '../prisma';
import { ChangePasswordDto, VerifyMfaOtpDto } from './dto';
import {
  INVALID_CURRENT_PASSWORD_MSG,
  INVALID_OR_EXPIRED_MFA_OTP_MSG,
  MFA_ALREADY_ENABLED_MSG,
  MFA_DISABLE_FAILED_MSG,
  MFA_DISABLED_SUCCESS_MSG,
  MFA_ENABLE_FAILED_MSG,
  MFA_ENABLED_SUCCESS_MSG,
  MFA_METHOD_EMAIL,
  MFA_NOT_ENABLED_MSG,
  MFA_OTP_EMAIL_FAILED_MSG,
  MFA_OTP_EXPIRED_MSG,
  MFA_OTP_RESEND_LIMIT_MSG,
  MFA_OTP_SENT_MSG,
  PASSWORD_CHANGED_SUCCESS_MSG,
  PASSWORD_CHANGE_FAILED_MSG,
  PASSWORDS_DO_NOT_MATCH_MSG,
  SECURITY_EMAIL_REQUIRED_MSG,
  SECURITY_OTP_DB_ERROR_MSG,
  SECURITY_OTP_PURPOSE_DATA_DOWNLOAD,
  SECURITY_OTP_PURPOSE_MFA_DISABLE,
  SECURITY_OTP_PURPOSE_MFA_ENABLE,
  SECURITY_STATUS_FETCHED_MSG,
  MFA_OTP_EXPIRY_MINUTES,
  MFA_OTP_RESEND_MAX_PER_HOUR,
  CLEANUP_FAILURE_ALERT_THRESHOLD,
} from './constants';
import type { SecurityStatusData } from './types';
import {
  getVerificationCodeHtml,
  getVerificationCodeText,
  VERIFICATION_CODE_SUBJECT,
} from './templates/verification-code.template';
import { sendPasswordUpdatedConfirmationEmail } from '../password-reset/password-updated-email.util';

@Injectable()
export class AccountSecurityService implements OnModuleInit {
  private readonly logger = new Logger(AccountSecurityService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private cleanupConsecutiveFailures = 0;

  onModuleInit() {}

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const baseConfig: {
      region: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
    } = { region };

    if (accessKeyId && secretAccessKey) {
      baseConfig.credentials = { accessKeyId, secretAccessKey };
    }

    this.cognitoClient = new CognitoIdentityProviderClient(baseConfig);

    if (!process.env.COGNITO_USER_POOL_ID) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
    }
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
  }

  async getSecurityStatus(
    cognitoSub: string,
    email?: string,
  ): Promise<ApiResponse<SecurityStatusData>> {
    const resolvedEmail = await this.resolveCognitoUsername(cognitoSub, email);
    const mfaEnabled = await this.isEmailMfaEnabled(resolvedEmail);

    return ResponseHelper.success(SECURITY_STATUS_FETCHED_MSG, {
      mfaEnabled,
      mfaMethod: mfaEnabled ? MFA_METHOD_EMAIL : null,
      email: resolvedEmail,
    });
  }

  /**
   * Changes the password for the authenticated user.
   * @param accessToken - The access token for the authenticated user.
   * @param dto - The change password data.
   * @param email - Registered email used to send the password-updated confirmation.
   * @returns The response.
   */
  async changePassword(
    accessToken: string,
    dto: ChangePasswordDto,
    email?: string,
  ): Promise<ApiResponse> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(PASSWORDS_DO_NOT_MATCH_MSG);
    }

    try {
      await this.cognitoClient.send(
        new ChangePasswordCommand({
          AccessToken: accessToken,
          PreviousPassword: dto.currentPassword,
          ProposedPassword: dto.newPassword,
        }),
      );
    } catch (error) {
      const name = (error as Error).name;
      if (name === 'NotAuthorizedException') {
        throw new BadRequestException(INVALID_CURRENT_PASSWORD_MSG);
      }
      if (
        name === 'InvalidPasswordException' ||
        name === 'InvalidParameterException'
      ) {
        throw new BadRequestException(PASSWORD_CHANGE_FAILED_MSG);
      }
      if (name === 'LimitExceededException') {
        throw new BadRequestException(PASSWORD_CHANGE_FAILED_MSG);
      }
      this.logger.error(
        `ChangePassword failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new BadRequestException(PASSWORD_CHANGE_FAILED_MSG);
    }

    this.logger.log('Password changed successfully for authenticated user');

    const resolvedEmail = email?.trim();
    if (resolvedEmail) {
      await sendPasswordUpdatedConfirmationEmail({
        emailService: this.emailService,
        prisma: this.prisma,
        logger: this.logger,
        email: resolvedEmail,
      });
    }

    return ResponseHelper.success(PASSWORD_CHANGED_SUCCESS_MSG);
  }

  /**
   * Sends an MFA enable OTP to the user.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  async sendMfaEnableOtp(
    cognitoSub: string,
    email?: string,
  ): Promise<ApiResponse<{ email: string }>> {
    const resolvedEmail = await this.resolveCognitoUsername(cognitoSub, email);

    if (await this.isEmailMfaEnabled(resolvedEmail)) {
      throw new BadRequestException(MFA_ALREADY_ENABLED_MSG);
    }

    await this.assertMfaOtpResendAllowed(
      cognitoSub,
      SECURITY_OTP_PURPOSE_MFA_ENABLE,
    );
    await this.issueMfaOtp(
      cognitoSub,
      resolvedEmail,
      SECURITY_OTP_PURPOSE_MFA_ENABLE,
    );

    return ResponseHelper.success(MFA_OTP_SENT_MSG, { email: resolvedEmail });
  }

  /**
   * Resends an MFA enable OTP to the user.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  async resendMfaEnableOtp(
    cognitoSub: string,
    email?: string,
  ): Promise<ApiResponse<{ email: string }>> {
    const resolvedEmail = await this.resolveCognitoUsername(cognitoSub, email);

    if (await this.isEmailMfaEnabled(resolvedEmail)) {
      throw new BadRequestException(MFA_ALREADY_ENABLED_MSG);
    }

    await this.assertMfaOtpResendAllowed(
      cognitoSub,
      SECURITY_OTP_PURPOSE_MFA_ENABLE,
    );
    await this.issueMfaOtp(
      cognitoSub,
      resolvedEmail,
      SECURITY_OTP_PURPOSE_MFA_ENABLE,
    );

    return ResponseHelper.success(MFA_OTP_SENT_MSG, { email: resolvedEmail });
  }

  /**
   * Verifies an MFA enable OTP.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param dto - The verify MFA enable OTP data.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  async verifyMfaEnableOtp(
    cognitoSub: string,
    dto: VerifyMfaOtpDto,
    email?: string,
  ): Promise<ApiResponse> {
    const resolvedEmail = await this.resolveCognitoUsername(cognitoSub, email);

    if (await this.isEmailMfaEnabled(resolvedEmail)) {
      throw new BadRequestException(MFA_ALREADY_ENABLED_MSG);
    }

    const tokenData = await this.getOtpToken(dto.otp);
    if (!tokenData) {
      throw new BadRequestException(INVALID_OR_EXPIRED_MFA_OTP_MSG);
    }

    if (
      tokenData.cognitoSub !== cognitoSub ||
      tokenData.purpose !== SECURITY_OTP_PURPOSE_MFA_ENABLE
    ) {
      throw new BadRequestException(INVALID_OR_EXPIRED_MFA_OTP_MSG);
    }

    const now = Math.floor(Date.now() / 1000);
    if (tokenData.expiresAt < now) {
      await this.deleteOtpToken(dto.otp);
      throw new BadRequestException(MFA_OTP_EXPIRED_MSG);
    }

    await this.enableEmailMfa(resolvedEmail);
    await this.deleteOtpToken(dto.otp);

    this.logger.log(`Email MFA enabled for user: ${resolvedEmail}`);

    return ResponseHelper.success(MFA_ENABLED_SUCCESS_MSG);
  }

  /**
   * Sends an MFA disable OTP to the user.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  async sendMfaDisableOtp(
    cognitoSub: string,
    email?: string,
  ): Promise<ApiResponse<{ email: string }>> {
    const resolvedEmail = await this.resolveCognitoUsername(cognitoSub, email);

    if (!(await this.isEmailMfaEnabled(resolvedEmail))) {
      throw new BadRequestException(MFA_NOT_ENABLED_MSG);
    }

    await this.assertMfaOtpResendAllowed(
      cognitoSub,
      SECURITY_OTP_PURPOSE_MFA_DISABLE,
    );
    await this.issueMfaOtp(
      cognitoSub,
      resolvedEmail,
      SECURITY_OTP_PURPOSE_MFA_DISABLE,
    );

    return ResponseHelper.success(MFA_OTP_SENT_MSG, { email: resolvedEmail });
  }

  /**
   * Resends an MFA disable OTP to the user.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  async resendMfaDisableOtp(
    cognitoSub: string,
    email?: string,
  ): Promise<ApiResponse<{ email: string }>> {
    const resolvedEmail = await this.resolveCognitoUsername(cognitoSub, email);

    if (!(await this.isEmailMfaEnabled(resolvedEmail))) {
      throw new BadRequestException(MFA_NOT_ENABLED_MSG);
    }

    await this.assertMfaOtpResendAllowed(
      cognitoSub,
      SECURITY_OTP_PURPOSE_MFA_DISABLE,
    );
    await this.issueMfaOtp(
      cognitoSub,
      resolvedEmail,
      SECURITY_OTP_PURPOSE_MFA_DISABLE,
    );

    return ResponseHelper.success(MFA_OTP_SENT_MSG, { email: resolvedEmail });
  }

  /**
   * Verifies an MFA disable OTP.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param dto - The verify MFA disable OTP data.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  async verifyMfaDisableOtp(
    cognitoSub: string,
    dto: VerifyMfaOtpDto,
    email?: string,
  ): Promise<ApiResponse> {
    const resolvedEmail = await this.resolveCognitoUsername(cognitoSub, email);

    if (!(await this.isEmailMfaEnabled(resolvedEmail))) {
      throw new BadRequestException(MFA_NOT_ENABLED_MSG);
    }

    const tokenData = await this.getOtpToken(dto.otp);
    if (!tokenData) {
      throw new BadRequestException(INVALID_OR_EXPIRED_MFA_OTP_MSG);
    }

    if (
      tokenData.cognitoSub !== cognitoSub ||
      tokenData.purpose !== SECURITY_OTP_PURPOSE_MFA_DISABLE
    ) {
      throw new BadRequestException(INVALID_OR_EXPIRED_MFA_OTP_MSG);
    }

    const now = Math.floor(Date.now() / 1000);
    if (tokenData.expiresAt < now) {
      await this.deleteOtpToken(dto.otp);
      throw new BadRequestException(MFA_OTP_EXPIRED_MSG);
    }

    await this.disableEmailMfa(resolvedEmail);
    await this.deleteOtpToken(dto.otp);

    this.logger.log(`Email MFA disabled for user: ${resolvedEmail}`);

    return ResponseHelper.success(MFA_DISABLED_SUCCESS_MSG);
  }

  /**
   * Sends a data-download verification OTP to the user.
   */
  async sendDataDownloadOtp(
    cognitoSub: string,
    email?: string,
  ): Promise<ApiResponse<{ email: string }>> {
    const resolvedEmail = await this.resolveCognitoUsername(cognitoSub, email);

    await this.assertMfaOtpResendAllowed(
      cognitoSub,
      SECURITY_OTP_PURPOSE_DATA_DOWNLOAD,
    );
    await this.issueMfaOtp(
      cognitoSub,
      resolvedEmail,
      SECURITY_OTP_PURPOSE_DATA_DOWNLOAD,
    );

    return ResponseHelper.success(MFA_OTP_SENT_MSG, { email: resolvedEmail });
  }

  /**
   * Resends a data-download verification OTP to the user.
   */
  async resendDataDownloadOtp(
    cognitoSub: string,
    email?: string,
  ): Promise<ApiResponse<{ email: string }>> {
    const resolvedEmail = await this.resolveCognitoUsername(cognitoSub, email);

    await this.assertMfaOtpResendAllowed(
      cognitoSub,
      SECURITY_OTP_PURPOSE_DATA_DOWNLOAD,
    );
    await this.issueMfaOtp(
      cognitoSub,
      resolvedEmail,
      SECURITY_OTP_PURPOSE_DATA_DOWNLOAD,
    );

    return ResponseHelper.success(MFA_OTP_SENT_MSG, { email: resolvedEmail });
  }

  /**
   * Validates an OTP for the given purpose and authenticated user.
   */
  async assertValidSecurityOtp(
    cognitoSub: string,
    otp: string,
    purpose: string,
  ): Promise<void> {
    const tokenData = await this.getOtpToken(otp);
    if (!tokenData) {
      throw new BadRequestException(INVALID_OR_EXPIRED_MFA_OTP_MSG);
    }

    if (tokenData.cognitoSub !== cognitoSub || tokenData.purpose !== purpose) {
      throw new BadRequestException(INVALID_OR_EXPIRED_MFA_OTP_MSG);
    }

    const now = Math.floor(Date.now() / 1000);
    if (tokenData.expiresAt < now) {
      await this.deleteOtpToken(otp);
      throw new BadRequestException(MFA_OTP_EXPIRED_MSG);
    }
  }

  /**
   * Validates and deletes a consumed OTP for the given purpose.
   */
  async consumeSecurityOtp(
    cognitoSub: string,
    otp: string,
    purpose: string,
  ): Promise<void> {
    await this.assertValidSecurityOtp(cognitoSub, otp, purpose);
    await this.deleteOtpToken(otp);
  }

  /**
   * Cleans up expired OTP tokens.
   */
  @Cron('0 * * * *')
  async cleanupExpiredOtpTokens(): Promise<void> {
    await Sentry.withIsolationScope(async () => {
      const now = Math.floor(Date.now() / 1000);
      try {
        const result = await this.prisma.securityOtpToken.deleteMany({
          where: { expiresAt: { lt: now } },
        });
        this.cleanupConsecutiveFailures = 0;
        if (result.count > 0) {
          this.logger.log(
            `Security OTP cleanup: removed ${result.count} expired token(s)`,
          );
        }
      } catch (error) {
        this.cleanupConsecutiveFailures += 1;
        const message = (error as Error).message;
        this.logger.warn(
          `Security OTP cleanup failed (consecutive #${this.cleanupConsecutiveFailures}): ${message}`,
        );
        if (
          this.cleanupConsecutiveFailures >= CLEANUP_FAILURE_ALERT_THRESHOLD
        ) {
          this.logger.error(
            `Repeated security OTP cleanup failures (${this.cleanupConsecutiveFailures} consecutive).`,
            (error as Error).stack,
          );
        }
      }
    });
  }

  /**
   * Issues an MFA OTP.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param email - The email for the authenticated user.
   * @param purpose - The purpose of the OTP.
   * @returns The response.
   */
  private async issueMfaOtp(
    cognitoSub: string,
    email: string,
    purpose: string,
  ): Promise<void> {
    await this.invalidateExistingOtpTokens(cognitoSub, purpose);

    const token = randomInt(100000, 999999).toString();
    const expiresAt =
      Math.floor(Date.now() / 1000) + MFA_OTP_EXPIRY_MINUTES * 60;

    await this.storeOtpToken({
      token,
      cognitoSub,
      email,
      purpose,
      expiresAt,
    });

    try {
      await this.sendMfaOtpEmail(email, token);
    } catch (error) {
      await this.deleteOtpToken(token);
      this.logger.error(
        `Failed to send MFA OTP (${purpose}) to ${email}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(MFA_OTP_EMAIL_FAILED_MSG);
    }

    this.logger.log(`MFA OTP (${purpose}) generated for: ${email}`);
  }

  /**
   * Enables email MFA.
   * @param username - The username for the authenticated user.
   * @returns The response.
   */
  private async enableEmailMfa(username: string): Promise<void> {
    try {
      await this.cognitoClient.send(
        new AdminSetUserMFAPreferenceCommand({
          UserPoolId: this.userPoolId,
          Username: username,
          EmailMfaSettings: {
            Enabled: true,
            PreferredMfa: true,
          },
        }),
      );
    } catch (error) {
      this.logger.error(
        `AdminSetUserMFAPreference failed for ${username}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new BadRequestException(MFA_ENABLE_FAILED_MSG);
    }
  }

  /**
   * Disables email MFA.
   * @param username - The username for the authenticated user.
   * @returns The response.
   */
  private async disableEmailMfa(username: string): Promise<void> {
    try {
      await this.cognitoClient.send(
        new AdminSetUserMFAPreferenceCommand({
          UserPoolId: this.userPoolId,
          Username: username,
          EmailMfaSettings: {
            Enabled: false,
            PreferredMfa: false,
          },
        }),
      );
    } catch (error) {
      this.logger.error(
        `AdminSetUserMFAPreference (disable) failed for ${username}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new BadRequestException(MFA_DISABLE_FAILED_MSG);
    }
  }

  /**
   * Checks if email MFA is enabled.
   * @param username - The username for the authenticated user.
   * @returns The response.
   */
  private async isEmailMfaEnabled(username: string): Promise<boolean> {
    const user = await this.cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      }),
    );
    const settings = user.UserMFASettingList ?? [];
    return settings.includes('EMAIL_OTP');
  }

  /**
   * Resolves the Cognito username.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  private async resolveCognitoUsername(
    cognitoSub: string,
    email?: string,
  ): Promise<string> {
    const trimmedEmail = email?.trim().toLowerCase();
    if (trimmedEmail) {
      return trimmedEmail;
    }

    const row = await this.prisma.appUser.findUnique({
      where: { cognitoSub },
      select: { email: true, deletedAt: true },
    });
    if (row != null && row.deletedAt == null) {
      const dbEmail = row.email?.trim().toLowerCase();
      if (dbEmail) {
        return dbEmail;
      }
    }

    try {
      const res = await this.cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: this.userPoolId,
          Username: cognitoSub,
        }),
      );
      const cognitoEmail = res.UserAttributes?.find(
        (a) => a.Name === 'email',
      )?.Value?.trim();
      if (cognitoEmail) {
        return cognitoEmail.toLowerCase();
      }
    } catch (error) {
      if ((error as Error).name !== 'UserNotFoundException') {
        throw error;
      }
    }

    throw new BadRequestException(SECURITY_EMAIL_REQUIRED_MSG);
  }

  /**
   * Asserts that MFA OTP resend is allowed.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param purpose - The purpose of the OTP.
   * @returns The response.
   */
  private async assertMfaOtpResendAllowed(
    cognitoSub: string,
    purpose: string,
  ): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    try {
      const count = await this.prisma.securityOtpToken.count({
        where: {
          cognitoSub,
          purpose,
          createdAt: { gte: oneHourAgo },
        },
      });
      if (count >= MFA_OTP_RESEND_MAX_PER_HOUR) {
        throw new BadRequestException(MFA_OTP_RESEND_LIMIT_MSG);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `MFA OTP resend limit check failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(SECURITY_OTP_DB_ERROR_MSG);
    }
  }

  /**
   * Stores an OTP token.
   * @param data - The data for the OTP token.
   * @returns The response.
   */
  private async storeOtpToken(data: {
    token: string;
    cognitoSub: string;
    email: string;
    purpose: string;
    expiresAt: number;
  }): Promise<void> {
    try {
      await this.prisma.securityOtpToken.create({
        data: {
          token: data.token,
          cognitoSub: data.cognitoSub,
          email: data.email.toLowerCase(),
          purpose: data.purpose,
          expiresAt: data.expiresAt,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to store security OTP token: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(SECURITY_OTP_DB_ERROR_MSG);
    }
  }

  /**
   * Gets an OTP token.
   * @param token - The token for the OTP token.
   * @returns The response.
   */
  private async getOtpToken(token: string): Promise<{
    cognitoSub: string;
    purpose: string;
    expiresAt: number;
  } | null> {
    try {
      const row = await this.prisma.securityOtpToken.findUnique({
        where: { token },
      });
      if (!row) {
        return null;
      }
      return {
        cognitoSub: row.cognitoSub,
        purpose: row.purpose,
        expiresAt: row.expiresAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to look up security OTP token: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(SECURITY_OTP_DB_ERROR_MSG);
    }
  }

  /**
   * Deletes an OTP token.
   * @param token - The token for the OTP token.
   * @returns The response.
   */
  private async deleteOtpToken(token: string): Promise<void> {
    try {
      await this.prisma.securityOtpToken.deleteMany({ where: { token } });
    } catch (error) {
      this.logger.warn(
        `Failed to delete security OTP token (best-effort): ${(error as Error).message}`,
      );
    }
  }

  /**
   * Invalidates existing OTP tokens.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param purpose - The purpose of the OTP.
   * @returns The response.
   */
  private async invalidateExistingOtpTokens(
    cognitoSub: string,
    purpose: string,
  ): Promise<void> {
    try {
      await this.prisma.securityOtpToken.deleteMany({
        where: {
          cognitoSub,
          purpose,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to invalidate MFA OTP tokens for ${cognitoSub}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(SECURITY_OTP_DB_ERROR_MSG);
    }
  }

  /**
   * Sends an MFA OTP email.
   * @param email - The email for the authenticated user.
   * @param token - The token for the OTP.
   * @returns The response.
   */
  private async sendMfaOtpEmail(email: string, token: string): Promise<void> {
    const templateParams = {
      code: token,
    };

    await this.emailService.sendEmail({
      to: email,
      subject: VERIFICATION_CODE_SUBJECT,
      htmlBody: getVerificationCodeHtml(templateParams),
      textBody: getVerificationCodeText(templateParams),
    });
  }
}

/** Extracts Bearer access token from Authorization header (required for ChangePassword). */
export function extractBearerAccessToken(
  authorizationHeader: string | undefined,
): string {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Authorization token is missing');
  }
  const token = authorizationHeader.slice(7).trim();
  if (!token) {
    throw new UnauthorizedException('Authorization token is missing');
  }
  return token;
}
