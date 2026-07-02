import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max, IsIn, IsString } from 'class-validator';

export const ROLE_SORT_BY = [
  'name',
  'category',
  'roleType',
  'description',
] as const;
export type RoleSortBy = (typeof ROLE_SORT_BY)[number];

export const ROLE_SORT_ORDER = ['asc', 'desc'] as const;
export type RoleSortOrder = (typeof ROLE_SORT_ORDER)[number];

export class ListRoleQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search by role name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category (RoleCategory) ID',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Sort by: name, category, roleType, description. Default: name.',
    enum: ROLE_SORT_BY,
    default: 'name',
  })
  @IsOptional()
  @IsIn(ROLE_SORT_BY)
  sortBy?: RoleSortBy = 'name';

  @ApiPropertyOptional({
    description: 'Sort direction. Default: asc.',
    enum: ROLE_SORT_ORDER,
    default: 'asc',
  })
  @IsOptional()
  @IsIn(ROLE_SORT_ORDER)
  sortOrder?: RoleSortOrder = 'asc';
}
