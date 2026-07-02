import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PLAN_TYPES = ['monthly', 'annual', 'one_time'] as const;

export class CreatePromoCodeDto {
  @ApiProperty({
    example: 'BSP100OFF',
    description: 'Unique code (letters/numbers).',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 64)
  code!: string;

  @ApiProperty({
    enum: PLAN_TYPES,
    description:
      'Product plan this promo applies to (maps to Stripe access rules).',
  })
  @IsIn([...PLAN_TYPES])
  planTypeId!: (typeof PLAN_TYPES)[number];

  @ApiPropertyOptional({
    description: 'Optional notes shown internally.',
    maxLength: 8000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiProperty({ enum: ['percent', 'fixed_amount'] })
  @IsIn(['percent', 'fixed_amount'])
  discountType!: 'percent' | 'fixed_amount';

  @ApiProperty({
    description:
      'Percentage (1–100) when discountType is percent; major currency units when fixed_amount.',
    example: 15,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  discountValue!: number;

  @ApiProperty({ enum: ['once', 'forever'] })
  @IsIn(['once', 'forever'])
  duration!: 'once' | 'forever';

  @ApiPropertyOptional({
    description:
      'End of promotion (date-only ISO YYYY-MM-DD or full ISO datetime).',
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Maximum number of redemptions.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional({
    description:
      'When true, promo usage is scoped to the selected corporation (and optionally company).',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  limitToAssignment?: boolean;

  @ApiPropertyOptional({
    description: 'Required when limitToAssignment is true.',
  })
  @ValidateIf((o: CreatePromoCodeDto) => Boolean(o.limitToAssignment))
  @IsNotEmpty()
  @IsUUID()
  corporationId?: string;

  @ApiPropertyOptional({
    description: 'Optional; must belong to the selected corporation.',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
