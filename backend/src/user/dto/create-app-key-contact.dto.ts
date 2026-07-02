import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** POST body for creating a standalone app key contact (directory contact). */
export class CreateAppKeyContactDto {
  @ApiProperty({ example: 'Jane' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '+1 555-0100' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  workPhone: string;

  @ApiProperty({
    description:
      'Stored `contact_type` key (e.g. exec_sponsor). Display label is resolved for responses.',
    example: 'exec_sponsor',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contactType: string;

  @ApiPropertyOptional({ example: 'JD' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  timezone?: string;

  @ApiPropertyOptional({ example: '+1 555-0199' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cellPhone?: string;

  @ApiPropertyOptional({
    description: 'Corporation UUID when scoping the contact to a corporation.',
  })
  @IsOptional()
  @IsUUID('4')
  corporationId?: string;

  @ApiPropertyOptional({
    description:
      'Company UUID when scoping the contact to a company (sets corporation from the company when omitted).',
  })
  @IsOptional()
  @IsUUID('4')
  companyId?: string;

  @ApiPropertyOptional({ example: 'Director of Operations' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  jobRole?: string;
}
