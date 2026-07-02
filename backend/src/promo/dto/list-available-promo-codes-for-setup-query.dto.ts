import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

function emptyToUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

/** Query params for GET /promo-codes/available-for-company-setup */
export class ListAvailablePromoCodesForSetupQueryDto {
  @ApiPropertyOptional({
    description:
      'When set, only promos for this plan type (e.g. monthly, annual, one_time).',
    example: 'annual',
    maxLength: 64,
  })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(64)
  planTypeId?: string;

  @ApiPropertyOptional({
    description:
      'When set, includes corporation-scoped promos assigned to this corporation in addition to unrestricted promos.',
  })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsUUID()
  corporationId?: string;
}
