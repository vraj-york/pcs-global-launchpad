import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  ASSESSMENT_LIST_SORT_BY,
  ASSESSMENT_LIST_SORT_ORDER,
  ASSESSMENT_LIST_STATUS_FILTER,
  type AssessmentListSortBy,
  type AssessmentListSortOrder,
  type AssessmentListStatusFilter,
} from '../assessment.constants';
import {
  TIME_RANGE_FILTER,
  type TimeRangeFilter,
} from '../../common/time-range-filter.util';

export class ListAssessmentsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description:
      'Filter assessments where started_at or completed_at falls within the window (UTC): last 24 hours, last 7 days, last 30 days, last 3 months, last 6 months, or last year. In-progress rows match when started_at is in range (completed_at may be null).',
    enum: TIME_RANGE_FILTER,
  })
  @IsOptional()
  @IsIn(TIME_RANGE_FILTER)
  timeFilter?: TimeRangeFilter;

  @ApiPropertyOptional({
    description:
      'Filter by display status: complete (report_generated) or incomplete (in_progress, completed, scored). Combines with timeFilter when both are sent (AND).',
    enum: ASSESSMENT_LIST_STATUS_FILTER,
    example: 'complete',
  })
  @IsOptional()
  @IsIn(ASSESSMENT_LIST_STATUS_FILTER)
  status?: AssessmentListStatusFilter;

  @ApiPropertyOptional({
    description:
      'Sort by: assessmentName (per-user index by started_at), startedAt, completedAt, status (complete vs incomplete). Default: startedAt.',
    enum: ASSESSMENT_LIST_SORT_BY,
    default: 'startedAt',
  })
  @IsOptional()
  @IsIn(ASSESSMENT_LIST_SORT_BY)
  sortBy?: AssessmentListSortBy = 'startedAt';

  @ApiPropertyOptional({
    description: 'Sort direction. Default: desc.',
    enum: ASSESSMENT_LIST_SORT_ORDER,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(ASSESSMENT_LIST_SORT_ORDER)
  sortOrder?: AssessmentListSortOrder = 'desc';
}

/** @deprecated Use {@link ListAssessmentsQueryDto}. */
export class ListAdminAssessmentsQueryDto extends ListAssessmentsQueryDto {}
