import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MaxLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateCorporationExecutiveSponsorDto {
  @ApiProperty({
    description: 'Executive sponsor first name',
    example: 'John',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @ApiProperty({
    description: 'Executive sponsor last name',
    example: 'Doe',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @ApiPropertyOptional({
    description: 'Executive sponsor nickname',
    example: 'Johnny',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({
    description:
      'Whether executive sponsor is same as corporation admin. Default: false.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sameAsCorpAdmin?: boolean;

  @ApiProperty({
    description: 'Executive sponsor job role / title',
    example: 'CEO',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  jobRole: string;

  @ApiProperty({
    description: 'Executive sponsor email',
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

  @ApiProperty({
    description: 'Cell phone number',
    example: '+1-555-987-6543',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  cellPhone?: string;
}
