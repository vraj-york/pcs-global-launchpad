import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  ValidateNested,
  IsUrl,
  IsObject,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCorporationAddressDto } from './create-corporation-address.dto';
import { CreateCorporationExecutiveSponsorDto } from './create-corporation-executive-sponsor.dto';
import { CreateCorporationAdminDto } from './create-corporation-admin.dto';

export class CreateCorporationDto {
  @ApiProperty({
    description: 'Legal name of the corporation',
    example: 'Acme Corporation Inc.',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  legalName: string;

  @ApiProperty({
    description: 'DBA (Doing Business As) name',
    example: 'Acme Corp',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  dbaName?: string;

  @ApiProperty({
    description: 'Company website URL (optional)',
    example: 'https://www.acme.com',
    maxLength: 255,
    required: false,
  })
  @ValidateIf(
    (o: CreateCorporationDto) => o.website != null && o.website !== '',
  )
  @IsUrl({}, { message: 'website must be a valid URL' })
  @IsOptional()
  @MaxLength(255)
  website?: string;

  @ApiProperty({
    description: 'Data residency region',
    example: 'US-East',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  dataResidencyRegion: string;

  @ApiProperty({
    description: 'Ownership type',
    example: 'Private',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  ownershipType: string;

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
    description: 'Phone number',
    example: '+1-555-123-4567',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  phoneNo: string;

  @ApiProperty({
    description: 'Mode',
    example: 'quick',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mode: string;

  @ApiProperty({
    description: 'Corporation address',
    type: CreateCorporationAddressDto,
  })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateCorporationAddressDto)
  address: CreateCorporationAddressDto;

  @ApiProperty({
    description: 'Executive sponsor',
    type: CreateCorporationExecutiveSponsorDto,
  })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateCorporationExecutiveSponsorDto)
  executiveSponsor: CreateCorporationExecutiveSponsorDto;

  @ApiProperty({
    description: 'Corporation admin',
    type: CreateCorporationAdminDto,
  })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateCorporationAdminDto)
  corporationAdmin: CreateCorporationAdminDto;
}
