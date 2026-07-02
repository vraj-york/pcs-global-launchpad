import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelBillingSubscriptionDto {
  @ApiProperty({
    description: 'Pre-defined cancellation reason selected in the modal.',
    example: 'Budget / economic pressures',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Optional additional notes from the admin.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  additionalNotes?: string;
}
