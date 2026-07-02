import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SuspendCompanyDto {
  @ApiProperty({
    description:
      'Mandatory reason for suspending the company (e.g. contract ended, policy violation).',
    example: 'Contract terminated by customer request',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'suspendReason is required' })
  @MaxLength(255)
  suspendReason: string;

  @ApiPropertyOptional({
    description: 'Optional additional notes or context for the suspend action.',
    example: 'Account to be archived after 90 days.',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  suspendAdditionalNotes?: string;
}
