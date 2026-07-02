import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Allow,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Multipart `multipart/form-data` for company configuration.
 * Text fields are required; `logo` is optional (same field name as the uploaded file).
 * Runtime file bytes are read from `@UploadedFiles()`, not from this object.
 */
export class UpsertCompanyConfigurationDto {
  @ApiProperty({
    description: 'Authentication method',
    example: 'Email & Password',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  authMethod: string;

  @ApiProperty({
    description: 'Password policy label',
    example: 'Standard (8+ Characters & Mixed case)',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  passwordPolicy: string;

  @ApiProperty({
    description: 'MFA requirement',
    example: 'Required',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mfa: string;

  @ApiProperty({
    description: 'Session timeout display value',
    example: '60 min',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sessionTimeout: string;

  @ApiProperty({
    description: 'Security posture',
    example: 'Standard',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  securityPosture: string;

  @ApiProperty({
    description: 'Primary language',
    example: 'English (US)',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  primaryLanguage: string;

  @ApiPropertyOptional({
    description:
      'Optional company brand logo. PNG or JPG, max 10 MB. Replaces existing logo when provided.',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  @Allow()
  logo?: unknown;
}
