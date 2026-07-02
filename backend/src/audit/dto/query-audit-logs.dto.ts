import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AUDIT_DOMAINS } from '../constants';

export const AUDIT_SORT_BY = ['createdAt', 'domain', 'eventType'] as const;
export type AuditSortBy = (typeof AUDIT_SORT_BY)[number];

export const AUDIT_SORT_ORDER = ['asc', 'desc'] as const;
export type AuditSortOrder = (typeof AUDIT_SORT_ORDER)[number];

export class QueryAuditLogsDto {
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
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Sort by field. Default: createdAt.',
    enum: AUDIT_SORT_BY,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(AUDIT_SORT_BY)
  sortBy?: AuditSortBy = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction. Default: desc.',
    enum: AUDIT_SORT_ORDER,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(AUDIT_SORT_ORDER)
  sortOrder?: AuditSortOrder = 'desc';

  @ApiPropertyOptional({
    description: 'Filter by domain (e.g., password_reset, corporation)',
    enum: Object.values(AUDIT_DOMAINS),
    example: 'corporation',
  })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({
    description: 'Filter by event type within the domain',
    example: 'VIEW',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID (Cognito sub)',
    example: 'user-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: 'corp-uuid-1',
  })
  @IsOptional()
  @IsString()
  entityId?: string;
}
