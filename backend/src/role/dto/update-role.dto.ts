import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import {
  ROLE_NAME_MAX_LENGTH,
  ROLE_DESCRIPTION_MAX_LENGTH,
  ROLE_NAME_MAX_LENGTH_MSG,
  ROLE_DESCRIPTION_MAX_LENGTH_MSG,
} from '../constants/role.messages';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Role name',
    example: 'Company Admin',
    maxLength: ROLE_NAME_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  @MaxLength(ROLE_NAME_MAX_LENGTH, { message: ROLE_NAME_MAX_LENGTH_MSG })
  name: string;

  @ApiProperty({
    description: 'Role category ID (RoleCategory)',
    example: 'uuid',
  })
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Controls users, roles, settings, and subscriptions for a company',
    maxLength: ROLE_DESCRIPTION_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(ROLE_DESCRIPTION_MAX_LENGTH, {
    message: ROLE_DESCRIPTION_MAX_LENGTH_MSG,
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Mark as private (default false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean = false;

  @ApiPropertyOptional({
    description: 'Mark as external (default false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isExternal?: boolean = false;

  @ApiProperty({
    description:
      'Full set of enabled submodule IDs for the role category. At least one required. Partial save not allowed.',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one submodule must be enabled' })
  @IsUUID('4', { each: true })
  submoduleIds: string[];
}
