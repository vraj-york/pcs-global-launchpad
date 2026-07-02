import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Param,
  ParseUUIDPipe,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Logger,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { AppUserService } from './app-user.service';
import { GrowthSparkService } from './growth-spark.service';
import {
  InviteAppUserDto,
  ListAppUsersQueryDto,
  ListPeerMentionsQueryDto,
  ResolvePeerMentionsDto,
  SetAppUserBlockDto,
  UpdateMyOnboardingStepDto,
  UpdateMyProfileDto,
  UpdateAppUserDto,
} from './dto';
import { type ApiResponse } from '../common';
import { ResponseHelper } from '../common/response.helper';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';
import { MonthlyPlanGuard } from '../auth/guards/monthly-plan.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { USER_DASHBOARD_SUCCESS_MSG } from './constants/user-dashboard.constants';
import {
  APP_USER_BULK_CSV_MAX_BYTES,
  APP_USER_BULK_CSV_MISSING_FILE_MSG,
  APP_USER_BULK_CSV_SIZE_REJECT_MSG,
  APP_USER_BULK_CSV_TYPE_REJECT_MSG,
  APP_USER_BULK_CSV_MIME_ALLOWLIST,
  APP_USER_BULK_FILE_FIELD,
} from './constants/app-user-bulk-csv.constants';
import { APP_USER_BULK_INVITE_JOB_ENQUEUE_ERROR_LOG_MSG } from './constants/app-user-bulk-job.constants';
import {
  APP_USER_AVATAR_FILE_FIELD,
  APP_USER_AVATAR_MAX_SIZE_BYTES,
} from './constants/app-user-avatar.constants';
import {
  APP_USER_AVATAR_FILE_REQUIRED_MSG,
  APP_USER_AVATAR_SINGLE_FILE_ONLY_MSG,
} from './constants/app-user.constants';
import type { Request } from 'express';

@ApiTags('App users')
@Controller('users')
export class AppUserController {
  private readonly logger = new Logger(AppUserController.name);

  constructor(
    private readonly appUserService: AppUserService,
    private readonly growthSparkService: GrowthSparkService,
  ) {}

