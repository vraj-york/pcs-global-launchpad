import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateStepsDto {
  @ApiProperty({
    description: 'Type of step update (e.g. confirmation)',
    example: 'confirmation',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  type: string;
}
