import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ApiResponse } from '../common';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';
import { SendAssessmentInviteDto } from './dto/send-assessment-invite.dto';
import { ListAssessmentInvitesQueryDto } from './dto/list-assessment-invites-query.dto';
import { InviteManagementListService } from './invite-management-list.service';
import {
  AssessmentInviteOptionsData,
  InviteManagementService,
} from './invite-management.service';

@ApiTags('Invite management')
@Controller('invite-management')
@UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
@ApiBearerAuth()
export class InviteManagementController {
  private readonly logger = new Logger(InviteManagementController.name);

  constructor(
    private readonly inviteManagementService: InviteManagementService,
    private readonly inviteManagementListService: InviteManagementListService,
  ) {}

  @Get('assessment-invites')
  @RequireSubmodule(SUBMODULE_KEYS.INVITE_MANAGEMENT_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List individual assessment invites',
    description:
      '**SuperAdmin only.** Paginated list of `user_type` individual + `invite_type` Assessment Only users with lifecycle status, progress, summary metrics, search, filters, and sorting.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Assessment invites list with summary metrics',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin or lacks submodule access',
  })
  async listAssessmentInvites(
    @Query() query: ListAssessmentInvitesQueryDto,
  ): Promise<ApiResponse> {
    try {
      return await this.inviteManagementListService.listAssessmentInvites(
        query,
      );
    } catch (error) {
      this.logger.error(
        `listAssessmentInvites failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  @Get('assessment-invite/options')
  @RequireSubmodule(SUBMODULE_KEYS.INVITE_MANAGEMENT_SEND)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assessment invite form options',
    description:
      '**SuperAdmin only.** Returns fixed assessment type, invoice amount from `STRIPE_ONE_TIME_PRICE_ID`, and eligible `one_time` promo codes for the Individual Assessment Stripe product.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Assessment invite options',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin or lacks submodule access',
  })
  @ApiNotFoundResponse({
    description: 'Individual assessment pricing is not configured',
  })
  async getAssessmentInviteOptions(): Promise<
    ApiResponse<AssessmentInviteOptionsData>
  > {
    try {
      return await this.inviteManagementService.getAssessmentInviteOptions();
    } catch (error) {
      this.logger.error(
        `getAssessmentInviteOptions failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  @Post('assessment-invites')
  @RequireSubmodule(SUBMODULE_KEYS.INVITE_MANAGEMENT_SEND)
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: SendAssessmentInviteDto })
  @ApiOperation({
    summary: 'Send individual assessment invite',
    description:
      '**SuperAdmin only.** Creates a Cognito user with `invite_type` Assessment Only and `user_type` individual, persists profile, optionally validates promo code, and sends invitation email.',
  })
  @SwaggerApiResponse({
    status: 201,
    description: 'Assessment invitation sent successfully',
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, duplicate email, missing promo, or invalid/expired promo',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin or lacks submodule access',
  })
  @ApiInternalServerErrorResponse({
    description: 'Provisioning or email failed',
  })
  async sendAssessmentInvite(
    @Body() body: SendAssessmentInviteDto,
  ): Promise<ApiResponse> {
    try {
      return await this.inviteManagementService.sendAssessmentInvite(body);
    } catch (error) {
      this.logger.error(
        `sendAssessmentInvite failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }
}
