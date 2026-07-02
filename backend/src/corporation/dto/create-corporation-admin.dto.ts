import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateCorporationAdminDto {
  @ApiProperty({
    description: 'Corporation admin first name',
    example: 'Jane',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @ApiProperty({
    description: 'Corporation admin last name',
    example: 'Smith',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @ApiProperty({
    description: 'Corporation admin nickname',
    example: 'Janie',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nickname?: string;

  @ApiProperty({
    description: 'Corporation admin job role / title',
    example: 'Administrator',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  jobRole: string;

  @ApiProperty({
    description: 'Corporation admin email',
    example: 'jane.smith@example.com',
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
