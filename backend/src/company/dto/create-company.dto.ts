import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEmail,
} from 'class-validator';
import { IsPhoneNumber } from '../../common/validators';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Legal name of the company',
    example: 'Acme Company Inc.',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  legalName: string;

  @ApiProperty({
    description: 'Company type',
    example: 'LLC',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyType: string;

  @ApiProperty({
    description: 'Office type',
    example: 'Headquarters',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
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

  @ApiProperty({
    description: 'Company phone number',
    example: '+1-555-123-4567',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsPhoneNumber()
  phoneNo: string;

  @ApiPropertyOptional({
    description:
      'Whether company admin is same as corporation admin. Default: false.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sameAsCorpAdmin?: boolean;

  @ApiProperty({
    description: 'Pricing plan ID (references pricing_plans.id). Required.',
    example: '61fa4369-6fe6-4b35-8825-bcadcc8efac8',
  })
  @IsNotEmpty()
  @IsUUID()
  planId: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @ApiPropertyOptional({
    description: 'Nickname',
    example: 'Johnny',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nickname?: string;

  @ApiProperty({
    description: 'Job role',
    example: 'Administrator',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  jobRole: string;

  @ApiProperty({
    description: 'Email',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'Work phone number',
    example: '+1-555-123-4567',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  workPhone: string;

  @ApiPropertyOptional({
    description: 'Cell phone number',
    example: '+1-555-987-6543',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  cellPhone?: string;

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
    description: 'State',
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
    description: 'ZIP/Postal code',
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
