import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const OUTCOMES = ['all', 'success', 'failed'] as const;
const TIME_WINDOWS = ['all', '7d', '30d', '90d', '1y'] as const;
const SORT_BY = [
  'occurredAt',
  'userDisplayName',
  'outcome',
  'corporationName',
  'companyName',
] as const;

export type PromoUsageOutcomeFilter = (typeof OUTCOMES)[number];
export type PromoUsageTimeFilter = (typeof TIME_WINDOWS)[number];
export type PromoUsageSortBy = (typeof SORT_BY)[number];

export class ListPromoCodeUsageQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description:
      'Case-insensitive match on user name/email or corporation/company labels.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: OUTCOMES })
  @IsOptional()
  @IsIn([...OUTCOMES])
  outcome?: PromoUsageOutcomeFilter;

  @ApiPropertyOptional({
    description: 'Filter by corporation UUID stored on the usage row.',
  })
  @IsOptional()
  @IsUUID()
  corporationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by company UUID stored on the usage row.',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ enum: TIME_WINDOWS })
  @IsOptional()
  @IsIn([...TIME_WINDOWS])
  time?: PromoUsageTimeFilter;

  @ApiPropertyOptional({ enum: SORT_BY })
  @IsOptional()
  @IsIn([...SORT_BY])
  sortBy?: PromoUsageSortBy;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
