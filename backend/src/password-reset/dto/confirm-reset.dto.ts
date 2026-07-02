import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common';

export class ConfirmResetDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password reset token received via email',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description:
      'New password (min 8 chars, uppercase, lowercase, number or symbol)',
    example: 'NewSecureP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  newPassword: string;
}
