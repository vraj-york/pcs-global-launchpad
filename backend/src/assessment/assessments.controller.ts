import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  CurrentUser,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';
import type { ApiResponse } from '../common';
import { AssessmentListService } from './assessment-list.service';
import { ListAssessmentsQueryDto } from './dto/list-assessments-query.dto';

@ApiTags('Assessments')
@Controller('assessments')
export class AssessmentsController {
  private readonly logger = new Logger(AssessmentsController.name);

  constructor(private readonly assessmentListService: AssessmentListService) {}

  @Get()
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ASSESSMENT_LIST)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List assessments (paginated)',
    description:
      'Returns a paginated list of the authenticated caller’s own assessments only (all roles). Query: page, limit, sortBy (default startedAt), sortOrder (default desc). sortBy options: assessmentName, startedAt, completedAt, status (complete vs incomplete). Optional status filter: complete (report_generated) or incomplete (in_progress, completed, scored). Optional timeFilter (last24Hours, last7Days, last30Days, last3Months, last6Months, lastYear) — status and timeFilter combine with AND; when timeFilter is set, an assessment matches if started_at or completed_at falls within the window (UTC). To list another user’s assessments, use GET `/assessments/users/:cognitoSub` (admin only). Each item includes uuid, assessmentName (e.g. "Assessment 1"), startedAt, completedAt, status (complete | incomplete), and reportKey.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Assessments fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - missing assessment.list_view permission',
  })
  @ApiNotFoundResponse({
    description:
      'Authenticated user is not provisioned in app_users (end-user path only)',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch assessments',
  })
  async list(
    @Query() query: ListAssessmentsQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.assessmentListService.findAllPaginatedForRequester(
        query,
        user.sub,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Error in assessments list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw err;
    }
  }

  @Get('users/:cognitoSub')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ASSESSMENT_LIST)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List assessments for a user (admin, paginated)',
    description:
      'Returns a paginated assessment list for the target app user. **SuperAdmin, CorporationAdmin, and CompanyAdmin only.** Users with no `user_company_access` row (individual assessment users) are **SuperAdmin only**; CorporationAdmin and CompanyAdmin cannot list their assessments. For company-linked users, scope matches GET `/users/:cognitoSub`. Query: page, limit, sortBy (default startedAt), sortOrder (default desc), optional status (complete | incomplete), optional timeFilter. Each item includes uuid, assessmentName (e.g. "Assessment 1"), startedAt, completedAt, status (complete | incomplete), and reportKey.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'User assessments fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin, or target user is outside their scope',
  })
  @ApiNotFoundResponse({
    description: 'Target user not found or is soft-deleted',
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to fetch assessments',
  })
  async listByUserId(
    @Param('cognitoSub') cognitoSub: string,
    @Query() query: ListAssessmentsQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.assessmentListService.listByUserIdForAdmin(
        cognitoSub,
        query,
        user.sub,
        user.groups ?? [],
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Error in assessments list-by-user endpoint (cognitoSub=${cognitoSub}): ${errorMessage}`,
        errorStack,
      );
      throw err;
    }
  }
}
