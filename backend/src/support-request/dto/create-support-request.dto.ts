import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Allow,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SUPPORT_REQUEST_ATTACHMENTS_FIELD } from '../constants';

/**
 * Multipart form for support requests. File bytes are read from `@UploadedFiles()`,
 * not from this object; `attachments` is whitelisted so ValidationPipe does not reject it.
 */
export class CreateSupportRequestDto {
  @ApiProperty({
    description: 'Contact email for the support request',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Subject of the support request',
    example: 'Unable to access my account',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject: string;

  @ApiPropertyOptional({
    description: 'Optional message body',
    example: 'I have been unable to log in since yesterday.',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description:
      'Optional image attachments (PNG or JPG, max 10 MB each, up to 3). Handled as multipart files.',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  @Allow()
  [SUPPORT_REQUEST_ATTACHMENTS_FIELD]?: unknown;
}
