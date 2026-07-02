import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Enables or disables the Stripe promotion code (customer-facing redeemability). */
export class PatchPromoCodePromotionActiveDto {
  @ApiProperty({
    example: false,
    description: 'Stripe promotion code `active` flag.',
  })
  @IsBoolean()
  active!: boolean;
}
