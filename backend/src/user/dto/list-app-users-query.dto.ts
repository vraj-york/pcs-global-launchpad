import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsString,
  MaxLength,
  IsUUID,
  IsArray,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';

export const APP_USER_LIST_SORT_BY = [
  'userCode',
  'name',
  'status',
  'corporationName',
  'companyName',
  'roleName',
  'categoryName',
  'timezone',
  'createdAt',
] as const;
export type AppUserListSortBy = (typeof APP_USER_LIST_SORT_BY)[number];

export const APP_USER_LIST_SORT_ORDER = ['asc', 'desc'] as const;
export type AppUserListSortOrder = (typeof APP_USER_LIST_SORT_ORDER)[number];

function toUuidStringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const raw = Array.isArray(value) ? value : [value];
  const parts = raw
    .flatMap((v) => String(v).split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : undefined;
}

function toTrimmedStringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const raw = Array.isArray(value) ? value : [value];
  const parts = raw
    .flatMap((v) => String(v).split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : undefined;
}

/** List query: pagination, optional filters. */
export class ListAppUsersQueryDto {
  @ApiPropertyOptional({
    description:
      'Search: partial match on first_name, last_name, or email (case-insensitive). Two or more words also match first word in first_name and last word in last_name (e.g. "Jane Smith").',
    example: 'Jane Smith',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filter by one or more corporations.id (app_users.corporation_id). Repeat corporationIds or use a comma-separated list.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsOptional()
  @Transform(({ value }) => toUuidStringList(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  corporationIds?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by one or more corporation_companies.id via user_company_access.company_id. Users with at least one matching access row are returned. Repeat companyIds or use a comma-separated list.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsOptional()
  @Transform(({ value }) => toUuidStringList(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  companyIds?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by app_users.status (case-insensitive exact match). Special cases: `Expired` = runtime-expired pending invites only (not a stored value). `Pending` = DB Pending but excludes those runtime-expired rows. Omit for all statuses.',
    example: 'Pending',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  status?: string;

  @ApiPropertyOptional({
    description:
      'Filter by role category ID (role_categories.id). Only users with app_users.role_id set to a role in this category are returned.',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by app_users.timezone (exact match to stored value). Repeat timezones or use a comma-separated list.',
    type: [String],
    example: ['America/New_York', 'America/Chicago'],
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringList(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  timezones?: string[];

  @ApiPropertyOptional({
    description:
      'Sort by: userCode, name (first_name then last_name), status, corporationName (corporation legal name), companyName (earliest user_company_access company legal name), roleName, categoryName (role category), timezone, createdAt. Default: userCode.',
    enum: APP_USER_LIST_SORT_BY,
    default: 'userCode',
  })
  @IsOptional()
  @IsIn(APP_USER_LIST_SORT_BY)
  sortBy?: AppUserListSortBy = 'userCode';

  @ApiPropertyOptional({
    description: 'Sort direction. Default: asc.',
    enum: APP_USER_LIST_SORT_ORDER,
    default: 'asc',
  })
  @IsOptional()
  @IsIn(APP_USER_LIST_SORT_ORDER)
  sortOrder?: AppUserListSortOrder = 'asc';

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
}
