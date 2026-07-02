import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';
import { FINANCE_BULK_MAX_INVOICES } from '../stripe.constants';

export class BulkInvoiceIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(FINANCE_BULK_MAX_INVOICES)
  @IsString({ each: true })
  invoiceIds!: string[];
}
