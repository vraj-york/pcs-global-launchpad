import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** PATCH body for standalone app key contacts: omit fields you are not updating. */
export class UpdateAppKeyContactDto {
  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({ example: 'JD' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+1 555-0100' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  workPhone?: string;

  @ApiPropertyOptional({ example: '+1 555-0199' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cellPhone?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  timezone?: string;

  @ApiPropertyOptional({
    description:
      'Stored `contact_type` key (e.g. exec_sponsor). Case-insensitive filter elsewhere uses the same key.',
    example: 'exec_sponsor',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactType?: string;

  @ApiPropertyOptional({ example: 'Director of Operations' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  jobRole?: string;

  @ApiPropertyOptional({
    description: 'Corporation UUID when updating the link.',
  })
  @IsOptional()
  @IsUUID('4')
  corporationId?: string;

  @ApiPropertyOptional({ description: 'Company UUID when updating the link.' })
  @IsOptional()
  @IsUUID('4')
  companyId?: string;
}
