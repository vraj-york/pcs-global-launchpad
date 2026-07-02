import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BillingUpgradeTargetDto {
  @ApiProperty({
    description: 'Target pricing_plans.id for the upgrade.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  targetPricingPlanId!: string;
}
