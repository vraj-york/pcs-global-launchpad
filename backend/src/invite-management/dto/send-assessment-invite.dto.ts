import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class SendAssessmentInviteDto {
  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName!: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: '+1 555-0100' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  workPhone!: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  timezone!: string;

  @ApiPropertyOptional({ example: 'JD' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({ example: '+1 555-0199' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cellPhone?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  hasPromoCode!: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when hasPromoCode is true.',
  })
  @ValidateIf((o: SendAssessmentInviteDto) => o.hasPromoCode === true)
  @IsNotEmpty()
  @IsUUID()
  promoCodeId?: string;
}