  @Post('invite')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_INVITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiBody({ type: InviteAppUserDto })
  @ApiOperation({
    summary: 'Invite user',
    description:
      'Creates a Cognito user in the `User` group, persists profile and (for BSPBlueprint) company access and role, and sends invitation email. Duplicate emails are rejected. For BSPBlueprint, validates company seat capacity against the company pricing plan. **SuperAdmin:** any invite. **CorporationAdmin** / **CompanyAdmin:** BSPBlueprint invites must use corporation and company within their scope; Assessment Only invites are not corp/company scoped.',
  })
  @SwaggerApiResponse({
    status: 201,
    description: 'User invited successfully',
  })
  @ApiBadRequestResponse({
    description:
      'Validation error, duplicate email, seat limit exceeded, or invalid role',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or BSPBlueprint corporation/company is outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Provisioning or email failed',
  })
  async invite(
    @Body() body: InviteAppUserDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.inviteAppUserForRequester(
        body,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in invite user endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post('invite/bulk')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_BULK_UPLOAD)
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor(APP_USER_BULK_FILE_FIELD, {
      storage: memoryStorage(),
      limits: { fileSize: APP_USER_BULK_CSV_MAX_BYTES },
      fileFilter: (
        _req: Express.Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
          return cb(
            new BadRequestException(APP_USER_BULK_CSV_TYPE_REJECT_MSG),
            false,
          );
        }
        const mt = (file.mimetype || '').toLowerCase();
        if (!APP_USER_BULK_CSV_MIME_ALLOWLIST.includes(mt)) {
          return cb(
            new BadRequestException(APP_USER_BULK_CSV_TYPE_REJECT_MSG),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Single UTF-8 CSV (`file` field, max 1 MB). Required headers: firstName, lastName, email, workPhone, timezone, inviteType. Optional: cellPhone, nickname. For each row with inviteType BSPBlueprint, corporationName, companyName, roleName, and categoryName must all be non-empty (include those columns in the file). Assessment Only rows may omit or leave those columns blank. Same invite rules as POST /users/invite.',
    schema: {
      type: 'object',
      required: [APP_USER_BULK_FILE_FIELD],
      properties: {
        [APP_USER_BULK_FILE_FIELD]: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Bulk invite users from CSV (async)',
    description:
      '**SuperAdmin**, **CorporationAdmin**, and **CompanyAdmin** only. Accepts a UTF-8 CSV in the `file` field (max 1 MB), stores a background job, and returns **202** with `data.jobId` immediately. Processing runs in-process after the response; poll **GET /users/invite/bulk/jobs/:jobId** until `status` is `completed` or `failed`. After **all rows are processed** (`completed`), if **any** row failed, the admin receives **one** email with **one** CSV listing every failed row (`row`, `email`, `message`). No email when every row succeeds or when the job fails before completion (e.g. invalid CSV headers). Rows with inviteType BSPBlueprint must have non-empty corporationName, companyName, roleName, and categoryName.',
  })
  @SwaggerApiResponse({
    status: 202,
    description:
      'Job accepted; poll GET /users/invite/bulk/jobs/:jobId with returned jobId',
  })
  @ApiBadRequestResponse({
    description: 'Invalid file, wrong type, size, or bad CSV header',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected error while processing bulk CSV invites',
  })
  async bulkInviteFromCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { sub: string; email?: string; groups: string[] },
  ): Promise<ApiResponse> {
    if (!file?.buffer) {
      throw new BadRequestException(APP_USER_BULK_CSV_MISSING_FILE_MSG);
    }
    if (file.size > APP_USER_BULK_CSV_MAX_BYTES) {
      throw new BadRequestException(APP_USER_BULK_CSV_SIZE_REJECT_MSG);
    }
    try {
      return await this.appUserService.enqueueBulkInviteCsvJob(
        file,
        user.sub,
        user.email,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `${APP_USER_BULK_INVITE_JOB_ENQUEUE_ERROR_LOG_MSG}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('invite/bulk/jobs/:jobId')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_BULK_UPLOAD)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiParam({
    name: 'jobId',
    description: 'Job id returned from POST /users/invite/bulk',
    format: 'uuid',
  })
  @ApiOperation({
    summary: 'Get bulk invite CSV job status',
    description:
      'Returns status for a job created by POST /users/invite/bulk. **SuperAdmin**, **CorporationAdmin**, and **CompanyAdmin** may poll any job by id. When `status` is `completed`, `data.result` lists per-row outcomes; when `failed`, see `data.errorMessage`.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Job record (pending, processing, completed, or failed)',
  })
  @ApiNotFoundResponse({ description: 'Job id not found' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin',
  })
  async getBulkInviteJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.getBulkInviteJobForRequester(
        jobId,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in bulk invite job status endpoint (jobId=${jobId}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':cognitoSub/block')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_BLOCK)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({ type: SetAppUserBlockDto })
  @ApiOperation({
    summary: 'Block or unblock app user',
    description:
      'Updates `app_users.status`: `blocked: true` sets status to Blocked; `blocked: false` sets status to Active. Soft-deleted users are not found. Users with `user_type` super_admin cannot be blocked or unblocked. **SuperAdmin:** any other user. **CorporationAdmin:** only users under their linked corporation (same scope as GET `/users`). **CompanyAdmin:** only users with access to companies where they have admin `user_company_access`.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Block status updated successfully',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target user is outside their scope',
  })
  @ApiBadRequestResponse({
    description:
      'Target user is a Super Admin (`user_type` super_admin), or belongs to a suspended corporation or company; reinstate the organization first',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to update block status',
  })
  async setBlockStatus(
    @Param('cognitoSub') cognitoSub: string,
    @Body() body: SetAppUserBlockDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.setBlockedStatusForRequester(
        cognitoSub,
        body,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in app user block endpoint (cognitoSub=${cognitoSub}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':cognitoSub/invitation/cancel')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_CANCEL_INVITATION)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel pending user invitation',
    description:
      'Sets `app_users.status` to Cancelled for a user whose invitation is still Pending. If status is already Cancelled, succeeds with no further change. Soft-deleted users are not found; non-Pending users (e.g. Expired, Active) return 400. **SuperAdmin:** any user. **CorporationAdmin:** only users under their linked corporation (same scope as GET `/users`). **CompanyAdmin:** only users with access to companies where they have admin `user_company_access`.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Invitation canceled or already Cancelled',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({
    description: 'User is not in Pending status (e.g. already Active)',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target user is outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to cancel invitation',
  })
  async cancelInvitation(
    @Param('cognitoSub') cognitoSub: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.cancelInvitationForRequester(
        cognitoSub,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in cancel invitation endpoint (cognitoSub=${cognitoSub}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post(':cognitoSub/invitation/resend')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_RESEND_INVITE)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resend pending user invitation email',
    description:
      'Resends the invitation email for an existing user only when `app_users.status` is Pending. This endpoint does not create/recreate the user and only sends the email flow again. **SuperAdmin:** any user. **CorporationAdmin:** only users under their linked corporation (same scope as GET `/users`). **CompanyAdmin:** only users with access to companies where they have admin `user_company_access`.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Invitation email resent successfully',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({
    description: 'User is not in Pending status or has no email',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target user is outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to resend invitation email',
  })
  async resendInvitation(
    @Param('cognitoSub') cognitoSub: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.resendInvitationForRequester(
        cognitoSub,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in resend invitation endpoint (cognitoSub=${cognitoSub}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':cognitoSub')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({ type: UpdateAppUserDto })
  @ApiOperation({
    summary: 'Update app user',
    description:
      'Updates only: status, firstName, lastName, nickname, workPhone, cellPhone, timezone, roleId. Omit fields you are not changing; send `roleId: null` to clear the role (not allowed if current role is Corporation Admin or Company Admin). Users whose current role is Corporation Admin or Company Admin cannot change `roleId`. Users with any other role (or no role) cannot assign Corporation Admin or Company Admin via this endpoint. When a non-deleted `app_key_contacts` row exists with `app_user_id` = this user, firstName, lastName, nickname, workPhone, cellPhone, and timezone are mirrored there. Changing status to Active enables the Cognito user; to Blocked or Expired disables them. Users with `user_type` super_admin cannot be updated. **SuperAdmin:** any other user. **CorporationAdmin:** only users under their linked corporation (same scope as GET `/users`). **CompanyAdmin:** only users with access to companies where they have admin `user_company_access`.',
  })
  @SwaggerApiResponse({
    status: 200,
    description:
      'User updated successfully (same shape as GET user detail, including roleId)',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({
    description:
      'Empty body, invalid role id, validation error, target is a Super Admin (`user_type` super_admin), or setting status to Active while corporation or company is suspended',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target user is outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to update user',
  })
  async update(
    @Param('cognitoSub') cognitoSub: string,
    @Body() body: UpdateAppUserDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.updateForRequester(
        cognitoSub,
        body,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in app user update endpoint (cognitoSub=${cognitoSub}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Delete(':cognitoSub')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_REMOVE)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft-delete app user',
    description:
      'Sets `app_users.deleted_at`, removes all `app_user_group_memberships` rows for the user, removes the Cognito user from each mirrored pool group, then deletes the Cognito user from the user pool (pool username is the user email). Cognito is updated before the DB. Users with `user_type` super_admin cannot be deleted. Users whose role is Corporation Admin or Company Admin cannot be deleted (400). **SuperAdmin:** any other user. **CorporationAdmin:** only users under their linked corporation (same scope as GET `/users`). **CompanyAdmin:** only users with access to companies where they have admin `user_company_access`.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'User soft-deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({
    description:
      'Target user is a Super Admin (`user_type` super_admin), or is Corporation Admin or Company Admin and cannot be removed',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target user is outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to soft-delete user',
  })
  async softDelete(
    @Param('cognitoSub') cognitoSub: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.softDeleteForRequester(
        cognitoSub,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in app user soft-delete endpoint (cognitoSub=${cognitoSub}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get()
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List app users (paginated)',
    description:
      'Returns a paginated list from app_users (excludes soft-deleted users, users with user_type super_admin or individual, and the authenticated caller). Query parameters: page, limit, sortBy (default userCode), sortOrder (default asc). sortBy options: userCode, name (first_name then last_name), status, corporationName, companyName (earliest user_company_access company legal name), roleName, categoryName, timezone, createdAt. Optional search (partial match on first_name, last_name, email; with two+ words, also matches first token on first_name and last token on last_name), optional status, categoryId, corporationIds, companyIds, timezones. **SuperAdmin:** full list. **CorporationAdmin:** users under their linked corporation (`corporationIds` / `companyIds` must stay within that corporation) plus corporation-scoped Assessment Only users. **CompanyAdmin:** users with access to companies where they have admin `user_company_access` plus corporation-scoped Assessment Only users. Super Admin individual assessment invites (`user_type` individual) are excluded from all scopes. Each row includes corporation, optional role and category, work phone, timezone, created date, user code, email, Cognito sub, and at most one company (earliest user_company_access link) with name and parent corporation data_residency_region as region when the company is not deleted.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'App users fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or requested filters are outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch app users',
  })
  async list(
    @Query() query: ListAppUsersQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.findAllPaginatedForRequester(
        query,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in app users list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('me/dashboard')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.DASHBOARD)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User dashboard (success only)',
    description:
      'Any authenticated Cognito user. Returns `success: true` and a message; no `data` payload. Intended for the end-user dashboard shell to confirm the session is valid.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: '{ success: true, message: string }',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  getDashboard(): ApiResponse {
    return ResponseHelper.success(USER_DASHBOARD_SUCCESS_MSG);
  }

  @Get('me/peer-mentions')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard, MonthlyPlanGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ASSESSMENT_VIEW_RESULT)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  // 30 autocomplete calls per minute per user — generous for typing bursts.
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({
    summary: 'Peer mention autocomplete',
    description:
      'Returns active, non-admin peers from the authenticated user’s companies for chatbot @mention autocomplete. Excludes the current user and company admins.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Peer mention suggestions fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch peer mention suggestions',
  })
  async listPeerMentions(
    @CurrentUser() user: { sub: string },
    @Query() query: ListPeerMentionsQueryDto,
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.listPeerMentions(user.sub, query);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in peer mention autocomplete endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post('me/peer-mentions/resolve')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard, MonthlyPlanGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ASSESSMENT_VIEW_RESULT)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  // 20 resolves per minute — each resolve triggers an LLM call in the chatbot.
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiBody({ type: ResolvePeerMentionsDto })
  @ApiOperation({
    summary: 'Resolve peer mentions for chatbot context',
    description:
      'Re-validates selected peer IDs against the authenticated user’s company access and returns compact BSP summaries for chatbot grounding. Hidden or inaccessible peers are silently degraded.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Peer mentions resolved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to resolve peer mentions',
  })
  async resolvePeerMentions(
    @CurrentUser() user: { sub: string },
    @Body() body: ResolvePeerMentionsDto,
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.resolvePeerMentions(user.sub, body);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in peer mention resolve endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('me/chatbot/personalization-context')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard, MonthlyPlanGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ASSESSMENT_VIEW_RESULT)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({
    summary: 'Chatbot personalization context for current user',
    description:
      'Returns a compact BSP behavioral summary and role metadata for the authenticated user. Used by the chatbot service to tailor responses without exposing raw assessment scores.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Chatbot personalization context fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiNotFoundResponse({
    description: 'Current user not found in app_users',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch chatbot personalization context',
  })
  async getMyChatbotPersonalizationContext(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.getMyChatbotPersonalizationContext(
        user.sub,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in chatbot personalization context endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('me/peer-snapshot')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard, MonthlyPlanGuard)
  @RequireSubmodule(SUBMODULE_KEYS.DASHBOARD)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({
    summary: 'Peers snapshot for dashboard',
    description:
      'Returns active, non-admin peers from the authenticated user’s companies who have a latest report-generated assessment with overall BSP style metadata. Monthly plan only. Excludes the current user and company admins.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Peer snapshot fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Monthly plan subscription required',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch peer snapshot',
  })
  async getMyPeerSnapshot(
    @CurrentUser() user: { sub: string },
    @Query() query: ListPeerMentionsQueryDto,
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.getMyPeerSnapshot(user.sub, query);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in peer snapshot endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('me/growth-spark')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard, MonthlyPlanGuard)
  @RequireSubmodule(SUBMODULE_KEYS.DASHBOARD)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({
    summary: 'Daily Growth Spark for dashboard',
    description:
      'Returns day-one style-based template content or calls the chatbot service for daily LLM-generated Growth Spark copy.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Growth Spark content fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiNotFoundResponse({
    description:
      'No report-ready assessment or Growth Spark template for the user style',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch Growth Spark content',
  })
  async getMyGrowthSpark(
    @CurrentUser() user: { sub: string },
    @Req() request: Request,
  ): Promise<ApiResponse> {
    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;
    if (!accessToken) {
      throw new UnauthorizedException('Authentication required.');
    }

    try {
      return await this.growthSparkService.getMyGrowthSpark(
        user.sub,
        accessToken,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in Growth Spark endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('me/profile')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Current user profile',
    description:
      'Returns profile fields for the authenticated user: corporationId (app_users.corporation_id), companyId (first user_company_access.company_id on a non-deleted company, same ordering as companyName), fname, lname, email, workphoneno, status, id, onboardingsteps, assessmentCompletionCount (assessments with report_generated status for this user), corporation, companyName, roleName, jobRole (app_users.job_role), user_type, invite_type, nickname, cellphone, category, timezone, usercode.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Current user profile fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiNotFoundResponse({
    description: 'Current user not found in app_users',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch current user profile',
  })
  async getMyProfile(
    @CurrentUser() user: { sub: string; groups?: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.getMyProfile(
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in current user profile endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('me/subscription-access')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @ApiOperation({
    summary: 'Current user subscription access context',
    description:
      "Returns the subscription status and plan type for the authenticated user's primary company. Used by the frontend to enforce plan-level feature gating. Always accessible regardless of subscription status so the client can show appropriate upgrade/payment prompts.",
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Subscription access context returned',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async getMySubscriptionAccess(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.getMySubscriptionAccess(user.sub);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in subscription access endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch('me/profile')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_PROFILE)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({ type: UpdateMyProfileDto })
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Updates only nickname, work phone, cell phone, and timezone for the authenticated user. Omit fields you are not changing. When a linked non-deleted app key contact exists for this user, the same four fields are mirrored there.',
  })
  @SwaggerApiResponse({
    status: 200,
    description:
      'Profile fields updated; response `data` includes cognitoSub, nickname, workPhone, cellPhone, timezone',
  })
  @ApiBadRequestResponse({
    description: 'No updatable fields were sent',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiNotFoundResponse({
    description: 'Current user not found in app_users',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to update current user profile',
  })
  async updateMyProfile(
    @CurrentUser() user: { sub: string },
    @Body() body: UpdateMyProfileDto,
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.updateMyProfile(user.sub, body);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in update current user profile endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch('me/avatar')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_PROFILE)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor(APP_USER_AVATAR_FILE_FIELD, 10, {
      limits: { fileSize: APP_USER_AVATAR_MAX_SIZE_BYTES },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [APP_USER_AVATAR_FILE_FIELD],
      properties: {
        [APP_USER_AVATAR_FILE_FIELD]: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (PNG or JPG, max 10 MB)',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload current user avatar',
    description:
      'Uploads an avatar for the authenticated user. Allowed: PNG or JPG. Max size: 10 MB. Stored in S3 under app-user-avatars/. If an avatar already exists, it is replaced.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Avatar uploaded successfully.',
        },
        data: {
          type: 'object',
          properties: {
            avatar: {
              type: 'string',
              example:
                'https://bsp-blueprint-dev-frontend.s3.us-east-1.amazonaws.com/app-user-avatars/550e8400-e29b-41d4-a716-446655440000.png',
              description: 'Full public URL of the uploaded avatar',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Missing file, invalid type, file too large, or multiple files',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiNotFoundResponse({
    description: 'Current user not found in app_users',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to upload avatar',
  })
  async uploadMyAvatar(
    @CurrentUser() user: { sub: string },
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ApiResponse> {
    if (!files?.length) {
      throw new BadRequestException(APP_USER_AVATAR_FILE_REQUIRED_MSG);
    }
    if (files.length > 1) {
      throw new BadRequestException(APP_USER_AVATAR_SINGLE_FILE_ONLY_MSG);
    }
    try {
      return await this.appUserService.uploadMyAvatar(user.sub, files[0]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in upload current user avatar endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Delete('me/avatar')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_PROFILE)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete current user avatar',
    description:
      'Deletes the avatar for the authenticated user. Removes the file from S3 and clears the avatar reference. Idempotent if no avatar exists.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Avatar deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Avatar deleted successfully.',
        },
        data: { type: 'object', nullable: true },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiNotFoundResponse({
    description: 'Current user not found in app_users',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to delete avatar',
  })
  async deleteMyAvatar(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.deleteMyAvatar(user.sub);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in delete current user avatar endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch('me/onboarding-steps')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.SETTINGS_PROFILE)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiBody({ type: UpdateMyOnboardingStepDto })
  @ApiOperation({
    summary: 'Update onboarding step (current user)',
    description:
      'Updates `app_users.completed_onboarding_steps` for the authenticated user. Request `type`: consent -> 1, intro_video -> 2.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Onboarding step updated',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiNotFoundResponse({
    description: 'Current user not found in app_users',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to update onboarding step',
  })
  async updateMyOnboardingStep(
    @CurrentUser() user: { sub: string },
    @Body() body: UpdateMyOnboardingStepDto,
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.updateMyOnboardingStep(user.sub, body);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in update onboarding step endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('me/analytics-context')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.DASHBOARD)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Analytics context for PostHog (current user)',
    description:
      'Returns corporation id, linked company ids, invite type, and B2C assessment-only flag for the authenticated Cognito user. Used by the web app to attach PostHog group analytics; omit PII.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Analytics context payload in `data`',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to load analytics context',
  })
  async getAnalyticsContext(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.getAnalyticsContextForSelf(user.sub);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in analytics context endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get(':cognitoSub')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.USER_DIRECTORY_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get app user by Cognito sub',
    description:
      'Returns one app user for the User Directory detail view: cognitoSub, userCode (numeric; display formatting is client-side), status, firstName, lastName (raw stored values), nickname, email, work and cell phone, personal timezone, createdOn, corporation (legalName, corporationCode only), company from earliest user_company_access (legalName only), category (role category name), roleName, roleId, categoryId (from the linked `roles` row; mirrors `role.category_id`), and inviteType (`app_users.invite_type`). Excludes team and team manager. Soft-deleted users are not returned. **SuperAdmin:** any user. **CorporationAdmin:** only users under their linked corporation (same scope as GET `/users`). **CompanyAdmin:** only users with access to companies where they have admin `user_company_access`.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'User details fetched successfully',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target user is outside their scope',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch user details',
  })
  async getByCognitoSub(
    @Param('cognitoSub') cognitoSub: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.appUserService.findByCognitoSubForRequester(
        cognitoSub,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in app user view endpoint (cognitoSub=${cognitoSub}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
