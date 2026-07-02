import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/** Optional company scope when the admin manages multiple companies. */
export class CompanyAdminBillingScopeQueryDto {
  @ApiPropertyOptional({
    description:
      'Target company UUID. Omit when the user administers exactly one company.',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
