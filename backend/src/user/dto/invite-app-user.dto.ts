import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  APP_USER_INVITE_TYPE,
  type AppUserInviteTypeName,
} from '../constants/app-user.constants';

export class InviteAppUserDto {
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

  @ApiProperty({
    enum: APP_USER_INVITE_TYPE,
    example: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
  })
  @IsEnum(APP_USER_INVITE_TYPE)
  inviteType!: AppUserInviteTypeName;

  @ApiPropertyOptional({
    example: 'individual',
    description:
      'Optional `app_users.user_type` (e.g. individual for Super Admin assessment invites).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  userType?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional promo for individual assessment invites.',
  })
  @IsOptional()
  @IsUUID()
  promoCodeId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional pricing plan for individual assessment invites.',
  })
  @IsOptional()
  @IsUUID()
  pricingPlanId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when inviteType is BSPBlueprint.',
  })
  @ValidateIf(
    (o: InviteAppUserDto) =>
      o.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
  )
  @IsNotEmpty()
  @IsUUID()
  corporationId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when inviteType is BSPBlueprint.',
  })
  @ValidateIf(
    (o: InviteAppUserDto) =>
      o.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
  )
  @IsNotEmpty()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required when inviteType is BSPBlueprint.',
  })
  @ValidateIf(
    (o: InviteAppUserDto) =>
      o.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
  )
  @IsNotEmpty()
  @IsUUID()
  roleId?: string;
}
