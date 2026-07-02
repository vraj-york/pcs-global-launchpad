import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertCompanyPlanSeatDto {
  @ApiPropertyOptional({
    description:
      'Optional onsite training selection. The fee amount is charged at checkout against the single Stripe per-day Price (configured via `STRIPE_ONSITE_TRAINING_PRICE_ID`) with quantity 1 for `1_day` and 2 for `2_days`.',
    default: 'off',
    enum: ['off', '1_day', '2_days'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['off', '1_day', '2_days'])
  onsiteTrainingOption?: string;

  @ApiProperty({
    description:
      'When true, trialStartDate and trialEndDate are optional (omit both to clear stored dates). When false, both trial dates are required.',
    example: false,
  })
  @IsBoolean()
  zeroTrial: boolean;

  @ApiProperty({
    description:
      'Pricing plan id (`pricing_plans.id`); updates the company `plan_id`.',
    example: '4b7497a7-fe14-4774-99f9-38b633c10f50',
  })
  @IsUUID()
  planLevel: string;

  @ApiPropertyOptional({
    description: 'Trial length duration (e.g. days count)',
    default: 14,
    example: 14,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  trialLengthDuration?: number;

  @ApiPropertyOptional({
    description: 'Trial length unit',
    default: 'days',
    example: 'days',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  trialLengthType?: string;

  @ApiPropertyOptional({
    description:
      'Trial start date (ISO 8601). Required when zeroTrial is false. When zeroTrial is true, optional (provide both or omit both).',
    example: '2025-01-01',
  })
  @ValidateIf((o: UpsertCompanyPlanSeatDto) => o.zeroTrial === false)
  @IsNotEmpty({
    message: 'trialStartDate is required when zeroTrial is false',
  })
  @IsString()
  trialStartDate?: string;

  @ApiPropertyOptional({
    description:
      'Trial end date (ISO 8601). Required when zeroTrial is false. When zeroTrial is true, optional (provide both or omit both).',
    example: '2025-01-15',
  })
  @ValidateIf((o: UpsertCompanyPlanSeatDto) => o.zeroTrial === false)
  @IsNotEmpty({
    message: 'trialEndDate is required when zeroTrial is false',
  })
  @IsString()
  trialEndDate?: string;

  @ApiProperty({
    description: 'Plan price (must be >= 0; discount cannot exceed this value)',
    example: 99.99,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  planPrice: number;

  @ApiPropertyOptional({
    description: 'Discount amount (must be >= 0 and <= planPrice)',
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiProperty({
    description: 'Invoice amount (must be >= 0)',
    example: 99.99,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  invoiceAmount: number;

  @ApiPropertyOptional({
    description: 'Billing currency label',
    default: 'USD ($)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  billingCurrency?: string;

  @ApiPropertyOptional({
    description: 'Whether to auto-convert when trial ends',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoConvertTrial?: boolean;

  @ApiPropertyOptional({
    description:
      'Promo code string saved at company setup for Company Admin checkout (optional; max 50 chars).',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  checkoutPromoCode?: string | null;
}
