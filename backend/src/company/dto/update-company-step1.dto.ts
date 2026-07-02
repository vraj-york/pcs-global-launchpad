import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsIn,
  IsUrl,
  ValidateIf,
  IsInt,
  Min,
  IsBoolean,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { COMPANY_TYPES, OFFICE_TYPES } from '../constants';
import { COMPANY_STATUS } from '../constants/company.status';
import { IsPhoneNumber } from '../../common/validators';
import { STEP1_ADMIN_FIELDS_DISALLOWED_WHEN_SAME_AS_CORP_MSG } from '../constants/company.messages';

@ValidatorConstraint({
  name: 'step1SameAsCorpAdminNoAdminFields',
  async: false,
})
export class UpdateCompanyStep1SameAsCorpAdminConstraint implements ValidatorConstraintInterface {
  validate(sameAsCorpAdmin: boolean | undefined, args: ValidationArguments) {
    if (sameAsCorpAdmin !== true) {
      return true;
    }
    const o = args.object as UpdateCompanyStep1Dto;
    const keys: (keyof UpdateCompanyStep1Dto)[] = [
      'firstName',
      'lastName',
      'jobRole',
      'nickname',
      'workPhone',
      'cellPhone',
    ];
    return keys.every((k) => o[k] === undefined);
  }

  defaultMessage(): string {
    return STEP1_ADMIN_FIELDS_DISALLOWED_WHEN_SAME_AS_CORP_MSG;
  }
}

/**
 * Partial update body for Add Company wizard Step 1 (legal profile, admin, address, plan/progress).
 * Used by PATCH /corporations/companies/:companyId.
 * `sameAsCorpAdmin` is accepted only for validation (must match the company record; not persisted). Company admin email is not included.
 */
export class UpdateCompanyStep1Dto {
  @ApiPropertyOptional({
    description:
      'Legal name of the company (must remain unique within the corporation when changed)',
    example: 'Acme Inc.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

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
  @ValidateIf(
    (o: UpdateCompanyStep1Dto) => o.website != null && o.website !== '',
  )
  @IsUrl({}, { message: 'website must be a valid URL' })
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({
    description: 'Company type',
    enum: COMPANY_TYPES,
    example: 'Operating Company',
  })
  @IsOptional()
  @IsString()
  @IsIn(COMPANY_TYPES, {
    message: `companyType must be one of: ${COMPANY_TYPES.join(', ')}`,
  })
  @MaxLength(255)
  companyType?: string;

  @ApiPropertyOptional({
    description: 'Office type',
    enum: OFFICE_TYPES,
    example: 'Regional',
  })
  @IsOptional()
  @IsString()
  @IsIn(OFFICE_TYPES, {
    message: `officeType must be one of: ${OFFICE_TYPES.join(', ')}`,
  })
  @MaxLength(255)
  officeType?: string;

  @ApiPropertyOptional({
    description: 'Industry',
    example: 'Technology',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Company phone number',
    example: '+1 (555) 123-4567',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ValidateIf(
    (o: UpdateCompanyStep1Dto) => o.phoneNo != null && o.phoneNo !== '',
  )
  @IsPhoneNumber()
  phoneNo?: string;

  @ApiPropertyOptional({
    description:
      'Must match the company’s stored value. When true, do not send firstName, lastName, jobRole, nickname, workPhone, or cellPhone. Not persisted by this endpoint.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Validate(UpdateCompanyStep1SameAsCorpAdminConstraint)
  sameAsCorpAdmin?: boolean;

  @ApiPropertyOptional({
    description: 'Company setup progress step (1-based)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  submittedSteps?: number;

  @ApiPropertyOptional({
    description: 'Company status (setup progress)',
    enum: Object.values(COMPANY_STATUS),
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(COMPANY_STATUS))
  @MaxLength(255)
  status?: string;

  @ApiPropertyOptional({
    description: 'Company admin first name (partial update).',
    example: 'Arthur',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Company admin last name (partial update).',
    example: 'Harold',
    maxLength: 255,
  })
  @IsOptional()
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
    description: 'Company admin job role (partial update).',
    example: 'Administrator',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  jobRole?: string;

  @ApiPropertyOptional({
    description:
      'Company admin work phone (partial update). Company admin email cannot be changed via PATCH.',
    example: '+1 (555) 123-4567',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ValidateIf((_o, value) => value != null && value !== '')
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

  @ApiPropertyOptional({
    description: 'Address line',
    example: '123 Main Street',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string;

  @ApiPropertyOptional({
    description: 'State / Province',
    example: 'California',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  state?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'San Francisco',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  city?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'United States',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  country?: string;

  @ApiPropertyOptional({
    description: 'ZIP / Postal code',
    example: '94105',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  zip?: string;
}
