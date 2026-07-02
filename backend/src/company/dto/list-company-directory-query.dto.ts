import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  CREATED_DATE_FILTER,
  CREATED_DATE_FILTER as COMPANY_DIRECTORY_CREATED_FILTER,
  type CreatedDateFilter,
  type CreatedDateFilter as CompanyDirectoryCreatedFilter,
} from '../../common/time-range-filter.util';

export {
  CREATED_DATE_FILTER as COMPANY_DIRECTORY_CREATED_FILTER,
  type CreatedDateFilter as CompanyDirectoryCreatedFilter,
};

export const COMPANY_DIRECTORY_SORT_BY = [
  'companyCode',
  'legalName',
  'status',
  'corporationName',
  'plan',
  'createdAt',
  'updatedAt',
] as const;
export type CompanyDirectorySortBy = (typeof COMPANY_DIRECTORY_SORT_BY)[number];

export const COMPANY_DIRECTORY_SORT_ORDER = ['asc', 'desc'] as const;
export type CompanyDirectorySortOrder =
  (typeof COMPANY_DIRECTORY_SORT_ORDER)[number];

/** Filter by company status (company setup progress: INCOMPLETE, ACTIVE, SUSPENDED, CLOSED) */
export const COMPANY_DIRECTORY_STATUS_FILTER = [
  'all',
  'active',
  'incomplete',
  'suspended',
  'closed',
] as const;
export type CompanyDirectoryStatusFilter =
  (typeof COMPANY_DIRECTORY_STATUS_FILTER)[number];

export class ListCompanyDirectoryQueryDto {
  @ApiPropertyOptional({
    description:
      'Search by company name (legal name), company ID (e.g. COMP-001 or 1), or assigned corporation name. Partial match where applicable, case-insensitive.',
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
      'Sort by: companyCode, legalName, status (company status), corporationName, plan, createdAt, updatedAt. Default: createdAt.',
    enum: COMPANY_DIRECTORY_SORT_BY,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(COMPANY_DIRECTORY_SORT_BY)
  sortBy?: CompanyDirectorySortBy = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction. Default: desc.',
    enum: COMPANY_DIRECTORY_SORT_ORDER,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(COMPANY_DIRECTORY_SORT_ORDER)
  sortOrder?: CompanyDirectorySortOrder = 'desc';

  @ApiPropertyOptional({
    description:
      'Filter by created date: last 24 hours, last 7 days, last 30 days, etc.',
    enum: COMPANY_DIRECTORY_CREATED_FILTER,
  })
  @IsOptional()
  @IsIn(COMPANY_DIRECTORY_CREATED_FILTER)
  createdFilter?: CompanyDirectoryCreatedFilter;

  @ApiPropertyOptional({
    description: 'Filter by status (company status). Default: all.',
    enum: COMPANY_DIRECTORY_STATUS_FILTER,
    default: 'all',
  })
  @IsOptional()
  @IsIn(COMPANY_DIRECTORY_STATUS_FILTER)
  status?: CompanyDirectoryStatusFilter = 'all';

  @ApiPropertyOptional({
    description: 'Filter by assigned corporation ID',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  corporationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by plan type ID (plan_types.id, e.g. monthly, annual)',
    example: 'annual',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  planTypeId?: string;
}
