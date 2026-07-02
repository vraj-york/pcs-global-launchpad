import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ASSESSMENT_INVITE_LIST_SORT_BY,
  ASSESSMENT_INVITE_LIST_SORT_ORDER,
  ASSESSMENT_INVITE_LIST_STATUS_FILTER,
  type AssessmentInviteListSortBy,
  type AssessmentInviteListSortOrder,
  type AssessmentInviteListStatusFilter,
} from '../invite-management.constants';
import {
  INVITE_MANAGEMENT_TIME_FILTER,
  type InviteManagementTimeFilter,
} from '../../common/invite-time-filter.util';

export class ListAssessmentInvitesQueryDto {
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
    description: 'Search by name or email (case-insensitive substring)',
    example: 'jane',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description:
      'Lifecycle status: invited, in_progress, completed, or expired (pending invite past expiry with no started assessment).',
    enum: ASSESSMENT_INVITE_LIST_STATUS_FILTER,
  })
  @IsOptional()
  @IsIn(ASSESSMENT_INVITE_LIST_STATUS_FILTER)
  status?: AssessmentInviteListStatusFilter;

  @ApiPropertyOptional({
    description:
      'Filter by invitation date (`invitation_sent_at`, or `created_at` when invitation was not sent): thisWeek, lastWeek, thisMonth, lastMonth.',
    enum: INVITE_MANAGEMENT_TIME_FILTER,
  })
  @IsOptional()
  @IsIn(INVITE_MANAGEMENT_TIME_FILTER)
  timeFilter?: InviteManagementTimeFilter;

  @ApiPropertyOptional({
    description:
      'Sort by: name, inviteeType, status, progress, invitedOn, lastActivity. Default: invitedOn.',
    enum: ASSESSMENT_INVITE_LIST_SORT_BY,
    default: 'invitedOn',
  })
  @IsOptional()
  @IsIn(ASSESSMENT_INVITE_LIST_SORT_BY)
  sortBy?: AssessmentInviteListSortBy = 'invitedOn';

  @ApiPropertyOptional({
    description: 'Sort direction. Default: desc.',
    enum: ASSESSMENT_INVITE_LIST_SORT_ORDER,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(ASSESSMENT_INVITE_LIST_SORT_ORDER)
  sortOrder?: AssessmentInviteListSortOrder = 'desc';
}
