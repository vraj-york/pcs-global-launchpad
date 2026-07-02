import { ApiPropertyOptional } from '@nestjs/swagger';
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

const INVOICE_STATUS_FILTERS = [
  'all',
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void',
] as const;

export type InvoiceStatusFilter = (typeof INVOICE_STATUS_FILTERS)[number];

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  /** Cursor for `invoices.list` (Stripe invoice id). Omit on first page. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  startingAfter?: string;

  /** Cursor for `invoices.search` (`next_page` token). Omit on first page. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  searchPage?: string;

  /** Skip this many raw results at the start of the current search page. */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  searchOffset?: number;

  @ApiPropertyOptional({
    enum: INVOICE_STATUS_FILTERS,
    description: 'Stripe invoice status; `all` includes every status.',
  })
  @IsOptional()
  @IsIn(INVOICE_STATUS_FILTERS)
  status: InvoiceStatusFilter = 'all';

  @ApiPropertyOptional({
    description: 'Filter by BSP company id (maps to Stripe customer).',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  /** Inclusive lower bound for `created` (Unix seconds). */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  createdGte?: number;

  /** Inclusive upper bound for `created` (Unix seconds). */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  createdLte?: number;

  /** Comma-separated payment types: ACH, CC (post-filter; may fetch extra pages). */
  @ApiPropertyOptional({ example: 'ACH,CC' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  paymentMethods?: string;

  /** Case-insensitive match on invoice number or company legal name. */
  @ApiPropertyOptional({ example: 'INV-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
