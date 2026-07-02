import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { APP_USER_STATUS } from '../constants/app-user.constants';

const APP_USER_STATUS_VALUES = Object.values(APP_USER_STATUS);

/** PATCH body: only these fields may be changed; omit properties you are not updating. */
export class UpdateAppUserDto {
  @ApiPropertyOptional({
    description: 'App user status',
    enum: APP_USER_STATUS_VALUES,
    example: APP_USER_STATUS.ACTIVE,
  })
  @IsOptional()
  @IsIn(APP_USER_STATUS_VALUES)
  status?: (typeof APP_USER_STATUS)[keyof typeof APP_USER_STATUS];

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({ example: 'JD' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nickname?: string;

  @ApiPropertyOptional({ example: '+1 555-0100' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  workPhone?: string;

  @ApiPropertyOptional({ example: '+1 555-0199' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cellPhone?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Role id (`roles.id`); omit to leave unchanged, null to clear',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  roleId?: string | null;
}
