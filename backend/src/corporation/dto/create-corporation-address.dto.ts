import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCorporationAddressDto {
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
    description: 'Timezone',
    example: 'America/Los_Angeles',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  timezone: string;
}
