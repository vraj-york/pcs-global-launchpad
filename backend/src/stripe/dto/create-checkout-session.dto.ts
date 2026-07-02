import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  @IsUUID()
  pricingPlanId!: string;

  /** When set, only this promo is validated and applied (no company → corp → global auto-pick). */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  promoCode?: string;
}
