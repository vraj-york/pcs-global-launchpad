import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ListBillingHistoryQueryDto } from '../../stripe/dto/list-billing-history-query.dto';

export class CompanyAdminBillingHistoryQueryDto extends ListBillingHistoryQueryDto {
  @ApiPropertyOptional({
    description:
      'Target company UUID. Omit when the user administers exactly one company.',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
