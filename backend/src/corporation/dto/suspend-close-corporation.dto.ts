import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsIn,
} from 'class-validator';

export class SuspendCloseCorporationDto {
  @ApiProperty({
    description:
      'Target status for the corporation. SUSPENDED = suspend access; CLOSED = close the corporation permanently.',
    example: 'CLOSED',
    enum: ['SUSPENDED', 'CLOSED'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['SUSPENDED', 'CLOSED'], {
    message: 'status must be one of SUSPENDED, CLOSED',
  })
  status: string;

  @ApiProperty({
    description:
      'Mandatory reason for suspending or closing the corporation (e.g. contract ended, policy violation).',
    example: 'Contract terminated by customer request',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'suspendCloseReason is required' })
  @MaxLength(255)
  suspendCloseReason: string;

  @ApiPropertyOptional({
    description:
      'Optional additional notes or context for the suspend/close action.',
    example: 'Account to be archived after 90 days. All data export completed.',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  suspendCloseAdditionalNotes?: string;
}
