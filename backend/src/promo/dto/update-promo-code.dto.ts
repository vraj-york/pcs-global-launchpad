import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const PLAN_TYPES = ['monthly', 'annual', 'one_time'] as const;

/**
 * Partial update. Validation for assignment rules runs in PromoService after merge with the existing row.
 */
export class UpdatePromoCodeDto {
  @ApiPropertyOptional({
    example: 'BSP100OFF',
    description: 'Unique code (letters/numbers).',
  })
  @IsOptional()
  @IsString()
  @Length(2, 64)
  code?: string;

  @ApiPropertyOptional({
    enum: PLAN_TYPES,
    description: 'Product plan this promo applies to.',
  })
  @IsOptional()
  @IsIn([...PLAN_TYPES])
  planTypeId?: (typeof PLAN_TYPES)[number];

  @ApiPropertyOptional({
    description: 'Optional notes shown internally.',
    maxLength: 8000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiPropertyOptional({ enum: ['percent', 'fixed_amount'] })
  @IsOptional()
  @IsIn(['percent', 'fixed_amount'])
  discountType?: 'percent' | 'fixed_amount';

  @ApiPropertyOptional({
    description:
      'Percentage (1–100) when discountType is percent; major currency units when fixed_amount.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  discountValue?: number;

  @ApiPropertyOptional({ enum: ['once', 'forever'] })
  @IsOptional()
  @IsIn(['once', 'forever'])
  duration?: 'once' | 'forever';

  @ApiPropertyOptional({
    description:
      'End of promotion (date-only ISO YYYY-MM-DD or full ISO datetime). Omit to leave unchanged.',
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Maximum redemptions. Omit to leave unchanged.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional({
    description:
      'When true, promo usage is scoped to the selected corporation (and optionally company).',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  limitToAssignment?: boolean;

  @ApiPropertyOptional({
    description: 'Required when merged limitToAssignment is true.',
  })
  @IsOptional()
  @IsUUID()
  corporationId?: string;

  @ApiPropertyOptional({
    description: 'Optional; must belong to the selected corporation.',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
