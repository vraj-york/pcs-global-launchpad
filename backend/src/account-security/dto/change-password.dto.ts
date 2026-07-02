import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current account password',
    example: 'CurrentP@ssw0rd',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (min 8 chars, uppercase, lowercase, number or symbol)',
    example: 'NewSecureP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  newPassword: string;

  @ApiProperty({
    description: 'Must match newPassword',
    example: 'NewSecureP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
