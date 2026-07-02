import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsEmail,
  MaxLength,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class UpsertKeyContactDto {
  @ApiProperty({
    description:
      'When true, add or update the key contact. When false, delete the key contact.',
    example: true,
  })
  @IsBoolean()
  complianceContact: boolean;

  @ApiPropertyOptional({
    description:
      'Key contact first name (required when complianceContact is true)',
    example: 'Jane',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertKeyContactDto) => o.complianceContact === true)
  @IsString()
  @IsNotEmpty({
    message: 'firstName is required when complianceContact is true',
  })
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({
    description:
      'Key contact last name (required when complianceContact is true)',
    example: 'Doe',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertKeyContactDto) => o.complianceContact === true)
  @IsString()
  @IsNotEmpty({
    message: 'lastName is required when complianceContact is true',
  })
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({
    description:
      'Key contact nickname (optional when complianceContact is true)',
    example: 'Janie',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertKeyContactDto) => o.complianceContact === true)
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({
    description:
      'Key contact job role / title (optional when complianceContact is true); stored in app_key_contacts.job_role',
    example: 'Compliance Officer',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertKeyContactDto) => o.complianceContact === true)
  @IsString()
  @IsOptional()
  @MaxLength(255)
  jobRole?: string;

  @ApiPropertyOptional({
    description: 'Key contact email (required when complianceContact is true)',
    example: 'jane.doe@example.com',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertKeyContactDto) => o.complianceContact === true)
  @IsEmail()
  @IsNotEmpty({ message: 'email is required when complianceContact is true' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Work phone (required when complianceContact is true)',
    example: '+1-555-123-4567',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertKeyContactDto) => o.complianceContact === true)
  @IsString()
  @IsNotEmpty({
    message: 'workPhone is required when complianceContact is true',
  })
  @MaxLength(255)
  workPhone?: string;

  @ApiPropertyOptional({
    description: 'Cell phone (optional when complianceContact is true)',
    example: '+1-555-987-6543',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  cellPhone?: string;
}
