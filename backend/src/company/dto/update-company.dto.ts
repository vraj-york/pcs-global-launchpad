import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsUUID,
  IsBoolean,
  IsEmail,
} from 'class-validator';
import { IsPhoneNumber } from '../../common/validators';

export class UpdateCompanyDto {
  @ApiPropertyOptional({
    description: 'Legal name of the company',
    example: 'Acme Company Inc.',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({
    description: 'Company type',
    example: 'LLC',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  companyType?: string;

  @ApiPropertyOptional({
    description: 'Office type',
    example: 'Headquarters',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  officeType?: string;

  @ApiPropertyOptional({
    description: 'Industry',
    example: 'Technology',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Company phone number',
    example: '+1-555-123-4567',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsPhoneNumber()
  phoneNo: string;

  @ApiPropertyOptional({
    description:
      'Ignored on PATCH /corporations/:corporationId/companies/:companyId (not editable via this endpoint).',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  sameAsCorpAdmin?: boolean;

  @ApiPropertyOptional({
    description: 'Pricing plan ID (references pricing_plans.id)',
    example: '61fa4369-6fe6-4b35-8825-bcadcc8efac8',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Nickname',
    example: 'Johnny',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({
    description: 'Job role (company admin)',
    example: 'Administrator',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  jobRole?: string;

  @ApiPropertyOptional({
    description:
      'Ignored on PATCH /corporations/:corporationId/companies/:companyId (not editable via this endpoint).',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Work phone number',
    example: '+1-555-123-4567',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  workPhone?: string;

  @ApiPropertyOptional({
    description: 'Cell phone number',
    example: '+1-555-987-6543',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  cellPhone?: string;

  @ApiPropertyOptional({
    description: 'Address line',
    example: '123 Main Street',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine?: string;

  @ApiPropertyOptional({
    description: 'State',
    example: 'California',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  state?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'San Francisco',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  city?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'United States',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  country?: string;

  @ApiPropertyOptional({
    description: 'ZIP/Postal code',
    example: '94105',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  zip?: string;

  @ApiPropertyOptional({
    description: 'Security posture',
    example: 'High',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  securityPosture?: string;
}
