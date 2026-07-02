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

export const APP_KEY_CONTACT_LIST_SORT_BY = [
  'contactCode',
  'name',
  'corporationName',
  'companyName',
  'contactType',
  'jobRole',
  'timezone',
  'createdAt',
] as const;
export type AppKeyContactListSortBy =
  (typeof APP_KEY_CONTACT_LIST_SORT_BY)[number];

export const APP_KEY_CONTACT_LIST_SORT_ORDER = ['asc', 'desc'] as const;
export type AppKeyContactListSortOrder =
  (typeof APP_KEY_CONTACT_LIST_SORT_ORDER)[number];

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

/** Paginated list query for standalone app key contacts. */
export class ListAppKeyContactsQueryDto {
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
      'Single value: must match the `contact_type` key stored in the database (e.g. exec_sponsor). Case-insensitive equality.',
    example: 'exec_sponsor',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactType?: string;

  @ApiPropertyOptional({
    description:
      'Filter by one or more corporations.id (app_key_contacts.corporation_id). Repeat corporationIds or use a comma-separated list.',
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
      'Filter by one or more corporation_companies.id (app_key_contacts.company_id). Repeat companyIds or use a comma-separated list.',
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
      'Filter by app_key_contacts.timezone (exact match to stored value). Repeat timezones or use a comma-separated list.',
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
      'Sort by: contactCode, name (first_name then last_name), corporationName, companyName (corporation_companies.legal_name), contactType (stored contact_type key), jobRole, timezone, createdAt. Default: contactCode.',
    enum: APP_KEY_CONTACT_LIST_SORT_BY,
    default: 'contactCode',
  })
  @IsOptional()
  @IsIn(APP_KEY_CONTACT_LIST_SORT_BY)
  sortBy?: AppKeyContactListSortBy = 'contactCode';

  @ApiPropertyOptional({
    description: 'Sort direction. Default: asc.',
    enum: APP_KEY_CONTACT_LIST_SORT_ORDER,
    default: 'asc',
  })
  @IsOptional()
  @IsIn(APP_KEY_CONTACT_LIST_SORT_ORDER)
  sortOrder?: AppKeyContactListSortOrder = 'asc';

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
