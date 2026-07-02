import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsIn,
  MaxLength,
  ValidateIf,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsPhoneNumber } from '../../common/validators';
import { COMPANY_KEY_CONTACT_TYPES } from '../constants/company.enums';

const KEY_CONTACT_TYPES_LABEL = (
  COMPANY_KEY_CONTACT_TYPES as readonly string[]
).join(', ');

export class UpsertCompanyKeyContactItemDto {
  @ApiProperty({
    description: `Key contact type. Must be one of: ${KEY_CONTACT_TYPES_LABEL}. Used to match existing contact for update or soft-delete.`,
    enum: [...(COMPANY_KEY_CONTACT_TYPES as readonly string[])],
    example: 'finance_billing_contact',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(COMPANY_KEY_CONTACT_TYPES as unknown as readonly string[], {
    message: `contactType must be one of: ${KEY_CONTACT_TYPES_LABEL}`,
  })
  contactType: string;

  @ApiProperty({
    description:
      'If false, soft-deletes the app key contact for this contactType. If true, updates the active row or creates one.',
    example: true,
  })
  @IsBoolean()
  available: boolean;

  @ApiPropertyOptional({
    description: 'First name (required when available is true)',
    example: 'Jane',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertCompanyKeyContactItemDto) => o.available === true)
  @IsNotEmpty({ message: 'firstName is required when available is true' })
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name (required when available is true)',
    example: 'Doe',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertCompanyKeyContactItemDto) => o.available === true)
  @IsNotEmpty({ message: 'lastName is required when available is true' })
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Nickname',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({
    description: 'Job role / title',
    example: 'Billing lead',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  jobRole?: string;

  @ApiPropertyOptional({
    description:
      'Email (required when available is true). Not changed on update; set only on create.',
    example: 'jane.doe@example.com',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertCompanyKeyContactItemDto) => o.available === true)
  @IsNotEmpty({ message: 'email is required when available is true' })
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Work phone (required when available is true)',
    example: '+1-555-123-4567',
    maxLength: 255,
  })
  @ValidateIf((o: UpsertCompanyKeyContactItemDto) => o.available === true)
  @IsNotEmpty({ message: 'workPhone is required when available is true' })
  @IsString()
  @IsPhoneNumber()
  @MaxLength(255)
  workPhone?: string;

  @ApiPropertyOptional({
    description: 'Cell phone',
    example: '+1-555-987-6543',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  @MaxLength(255)
  cellPhone?: string;
}

export class UpsertCompanyKeyContactsDto {
  @ApiProperty({
    description:
      'List of key contacts in `app_key_contacts`. For each item: available=false soft-deletes by contactType; available=true updates or creates (firstName, lastName, email, workPhone required). Email is not updated when the row already exists.',
    type: [UpsertCompanyKeyContactItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertCompanyKeyContactItemDto)
  keyContacts: UpsertCompanyKeyContactItemDto[];
}
