import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListCompanyQueryDto {
  @ApiPropertyOptional({
    description:
      'Search by company name (legal name). Partial match, case-insensitive.',
    example: 'Acme',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by company type (e.g. LLC, Corp). Exact match.',
    example: 'LLC',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyType?: string;

  @ApiPropertyOptional({
    description:
      'Filter by corporation region (dataResidencyRegion). Case-insensitive.',
    example: 'North America',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  region?: string;

  @ApiPropertyOptional({
    description:
      'Filter by plan type (plan_types.id). Dropdown uses plan_types; companies store planId (pricing_plans.id). Matches companies whose plan has this planTypeId.',
    example: 'annual',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  planTypeId?: string;
}
