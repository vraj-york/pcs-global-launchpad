import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import {
  TIME_RANGE_FILTER,
  type TimeRangeFilter,
} from '../../common/time-range-filter.util';

/** Optional scope and time window for Super Admin system analytics donut charts. */
export class SuperAdminSystemAnalyticsQueryDto {
  @ApiPropertyOptional({
    description:
      'Scope corporations, companies, and users to a single corporation. When combined with companyId, the company must belong to this corporation.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4')
  corporationId?: string;

  @ApiPropertyOptional({
    description:
      'Scope companies and users to a single company. Corporations are limited to the parent of this company.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID('4')
  companyId?: string;

  @ApiPropertyOptional({
    description:
      'Optional UTC time window. Active/incomplete corporations and companies match created_at; suspended/closed match suspended_closed_on. Active/pending users match created_at; blocked/cancelled match blocked_cancelled_on; expired uses the 7-day invite expiry rule; deleted matches deleted_at. Assessments: completed (report_generated) matches completed_at; in progress matches started_at; avgTimeToComplete matches completed_at. Omit for all-time counts.',
    enum: TIME_RANGE_FILTER,
    example: 'last7Days',
  })
  @IsOptional()
  @IsIn(TIME_RANGE_FILTER)
  timeFilter?: TimeRangeFilter;
}
