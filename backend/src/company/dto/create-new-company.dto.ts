import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEmail,
  IsIn,
  IsUrl,
  ValidateIf,
  IsInt,
  Min,
} from 'class-validator';
import { COMPANY_TYPES, OFFICE_TYPES } from '../constants';
import { COMPANY_STATUS } from '../constants/company.status';
import { IsPhoneNumber } from '../../common/validators';

export class CreateNewCompanyDto {
  // --- Company Legal Info (region/ownership inherited from corporation) ---

  @ApiProperty({
    description:
      'Legal name of the company (must be unique within the corporation)',
    example: 'Acme Inc.',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  legalName: string;

  @ApiPropertyOptional({
    description: 'DBA / Trade name',
    example: 'Acme Co.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dbaName?: string;

  @ApiPropertyOptional({
    description: 'Company website URL',
    example: 'https://www.acme.com',
    maxLength: 255,
  })
  @IsOptional()
  @ValidateIf((o: CreateNewCompanyDto) => o.website != null && o.website !== '')
  @IsUrl({}, { message: 'website must be a valid URL' })
  @MaxLength(255)
  website?: string;

  @ApiProperty({
    description: 'Company type',
    enum: COMPANY_TYPES,
    example: 'Operating Company',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(COMPANY_TYPES, {
    message: `companyType must be one of: ${COMPANY_TYPES.join(', ')}`,
  })
  @MaxLength(255)
  companyType: string;

  @ApiProperty({
    description: 'Office type',
    enum: OFFICE_TYPES,
    example: 'Regional',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(OFFICE_TYPES, {
    message: `officeType must be one of: ${OFFICE_TYPES.join(', ')}`,
  })
  @MaxLength(255)
  officeType: string;

  @ApiProperty({
    description: 'Industry',
    example: 'Technology',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  industry: string;

  @ApiPropertyOptional({
    description: 'Primary language',
    example: 'English',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryLanguage?: string;

  @ApiPropertyOptional({
    description:
      'Company phone number. Defaults to company admin work phone when omitted (e.g. corporation setup flow).',
    example: '+1 (555) 123-4567',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ValidateIf((o: CreateNewCompanyDto) => o.phoneNo != null && o.phoneNo !== '')
  @IsPhoneNumber()
  phoneNo?: string;

  // --- Same as corporate admin (when true, company admin fields are optional; backend populates from corporation admin) ---

  @ApiPropertyOptional({
    description:
      'Whether company admin is same as corporation admin. When true, company admin fields may be omitted and will be copied from the parent corporation admin.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sameAsCorpAdmin?: boolean;

  // --- Plan (optional for Step 1; set in Step 3 Plan & Seats or in quick/advanced corporation setup) ---

  @ApiPropertyOptional({
    description:
      'Pricing plan ID (references pricing_plans.id). Optional for Add Company Step 1; required in corporation setup and set in Step 3 Plan & Seats.',
    example: '4b7497a7-fe14-4774-99f9-38b633c10f50',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({
    description:
      'Company setup progress step (1-based). Defaults to 1 when omitted.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  submittedSteps?: number;

  @ApiPropertyOptional({
    description:
      'Company status (setup progress). Defaults to INCOMPLETE when omitted.',
    enum: Object.values(COMPANY_STATUS),
    example: COMPANY_STATUS.INCOMPLETE,
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(COMPANY_STATUS))
  @MaxLength(255)
  status?: string;

  // --- Company Admin (required when sameAsCorpAdmin is false; optional when sameAsCorpAdmin is true) ---

  @ApiPropertyOptional({
    description:
      'Company admin first name. Required when sameAsCorpAdmin is false.',
    example: 'Arthur',
    maxLength: 255,
  })
  @ValidateIf((o: CreateNewCompanyDto) => o.sameAsCorpAdmin !== true)
  @IsNotEmpty({
    message: 'First name is required when not using corporation admin',
  })
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({
    description:
      'Company admin last name. Required when sameAsCorpAdmin is false.',
    example: 'Harold',
    maxLength: 255,
  })
  @ValidateIf((o: CreateNewCompanyDto) => o.sameAsCorpAdmin !== true)
  @IsNotEmpty({
    message: 'Last name is required when not using corporation admin',
  })
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Company admin nickname',
    example: 'Arold',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({
    description:
      'Company admin job role. Required when sameAsCorpAdmin is false; omitted when sameAsCorpAdmin is true (inherited from corporation admin).',
    example: 'Administrator',
    maxLength: 255,
  })
  @ValidateIf((o: CreateNewCompanyDto) => o.sameAsCorpAdmin !== true)
  @IsNotEmpty({
    message: 'Job role is required when not using corporation admin',
  })
  @IsString()
  @MaxLength(255)
  jobRole?: string;

  @ApiPropertyOptional({
    description:
      'Company admin email. Required when sameAsCorpAdmin is false. Must be valid email format.',
    example: 'arthur_harold@email.com',
    maxLength: 255,
  })
  @ValidateIf((o: CreateNewCompanyDto) => o.sameAsCorpAdmin !== true)
  @IsNotEmpty({ message: 'Email is required when not using corporation admin' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description:
      'Company admin work phone. Required when sameAsCorpAdmin is false.',
    example: '+1 (555) 123-4567',
    maxLength: 255,
  })
  @ValidateIf((o: CreateNewCompanyDto) => o.sameAsCorpAdmin !== true)
  @IsNotEmpty({
    message: 'Work phone is required when not using corporation admin',
  })
  @IsString()
  @MaxLength(255)
  @IsPhoneNumber()
  workPhone?: string;

  @ApiPropertyOptional({
    description: 'Company admin cell phone number',
    example: '+1 (555) 123-4567',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ValidateIf((_o, value) => value != null && value !== '')
  @IsPhoneNumber()
  cellPhone?: string;

  // --- Company Address ---

  @ApiProperty({
    description: 'Address line',
    example: '123 Main Street',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine: string;

  @ApiProperty({
    description: 'State / Province',
    example: 'California',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  state: string;

  @ApiProperty({
    description: 'City',
    example: 'San Francisco',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  city: string;

  @ApiProperty({
    description: 'Country',
    example: 'United States',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  country: string;

  @ApiProperty({
    description: 'ZIP / Postal code',
    example: '94105',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  zip: string;

  @ApiProperty({
    description: 'Security posture',
    example: 'High',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  securityPosture: string;
}
