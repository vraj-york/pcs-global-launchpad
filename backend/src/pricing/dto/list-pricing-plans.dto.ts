import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';

export const PRICING_PLAN_TYPES = ['monthly', 'annual', 'one_time'] as const;
export type PricingPlanType = (typeof PRICING_PLAN_TYPES)[number];

export class ListPricingPlansDto {
  @ApiProperty({
    description: 'Plan type to filter by',
    enum: PRICING_PLAN_TYPES,
    example: 'monthly',
  })
  @IsNotEmpty()
  @IsIn(PRICING_PLAN_TYPES, {
    message: 'plan_type must be one of: monthly, annual, one_time',
  })
  plan_type: PricingPlanType;
}
