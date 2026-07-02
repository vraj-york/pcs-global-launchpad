import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const PROMO_CODE_LIST_SORT_BY = [
  'createdAt',
  'code',
  'planTypeName',
  'expiresAt',
  'discountType',
  'discount',
  'status',
  'usageLimit',
] as const;
export type PromoCodeListSortBy = (typeof PROMO_CODE_LIST_SORT_BY)[number];

export const PROMO_CODE_LIST_STATUS_FILTER = [
  'active',
  'inactive',
  'expired',
] as const;
export type PromoCodeListStatusFilter =
  (typeof PROMO_CODE_LIST_STATUS_FILTER)[number];

export const PROMO_CODE_LIST_SORT_ORDER = ['asc', 'desc'] as const;
export type PromoCodeListSortOrder =
  (typeof PROMO_CODE_LIST_SORT_ORDER)[number];

export const PROMO_CODE_LIST_DISCOUNT_FILTER = [
  'percent',
  'fixed_amount',
] as const;

function emptyToUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

/** Query params for GET /promo-codes (paginated Super Admin list). */
export class ListPromoCodesQueryDto {
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
    description: 'Page size (max 100)',
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
      'Sort field. `discount` orders by discount type, then percent off, then fixed minor amount.',
    enum: PROMO_CODE_LIST_SORT_BY,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(PROMO_CODE_LIST_SORT_BY)
  sortBy?: PromoCodeListSortBy = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: PROMO_CODE_LIST_SORT_ORDER,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(PROMO_CODE_LIST_SORT_ORDER)
  sortOrder?: PromoCodeListSortOrder = 'desc';

  @ApiPropertyOptional({
    description: 'Case-insensitive match on code or description (partial)',
    maxLength: 255,
  })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by plan type id' })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(64)
  planTypeId?: string;

  @ApiPropertyOptional({
    enum: PROMO_CODE_LIST_DISCOUNT_FILTER,
    description: 'Filter by discount type',
  })
  @IsOptional()
  @IsIn(PROMO_CODE_LIST_DISCOUNT_FILTER)
  discountType?: (typeof PROMO_CODE_LIST_DISCOUNT_FILTER)[number];

  @ApiPropertyOptional({
    enum: PROMO_CODE_LIST_STATUS_FILTER,
    description:
      'Filter by derived admin status (schedule-expired vs Stripe-disabled vs active).',
  })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsIn(PROMO_CODE_LIST_STATUS_FILTER)
  status?: PromoCodeListStatusFilter;

  @ApiPropertyOptional({
    description:
      'Include only promos created at or after this instant (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsISO8601()
  createdAfter?: string;
}
