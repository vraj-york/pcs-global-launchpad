import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';
import { ApiResponse } from '../common';
import { ResponseHelper } from '../common/response.helper';
import {
  SUPER_ADMIN_SYSTEM_ANALYTICS_FETCH_FAILED_LOG,
  SUPER_ADMIN_SYSTEM_ANALYTICS_SUCCESS_MSG,
} from './constants/super-admin-dashboard.constants';
import { SuperAdminSystemAnalyticsQueryDto } from './dto/super-admin-system-analytics-query.dto';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';

export const SUPER_ADMIN_DASHBOARD_METRICS_SUCCESS_MSG =
  'Super Admin dashboard metrics fetched successfully.';

@ApiTags('Super Admin Dashboard')
@Controller('super-admin/dashboard')
export class SuperAdminDashboardController {
  private readonly logger = new Logger(SuperAdminDashboardController.name);

  constructor(private readonly dashboardService: SuperAdminDashboardService) {}

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.DASHBOARD)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Super Admin dashboard database metrics',
    description:
      'Aggregated tenant, user, and assessment KPIs for the Super Admin dashboard. Runs a single transaction with parallel counts and targeted raw SQL. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Metrics returned successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'SuperAdmin role required' })
  async getMetrics(): Promise<ApiResponse> {
    try {
      const data = await this.dashboardService.getMetrics();
      return ResponseHelper.success(
        SUPER_ADMIN_DASHBOARD_METRICS_SUCCESS_MSG,
        data,
      );
    } catch (err) {
      this.logger.error(
        `getMetrics failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  @Get('system-analytics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.DASHBOARD)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Super Admin system analytics status breakdowns',
    description:
      'Donut-chart aggregates for corporations, companies, and users by lifecycle status, plus assessment completed/in-progress counts and average completion time (days). Assessments: report_generated counts as completed (time window on completed_at); other statuses count as in progress (time window on started_at); avgTimeToComplete uses started_at and completed_at for rows with both timestamps (time window on completed_at). Optional query: corporationId, companyId, timeFilter (last24Hours, last7Days, last30Days, last3Months, last6Months, lastYear). Without timeFilter, all matching rows are counted. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'System analytics returned successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'SuperAdmin role required' })
  async getSystemAnalytics(
    @Query() query: SuperAdminSystemAnalyticsQueryDto,
  ): Promise<ApiResponse> {
    try {
      const data = await this.dashboardService.getSystemAnalytics(query);
      return ResponseHelper.success(
        SUPER_ADMIN_SYSTEM_ANALYTICS_SUCCESS_MSG,
        data,
      );
    } catch (err) {
      this.logger.error(
        `${SUPER_ADMIN_SYSTEM_ANALYTICS_FETCH_FAILED_LOG}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }
}
