import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PasswordResetService } from './password-reset.service';
import { RequestResetDto, ConfirmResetDto, ValidateResetDto } from './dto';
import { ApiResponse, ResponseHelper } from '../common';
import { PASSWORD_RESET_CODE_SENT_MSG } from './constants';
import {
  Auditable,
  AUDIT_DOMAINS,
  PASSWORD_RESET_AUDIT_EVENTS,
} from '../audit';

@ApiTags('Password Reset')
@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Auditable({
    domain: AUDIT_DOMAINS.PASSWORD_RESET,
    eventType: PASSWORD_RESET_AUDIT_EVENTS.RESET_REQUEST,
    entityIdBodyField: 'email',
  })
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Initiates password reset flow by sending a reset code to the user email',
  })
  @SwaggerApiResponse({
    status: 200,
    description:
      'Reset code sent (or message returned regardless of user existence)',
  })
  async requestReset(@Body() dto: RequestResetDto): Promise<ApiResponse> {
    try {
      return await this.passwordResetService.requestReset(dto);
    } catch {
      // Return success to prevent email enumeration attacks
      return ResponseHelper.success(PASSWORD_RESET_CODE_SENT_MSG);
    }
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Auditable({
    domain: AUDIT_DOMAINS.PASSWORD_RESET,
    eventType: PASSWORD_RESET_AUDIT_EVENTS.CODE_VALIDATED,
  })
  @ApiOperation({
    summary: 'Validate password reset code',
    description: 'Validates the reset code without changing the password',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Reset code is valid',
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Invalid or expired reset code',
  })
  async validateResetCode(@Body() dto: ValidateResetDto): Promise<ApiResponse> {
    return this.passwordResetService.validateResetCode(dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Auditable({
    domain: AUDIT_DOMAINS.PASSWORD_RESET,
    eventType: PASSWORD_RESET_AUDIT_EVENTS.RESET_COMPLETION,
  })
  @ApiOperation({
    summary: 'Confirm password reset',
    description: 'Validates the reset code and sets the new password',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Password successfully reset',
  })
  @SwaggerApiResponse({
    status: 400,
    description: 'Invalid or expired reset code',
  })
  async confirmReset(@Body() dto: ConfirmResetDto): Promise<ApiResponse> {
    return this.passwordResetService.confirmReset(dto);
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Auditable({
    domain: AUDIT_DOMAINS.PASSWORD_RESET,
    eventType: PASSWORD_RESET_AUDIT_EVENTS.RESET_REQUEST,
    entityIdBodyField: 'email',
  })
  @ApiOperation({
    summary: 'Resend password reset code',
    description: 'Generates a new reset code and sends it to the user email',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Reset code resent',
  })
  async resendResetCode(@Body() dto: RequestResetDto): Promise<ApiResponse> {
    try {
      return await this.passwordResetService.resendResetCode(dto);
    } catch {
      // Return success to prevent email enumeration attacks
      return ResponseHelper.success(PASSWORD_RESET_CODE_SENT_MSG);
    }
  }
}
