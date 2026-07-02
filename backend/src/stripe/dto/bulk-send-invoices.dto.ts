import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  FINANCE_BULK_MAX_EXTRA_EMAILS,
  FINANCE_BULK_MAX_INVOICES,
} from '../stripe.constants';

export class BulkSendInvoicesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(FINANCE_BULK_MAX_INVOICES)
  @IsString({ each: true })
  invoiceIds!: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(FINANCE_BULK_MAX_EXTRA_EMAILS)
  @IsEmail({ require_tld: true }, { each: true })
  additionalEmails?: string[];
}
