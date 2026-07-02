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

const BILLING_SUBSCRIPTION_STATUS_FILTERS = [
  'all',
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
  'unpaid',
  'none',
] as const;

const BILLING_PAYMENT_STATUS_FILTERS = [
  'all',
  'paid',
  'failed',
  'pending',
] as const;
const BILLING_SORT_BY = [
  'billingId',
  'companyName',
  'planLabel',
  'billingCycle',
  'subscriptionStatus',
  'renewalDate',
  'paymentStatus',
  'nextBillingAmount',
  'paymentType',
] as const;
const BILLING_SORT_ORDER = ['asc', 'desc'] as const;
const BILLING_TIME_PERIOD_OPTIONS = [
  '1h',
  '7d',
  '30d',
  '3m',
  '6m',
  '1y',
] as const;

export type BillingSubscriptionStatusFilter =
  (typeof BILLING_SUBSCRIPTION_STATUS_FILTERS)[number];

export type BillingPaymentStatusFilter =
  (typeof BILLING_PAYMENT_STATUS_FILTERS)[number];
export type BillingSortBy = (typeof BILLING_SORT_BY)[number];
export type BillingSortOrder = (typeof BILLING_SORT_ORDER)[number];
export type BillingTimePeriod = (typeof BILLING_TIME_PERIOD_OPTIONS)[number];

export class ListBillingRecordsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Filter by assigned plan type id.' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  planTypeId?: string;

  @ApiPropertyOptional({
    enum: BILLING_SUBSCRIPTION_STATUS_FILTERS,
    description: 'Normalized subscription status from Stripe / company row.',
  })
  @IsOptional()
  @IsIn(BILLING_SUBSCRIPTION_STATUS_FILTERS)
  subscriptionStatus: BillingSubscriptionStatusFilter = 'all';

  @ApiPropertyOptional({
    enum: BILLING_PAYMENT_STATUS_FILTERS,
    description: 'Derived from latest subscription invoice when available.',
  })
  @IsOptional()
  @IsIn(BILLING_PAYMENT_STATUS_FILTERS)
  paymentStatus: BillingPaymentStatusFilter = 'all';

  @ApiPropertyOptional({
    description: 'Search by company legal name or DBA.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated cycle ids: monthly,annual,one_time',
    example: 'monthly,annual',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  billingCycles?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated payment types: ach,cc,offline',
    example: 'ach,cc',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  paymentTypes?: string;

  @ApiPropertyOptional({
    enum: BILLING_TIME_PERIOD_OPTIONS,
    description: 'Relative window for renewal date filtering.',
  })
  @IsOptional()
  @IsIn(BILLING_TIME_PERIOD_OPTIONS)
  timePeriod?: BillingTimePeriod;

  @ApiPropertyOptional({ enum: BILLING_SORT_BY })
  @IsOptional()
  @IsIn(BILLING_SORT_BY)
  sortBy?: BillingSortBy;

  @ApiPropertyOptional({ enum: BILLING_SORT_ORDER, default: 'asc' })
  @IsOptional()
  @IsIn(BILLING_SORT_ORDER)
  sortOrder: BillingSortOrder = 'asc';
}
