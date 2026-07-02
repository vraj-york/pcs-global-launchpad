import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  APP_USER_BULK_INVITE_MAX_USERS,
  APP_USER_INVITE_TYPE,
  type AppUserInviteTypeName,
} from '../constants/app-user.constants';

/** One row in a bulk invite request (same profile fields as single invite; corporation/company/role/category by display name). */
export class BulkInviteAppUserRowDto {
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
    description:
      'Required when inviteType is BSPBlueprint (matched to corporations.legal_name, case-insensitive).',
  })
  @ValidateIf(
    (o: BulkInviteAppUserRowDto) =>
      o.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  corporationName?: string;

  @ApiPropertyOptional({
    description:
      'Required when inviteType is BSPBlueprint (matched to corporation_companies.legal_name under the resolved corporation).',
  })
  @ValidateIf(
    (o: BulkInviteAppUserRowDto) =>
      o.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({
    description:
      'Required when inviteType is BSPBlueprint (matched with categoryName to roles; unique per role_categories.name + roles.name).',
  })
  @ValidateIf(
    (o: BulkInviteAppUserRowDto) =>
      o.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  roleName?: string;

  @ApiPropertyOptional({
    description:
      'Required when inviteType is BSPBlueprint (matched to role_categories.name, case-insensitive).',
  })
  @ValidateIf(
    (o: BulkInviteAppUserRowDto) =>
      o.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  categoryName?: string;
}

/** Body for POST /users/invite/bulk: many invites in one request, resolved to the same flow as POST /users/invite. */
export class BulkInviteAppUsersDto {
  @ApiProperty({ type: [BulkInviteAppUserRowDto] })
  @ArrayMinSize(1)
  @ArrayMaxSize(APP_USER_BULK_INVITE_MAX_USERS)
  @ValidateNested({ each: true })
  @Type(() => BulkInviteAppUserRowDto)
  users!: BulkInviteAppUserRowDto[];
}

/** One successful invite from the bulk invite pipeline (CSV). */
export interface BulkInviteAppUserSucceededItem {
  /** CSV (`POST /users/invite/bulk`): 1-based file line (header = line 1). */
  rowIndex: number;
  email: string;
  cognitoSub: string;
  inviteType: string;
}

/** One row that did not result in an invite (validation or inviteAppUser failure). */
export interface BulkInviteAppUserFailedItem {
  /** CSV: 1-based file line (header = line 1). */
  rowIndex: number;
  email: string;
  message: string;
}

/** `data` payload for bulk invite success responses. */
export interface BulkInviteAppUsersResponseData {
  succeeded: BulkInviteAppUserSucceededItem[];
  failed: BulkInviteAppUserFailedItem[];
}
