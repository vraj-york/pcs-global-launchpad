import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsIn,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CREATED_DATE_FILTER,
  CREATED_DATE_FILTER as CORPORATION_CREATED_FILTER,
  type CreatedDateFilter,
  type CreatedDateFilter as CorporationCreatedFilter,
} from '../../common/time-range-filter.util';

export {
  CREATED_DATE_FILTER as CORPORATION_CREATED_FILTER,
  type CreatedDateFilter as CorporationCreatedFilter,
};

export const CORPORATION_SORT_BY = [
  'corporationCode',
  'legalName',
  'status',
  'adminName',
  'companyCount',
  'createdAt',
] as const;
export type CorporationSortBy = (typeof CORPORATION_SORT_BY)[number];

export const CORPORATION_SORT_ORDER = ['asc', 'desc'] as const;
export type CorporationSortOrder = (typeof CORPORATION_SORT_ORDER)[number];

/** Filter by corporation status: all (default), or specific status (API accepts lowercase; DB stores uppercase) */
export const CORPORATION_STATUS_FILTER = [
  'all',
  'active',
  'incomplete',
  'suspended',
  'closed',
] as const;
export type CorporationStatusFilter =
  (typeof CORPORATION_STATUS_FILTER)[number];

export class ListCorporationQueryDto {
  @ApiPropertyOptional({
    description:
      'Search by corporation legal name or corporation admin name (first/last). Partial match, case-insensitive.',
    example: 'Acme',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

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
      'Sort by: corporationCode (corp code), legalName (corp legal name), status, adminName (corporation admin name), companyCount, createdAt (created date). Default: createdAt.',
    enum: CORPORATION_SORT_BY,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(CORPORATION_SORT_BY)
  sortBy?: CorporationSortBy = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction. Default: desc.',
    enum: CORPORATION_SORT_ORDER,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(CORPORATION_SORT_ORDER)
  sortOrder?: CorporationSortOrder = 'desc';

  @ApiPropertyOptional({
    description:
      'Filter by created date: last 24 hours, last 7 days, last 30 days, last 3 months, last 6 months, last year.',
    enum: CORPORATION_CREATED_FILTER,
  })
  @IsOptional()
  @IsIn(CORPORATION_CREATED_FILTER)
  createdFilter?: CorporationCreatedFilter;

  @ApiPropertyOptional({
    description:
      'Filter by corporation status. Default: all (no filter). Use active or incomplete (stored as uppercase in DB).',
    enum: CORPORATION_STATUS_FILTER,
    default: 'all',
  })
  @IsOptional()
  @IsIn(CORPORATION_STATUS_FILTER)
  status?: CorporationStatusFilter = 'all';
}
