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
import type {
  BillingHistoryActorKind,
  BillingHistoryEventType,
} from '../stripe-billing-history.types';

const BILLING_HISTORY_EVENT_TYPES = [
  'all',
  'subscription_created',
  'invoice_generated',
  'payment_successful',
  'payment_failed',
  'plan_upgraded',
  'subscription_canceled',
  'subscription_reinstated',
] as const;

const BILLING_HISTORY_ACTOR_KINDS = [
  'all',
  'system',
  'super_admin',
  'corporation_admin',
  'company_admin',
] as const;

const BILLING_HISTORY_SORT_BY = [
  'eventId',
  'eventType',
  'planLabel',
  'amount',
  'actorName',
  'occurredAt',
] as const;

const BILLING_HISTORY_SORT_ORDER = ['asc', 'desc'] as const;

export type BillingHistoryEventTypeFilter =
  (typeof BILLING_HISTORY_EVENT_TYPES)[number];

export type BillingHistoryActorKindFilter =
  (typeof BILLING_HISTORY_ACTOR_KINDS)[number];

export type BillingHistorySortBy = (typeof BILLING_HISTORY_SORT_BY)[number];

export type BillingHistorySortOrder =
  (typeof BILLING_HISTORY_SORT_ORDER)[number];

export class ListBillingHistoryQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by event type.' })
  @IsOptional()
  @IsIn(BILLING_HISTORY_EVENT_TYPES)
  eventType: BillingHistoryEventTypeFilter = 'all';

  @ApiPropertyOptional({ description: 'Filter by plan type id.' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  planTypeId?: string;

  @ApiPropertyOptional({ description: 'Filter by actor category.' })
  @IsOptional()
  @IsIn(BILLING_HISTORY_ACTOR_KINDS)
  actorKind: BillingHistoryActorKindFilter = 'all';

  @ApiPropertyOptional({ enum: BILLING_HISTORY_SORT_BY })
  @IsOptional()
  @IsIn(BILLING_HISTORY_SORT_BY)
  sortBy?: BillingHistorySortBy;

  @ApiPropertyOptional({ enum: BILLING_HISTORY_SORT_ORDER })
  @IsOptional()
  @IsIn(BILLING_HISTORY_SORT_ORDER)
  sortOrder?: BillingHistorySortOrder;
}

export const isBillingHistoryEventType = (
  value: string,
): value is BillingHistoryEventType =>
  value !== 'all' &&
  (BILLING_HISTORY_EVENT_TYPES as readonly string[]).includes(value);

export const isBillingHistoryActorKind = (
  value: string,
): value is BillingHistoryActorKind =>
  value !== 'all' &&
  (BILLING_HISTORY_ACTOR_KINDS as readonly string[]).includes(value);
