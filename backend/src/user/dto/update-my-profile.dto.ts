import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** PATCH body for the current user: only these fields may be changed; omit fields you are not updating. */
export class UpdateMyProfileDto {
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

  @ApiPropertyOptional({ example: 'Executive & Leadership Coach' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  professionalTitle?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    example:
      'Helping leaders unlock their behavioral potential through evidence-based coaching.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;
}
