import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';
import { CurrentUser } from '../auth/decorators';
import { type ApiResponse } from '../common';
import {
  AccountSecurityService,
  extractBearerAccessToken,
} from './account-security.service';
import type { SecurityStatusData } from './types';
import { ChangePasswordDto, VerifyMfaOtpDto } from './dto';

@ApiTags('Account security')
@Controller('users/me/security')
@UseGuards(CognitoAuthGuard, AuthorizationGuard)
@ApiBearerAuth()
export class AccountSecurityController {
  private readonly logger = new Logger(AccountSecurityController.name);

  constructor(
    private readonly accountSecurityService: AccountSecurityService,
  ) {}

  @Get()
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_SECURITY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user security settings',
    description:
      'Returns whether email MFA (2FA) is enabled and the registered email used for OTP delivery.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Security status fetched',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async getSecurityStatus(
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<ApiResponse<SecurityStatusData>> {
    try {
      return await this.accountSecurityService.getSecurityStatus(
        user.sub,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('getSecurityStatus', error);
      throw error;
    }
  }

  @Post('change-password')
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_SECURITY)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ChangePasswordDto })
  @ApiOperation({
    summary: 'Change password',
    description:
      'Updates the signed-in user password. Requires current password, new password, and matching confirmation. Uses the Cognito access token from the Authorization header.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Password updated' })
  @ApiBadRequestResponse({
    description:
      'Invalid current password, policy violation, or confirm mismatch',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async changePassword(
    @Headers('authorization') authorization: string | undefined,
    @CurrentUser() user: { sub: string; email?: string },
    @Body() body: ChangePasswordDto,
  ): Promise<ApiResponse> {
    try {
      const accessToken = extractBearerAccessToken(authorization);
      return await this.accountSecurityService.changePassword(
        accessToken,
        body,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('changePassword', error);
      throw error;
    }
  }

  @Post('mfa/enable/send-otp')
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_SECURITY)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({
    summary: 'Send MFA enable verification code',
    description:
      'Sends a one-time code to the user registered email to confirm enabling email two-factor authentication.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Verification code sent' })
  @ApiBadRequestResponse({
    description: 'MFA already enabled or missing email',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @ApiInternalServerErrorResponse({ description: 'Email delivery failed' })
  async sendMfaEnableOtp(
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<ApiResponse<{ email: string }>> {
    try {
      return await this.accountSecurityService.sendMfaEnableOtp(
        user.sub,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('sendMfaEnableOtp', error);
      throw error;
    }
  }

  @Post('mfa/enable/resend-otp')
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_SECURITY)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Resend MFA enable verification code',
    description:
      'Invalidates the previous code, sends a new OTP, and enforces an hourly resend limit.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Verification code resent' })
  @ApiBadRequestResponse({
    description: 'MFA already enabled, resend limit exceeded, or missing email',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async resendMfaEnableOtp(
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<ApiResponse<{ email: string }>> {
    try {
      return await this.accountSecurityService.resendMfaEnableOtp(
        user.sub,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('resendMfaEnableOtp', error);
      throw error;
    }
  }

  @Post('mfa/enable/verify')
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_SECURITY)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: VerifyMfaOtpDto })
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: 'Verify MFA enable OTP',
    description:
      'Validates the emailed code and enables email MFA on the Cognito user account.',
  })
  @SwaggerApiResponse({ status: 200, description: 'MFA enabled' })
  @ApiBadRequestResponse({
    description: 'Invalid or expired OTP, or MFA already enabled',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async verifyMfaEnableOtp(
    @CurrentUser() user: { sub: string; email?: string },
    @Body() body: VerifyMfaOtpDto,
  ): Promise<ApiResponse> {
    try {
      return await this.accountSecurityService.verifyMfaEnableOtp(
        user.sub,
        body,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('verifyMfaEnableOtp', error);
      throw error;
    }
  }

  @Post('mfa/disable/send-otp')
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_SECURITY)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({
    summary: 'Send MFA disable verification code',
    description:
      'Sends a one-time code to the registered email to confirm disabling email two-factor authentication.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Verification code sent' })
  @ApiBadRequestResponse({
    description: 'MFA not enabled or missing email',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @ApiInternalServerErrorResponse({ description: 'Email delivery failed' })
  async sendMfaDisableOtp(
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<ApiResponse<{ email: string }>> {
    try {
      return await this.accountSecurityService.sendMfaDisableOtp(
        user.sub,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('sendMfaDisableOtp', error);
      throw error;
    }
  }

  @Post('mfa/disable/resend-otp')
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_SECURITY)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Resend MFA disable verification code',
    description:
      'Invalidates the previous disable code, sends a new OTP, and enforces an hourly resend limit.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Verification code resent' })
  @ApiBadRequestResponse({
    description: 'MFA not enabled, resend limit exceeded, or missing email',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async resendMfaDisableOtp(
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<ApiResponse<{ email: string }>> {
    try {
      return await this.accountSecurityService.resendMfaDisableOtp(
        user.sub,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('resendMfaDisableOtp', error);
      throw error;
    }
  }

  @Post('mfa/disable/verify')
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_SECURITY)
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: VerifyMfaOtpDto })
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: 'Verify MFA disable OTP',
    description:
      'Validates the emailed code and disables email MFA on the Cognito user account.',
  })
  @SwaggerApiResponse({ status: 200, description: 'MFA disabled' })
  @ApiBadRequestResponse({
    description: 'Invalid or expired OTP, or MFA not enabled',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async verifyMfaDisableOtp(
    @CurrentUser() user: { sub: string; email?: string },
    @Body() body: VerifyMfaOtpDto,
  ): Promise<ApiResponse> {
    try {
      return await this.accountSecurityService.verifyMfaDisableOtp(
        user.sub,
        body,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('verifyMfaDisableOtp', error);
      throw error;
    }
  }

  private logEndpointError(endpoint: string, error: unknown): void {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`Error in ${endpoint}: ${errorMessage}`, errorStack);
  }
}
