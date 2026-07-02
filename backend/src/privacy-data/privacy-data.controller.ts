import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';
import { CurrentUser } from '../auth/decorators';
import { type ApiResponse } from '../common';
import { VerifyDataDownloadOtpDto } from './dto';
import { PrivacyDataService } from './privacy-data.service';

@ApiTags('Privacy & Data')
@Controller()
export class PrivacyDataController {
  private readonly logger = new Logger(PrivacyDataController.name);

  constructor(private readonly privacyDataService: PrivacyDataService) {}

  @Post('users/me/privacy/data-export/send-otp')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_PRIVACY)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({
    summary: 'Send data download verification code',
    description:
      'Initiates the Download My Data flow by emailing a one-time verification code to the registered address.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Verification code sent' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @ApiInternalServerErrorResponse({ description: 'Email delivery failed' })
  async sendDataDownloadOtp(
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<ApiResponse<{ email: string }>> {
    try {
      return await this.privacyDataService.sendDataDownloadOtp(
        user.sub,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('sendDataDownloadOtp', error);
      throw error;
    }
  }

  @Post('users/me/privacy/data-export/resend-otp')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_PRIVACY)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Resend data download verification code',
    description:
      'Invalidates the previous code, sends a new OTP, and enforces an hourly resend limit.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Verification code resent' })
  @ApiBadRequestResponse({ description: 'Resend limit exceeded' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async resendDataDownloadOtp(
    @CurrentUser() user: { sub: string; email?: string },
  ): Promise<ApiResponse<{ email: string }>> {
    try {
      return await this.privacyDataService.resendDataDownloadOtp(
        user.sub,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('resendDataDownloadOtp', error);
      throw error;
    }
  }

  @Post('users/me/privacy/data-export/verify')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_PRIVACY)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: 'Verify OTP and submit data download request',
    description:
      'Validates the emailed verification code and queues a personal data export for the authenticated user.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Data download request submitted',
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired OTP, or request already in progress',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async verifyAndSubmitDataExportRequest(
    @CurrentUser() user: { sub: string; email?: string },
    @Body() body: VerifyDataDownloadOtpDto,
  ): Promise<ApiResponse> {
    try {
      return await this.privacyDataService.verifyAndSubmitDataExportRequest(
        user.sub,
        body,
        user.email,
      );
    } catch (error) {
      this.logEndpointError('verifyAndSubmitDataExportRequest', error);
      throw error;
    }
  }

  @Get('privacy/data-export/download/:token')
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({
    summary: 'Download exported user data (public token link)',
    description:
      'Validates a single-use download token from the ready email and redirects to a short-lived S3 presigned URL. Link expires after 72 hours or first download.',
  })
  @SwaggerApiResponse({
    status: 302,
    description: 'Redirect to S3 download URL',
  })
  @ApiBadRequestResponse({
    description: 'Expired or already-used download link',
  })
  @ApiNotFoundResponse({ description: 'Invalid download link' })
  async downloadExportedData(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const presignedUrl =
        await this.privacyDataService.resolveDownloadRedirect(token);
      res.redirect(HttpStatus.FOUND, presignedUrl);
    } catch (error) {
      this.logEndpointError('downloadExportedData', error);
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
