import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyDataDownloadOtpDto {
  @ApiProperty({
    description: 'Six-digit verification code sent to the registered email',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit code' })
  otp: string;
}
