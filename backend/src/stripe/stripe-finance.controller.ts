import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  CurrentUser,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';
import { CancelBillingSubscriptionDto } from './dto/cancel-billing-subscription.dto';
import { BillingUpgradeTargetDto } from './dto/billing-upgrade-target.dto';
import { ResponseHelper, type ApiResponse } from '../common';
import { BulkInvoiceIdsDto } from './dto/bulk-invoice-ids.dto';
import { BulkSendInvoicesDto } from './dto/bulk-send-invoices.dto';
import { ListBillingRecordsQueryDto } from './dto/list-billing-records-query.dto';
import { ListBillingHistoryQueryDto } from './dto/list-billing-history-query.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import type { InvoiceAdminListResult } from './stripe-admin-invoice.types';
import type {
  BillingAdminListItem,
  BillingAdminListResult,
} from './stripe-billing-admin.types';
import type { BillingHistoryListResult } from './stripe-billing-history.types';
import type {
  BillingUpgradeApplyResult,
  BillingUpgradeOptionsResult,
  BillingUpgradePreviewResult,
} from './stripe-billing-upgrade.types';
import {
  FINANCE_BILLING_CANCEL_SCHEDULED_MSG,
  FINANCE_BILLING_PLAN_OPTIONS_FETCHED_MSG,
  FINANCE_BILLING_RECORD_FETCHED_MSG,
  FINANCE_BILLING_RECORD_NOT_FOUND_MSG,
  FINANCE_BILLING_RECORDS_FETCHED_MSG,
  FINANCE_BILLING_HISTORY_FETCHED_MSG,
  FINANCE_BILLING_REINSTATE_SUCCESS_MSG,
  FINANCE_BILLING_RETRY_ATTEMPTED_MSG,
  FINANCE_BILLING_UPGRADE_APPLIED_MSG,
  FINANCE_BILLING_UPGRADE_OPTIONS_FETCHED_MSG,
  FINANCE_BILLING_UPGRADE_PREVIEW_FETCHED_MSG,
  FINANCE_COMPANIES_FETCHED_MSG,
  FINANCE_INVOICE_SENT_MSG,
  FINANCE_INVOICES_FETCHED_MSG,
  FINANCE_INVOICES_SENT_MSG,
} from './stripe.constants';
import { StripeService } from './stripe.service';

@ApiTags('Finance')
@Controller('finance')
@UseGuards(CognitoAuthGuard, AuthorizationGuard)
@ApiBearerAuth('bearer')
export class StripeFinanceController {
  private readonly logger = new Logger(StripeFinanceController.name);

  constructor(private readonly stripeService: StripeService) {}

  private logFinanceEndpointError(operation: string, err: unknown): void {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    this.logger.error(`Error in ${operation}: ${errorMessage}`, errorStack);
  }

  /** Company dropdown options for Invoice Management filters. */
  @Get('invoices/company-options')
  @RequireSubmodule(SUBMODULE_KEYS.INVOICE_MANAGEMENT_VIEW)
  @ApiOperation({
    summary: 'Companies linked to Stripe (invoice filters)',
    description:
      'Returns BSP companies that have a Stripe customer id, for the Invoice Management company filter.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - SuperAdmin, CorporationAdmin, or CompanyAdmin role required',
  })
  async getInvoiceCompanyOptions(
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse<Array<{ value: string; label: string }>>> {
    try {
      const data =
        await this.stripeService.getCompaniesWithStripeCustomerForRequester(
          user.sub,
          user.groups,
        );
      return ResponseHelper.success(FINANCE_COMPANIES_FETCHED_MSG, data);
    } catch (err) {
      this.logFinanceEndpointError('getInvoiceCompanyOptions', err);
      throw err;
    }
  }

  /** ZIP download of one or more invoice PDFs from Stripe. */
  @Post('invoices/bulk-download')
  @RequireSubmodule(SUBMODULE_KEYS.INVOICE_MANAGEMENT_BULK_DOWNLOAD)
  @ApiOperation({
    summary: 'Download selected invoices as a ZIP',
    description:
      'Returns a ZIP file containing PDFs for each Stripe invoice id within the requester scope.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - SuperAdmin, CorporationAdmin, or CompanyAdmin role required',
  })
  async bulkDownloadInvoices(
    @Body() body: BulkInvoiceIdsDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<StreamableFile> {
    try {
      const buffer = await this.stripeService.getInvoicesZipBufferForRequester(
        user.sub,
        user.groups,
        body.invoiceIds,
      );
      return new StreamableFile(buffer, {
        type: 'application/zip',
        disposition: 'attachment; filename="invoices.zip"',
      });
    } catch (err) {
      this.logFinanceEndpointError('bulkDownloadInvoices', err);
      throw err;
    }
  }

  /** Bulk email of invoice PDFs to finance contacts or extra recipients. */
  @Post('invoices/bulk-send')
  @RequireSubmodule(SUBMODULE_KEYS.INVOICE_MANAGEMENT_SEND_BULK)
  @ApiOperation({
    summary: 'Bulk send invoices',
    description:
      'If additional recipient emails are provided, sends invoice PDFs only to those addresses. Otherwise sends each invoice PDF to the company Finance / Billing contact or company admin email, within the requester scope.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - SuperAdmin, CorporationAdmin, or CompanyAdmin role required',
  })
  async bulkSendInvoices(
    @Body() body: BulkSendInvoicesDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse<{ sent: true }>> {
    try {
      await this.stripeService.bulkSendInvoicesForRequester(
        user.sub,
        user.groups,
        body.invoiceIds,
        body.additionalEmails ?? [],
      );
      return ResponseHelper.success(FINANCE_INVOICES_SENT_MSG, { sent: true });
    } catch (err) {
      this.logFinanceEndpointError('bulkSendInvoices', err);
      throw err;
    }
  }

  /** Cursor-paginated Stripe invoice list for Invoice Management. */
  @Get('invoices')
  @RequireSubmodule(SUBMODULE_KEYS.INVOICE_MANAGEMENT_VIEW)
  @ApiOperation({
    summary: 'List Stripe invoices',
    description:
      'Returns invoices from Stripe (newest first). Super Admin only. Optional `createdGte`/`createdLte` and `paymentMethods` (ACH,CC) refine results.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - SuperAdmin, CorporationAdmin, or CompanyAdmin role required',
  })
  async listInvoices(
    @Query() query: ListInvoicesQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse<InvoiceAdminListResult>> {
    try {
      const data = await this.stripeService.listInvoicesForRequester(
        user.sub,
        user.groups,
        query,
      );
      return ResponseHelper.success(FINANCE_INVOICES_FETCHED_MSG, data);
    } catch (err) {
      this.logFinanceEndpointError('listInvoices', err);
      throw err;
    }
  }

  /** Plan type options for the Billing Management plan filter dropdown. */
  @Get('billing/plan-options')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_VIEW)
  @ApiOperation({
    summary: 'Billing filter plan options',
    description:
      'Returns pricing plan ids and labels for the Billing Management plan filter.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async getBillingPlanOptions(): Promise<
    ApiResponse<Array<{ value: string; label: string }>>
  > {
    try {
      const data = await this.stripeService.getBillingPlanFilterOptions();
      return ResponseHelper.success(
        FINANCE_BILLING_PLAN_OPTIONS_FETCHED_MSG,
        data,
      );
    } catch (err) {
      this.logFinanceEndpointError('getBillingPlanOptions', err);
      throw err;
    }
  }

  /** Paginated billing dashboard rows with server-side filters and sort. */
  @Get('billing')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_VIEW)
  @ApiOperation({
    summary: 'List company billing records',
    description:
      'Paginated billing dashboard rows (company, plan, subscription and payment status, renewal). Super Admin only.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async listBillingRecords(
    @Query() query: ListBillingRecordsQueryDto,
  ): Promise<ApiResponse<BillingAdminListResult>> {
    try {
      const data = await this.stripeService.listBillingRecordsForAdmin(query);
      return ResponseHelper.success(FINANCE_BILLING_RECORDS_FETCHED_MSG, data);
    } catch (err) {
      this.logFinanceEndpointError('listBillingRecords', err);
      throw err;
    }
  }

  /** Paginated Stripe-derived billing history for the detail History tab. */
  @Get('billing/companies/:companyId/history')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_VIEW)
  @ApiOperation({
    summary: 'Billing history for company',
    description:
      'Paginated billing events (subscriptions, invoices, payments) for the Billing History tab. Super Admin only.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async listBillingHistory(
    @Param('companyId') companyId: string,
    @Query() query: ListBillingHistoryQueryDto,
  ): Promise<ApiResponse<BillingHistoryListResult>> {
    try {
      const data = await this.stripeService.listBillingHistoryForAdmin(
        companyId,
        query,
      );
      return ResponseHelper.success(FINANCE_BILLING_HISTORY_FETCHED_MSG, data);
    } catch (err) {
      this.logFinanceEndpointError(`listBillingHistory(${companyId})`, err);
      throw err;
    }
  }

  /** One enriched billing row for the company billing detail screen. */
  @Get('billing/companies/:companyId')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_VIEW)
  @ApiOperation({
    summary: 'Billing record detail',
    description: 'Single company billing row for the detail view.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async getBillingRecord(
    @Param('companyId') companyId: string,
  ): Promise<ApiResponse<BillingAdminListItem>> {
    try {
      const row = await this.stripeService.getBillingRecordForAdmin(companyId);
      if (!row) {
        throw new NotFoundException(FINANCE_BILLING_RECORD_NOT_FOUND_MSG);
      }
      return ResponseHelper.success(FINANCE_BILLING_RECORD_FETCHED_MSG, row);
    } catch (err) {
      this.logFinanceEndpointError(`getBillingRecord(${companyId})`, err);
      throw err;
    }
  }

  /** Sets Stripe `cancel_at_period_end` on the company subscription. */
  @Post('billing/companies/:companyId/cancel-subscription')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_CANCEL_REINSTATE)
  @ApiOperation({
    summary: 'Cancel Stripe subscription',
    description:
      'Schedules cancellation at period end on the company Stripe subscription. Super Admin only.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async cancelBillingSubscription(
    @Param('companyId') companyId: string,
    @Body() body: CancelBillingSubscriptionDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse<{ ok: true }>> {
    try {
      const actor = await this.stripeService.resolveBillingSubscriptionActor(
        user.sub,
        user.groups,
      );
      await this.stripeService.cancelCompanySubscriptionForAdmin(
        companyId,
        body,
        actor,
      );
      return ResponseHelper.success(FINANCE_BILLING_CANCEL_SCHEDULED_MSG, {
        ok: true,
      });
    } catch (err) {
      this.logFinanceEndpointError(
        `cancelBillingSubscription(${companyId})`,
        err,
      );
      throw err;
    }
  }

  /** Pays or re-sends the subscription latest invoice via Stripe. */
  @Post('billing/companies/:companyId/retry-payment')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT)
  @ApiOperation({
    summary: 'Retry latest subscription invoice payment',
    description:
      'Attempts Stripe collection on the subscription latest invoice (or send for invoice collection). Super Admin only.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async retryBillingPayment(
    @Param('companyId') companyId: string,
  ): Promise<ApiResponse<{ ok: true }>> {
    try {
      await this.stripeService.retryCompanyPaymentForAdmin(companyId);
      return ResponseHelper.success(FINANCE_BILLING_RETRY_ATTEMPTED_MSG, {
        ok: true,
      });
    } catch (err) {
      this.logFinanceEndpointError(`retryBillingPayment(${companyId})`, err);
      throw err;
    }
  }

  /** Clears `cancel_at_period_end` when the subscription is still active in Stripe. */
  @Post('billing/companies/:companyId/reinstate-subscription')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_CANCEL_REINSTATE)
  @ApiOperation({
    summary: 'Reinstate subscription scheduled for cancellation',
    description:
      'Clears cancel_at_period_end when Stripe still holds the subscription. Super Admin only.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async reinstateBillingSubscription(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse<{ ok: true }>> {
    try {
      const actor = await this.stripeService.resolveBillingSubscriptionActor(
        user.sub,
        user.groups,
      );
      await this.stripeService.reinstateCompanySubscriptionForAdmin(
        companyId,
        actor,
      );
      return ResponseHelper.success(FINANCE_BILLING_REINSTATE_SUCCESS_MSG, {
        ok: true,
      });
    } catch (err) {
      this.logFinanceEndpointError(
        `reinstateBillingSubscription(${companyId})`,
        err,
      );
      throw err;
    }
  }

  /** Allowed upgrade targets and current plan snapshot for Edit Billing. */
  @Get('billing/companies/:companyId/upgrade-options')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT)
  @ApiOperation({
    summary: 'Billing upgrade options',
    description:
      'Returns current plan and allowed upgrade targets for Super Admin Edit Billing.',
  })
  async getBillingUpgradeOptions(
    @Param('companyId') companyId: string,
  ): Promise<ApiResponse<BillingUpgradeOptionsResult>> {
    try {
      const data =
        await this.stripeService.getBillingUpgradeOptionsForAdmin(companyId);
      return ResponseHelper.success(
        FINANCE_BILLING_UPGRADE_OPTIONS_FETCHED_MSG,
        data,
      );
    } catch (err) {
      this.logFinanceEndpointError(
        `getBillingUpgradeOptions(${companyId})`,
        err,
      );
      throw err;
    }
  }

  /** Prorated adjustment preview before confirming a plan upgrade. */
  @Post('billing/companies/:companyId/upgrade-preview')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT)
  @ApiOperation({
    summary: 'Preview billing plan upgrade',
    description:
      'Calculates prorated adjustment for upgrading plan type and/or plan level.',
  })
  async previewBillingUpgrade(
    @Param('companyId') companyId: string,
    @Body() body: BillingUpgradeTargetDto,
  ): Promise<ApiResponse<BillingUpgradePreviewResult>> {
    try {
      const data = await this.stripeService.previewBillingUpgradeForAdmin(
        companyId,
        body.targetPricingPlanId,
      );
      return ResponseHelper.success(
        FINANCE_BILLING_UPGRADE_PREVIEW_FETCHED_MSG,
        data,
      );
    } catch (err) {
      this.logFinanceEndpointError(`previewBillingUpgrade(${companyId})`, err);
      throw err;
    }
  }

  /** Applies a validated plan upgrade and charges the subscriber. */
  @Post('billing/companies/:companyId/upgrade')
  @UseGuards(SuperAdminGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT)
  @ApiOperation({
    summary: 'Apply billing plan upgrade',
    description:
      'Upgrades subscription plan/level, records audit, and notifies billing contact.',
  })
  async applyBillingUpgrade(
    @Param('companyId') companyId: string,
    @Body() body: BillingUpgradeTargetDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse<BillingUpgradeApplyResult>> {
    try {
      const actor = await this.stripeService.resolveBillingSubscriptionActor(
        user.sub,
        user.groups,
      );
      const data = await this.stripeService.applyBillingUpgradeForAdmin(
        companyId,
        body.targetPricingPlanId,
        actor,
      );
      return ResponseHelper.success(FINANCE_BILLING_UPGRADE_APPLIED_MSG, data);
    } catch (err) {
      this.logFinanceEndpointError(`applyBillingUpgrade(${companyId})`, err);
      throw err;
    }
  }

  /** Proxies Stripe invoice PDF bytes for in-app preview or download. */
  @Get('invoices/:invoiceId/pdf')
  @RequireSubmodule(SUBMODULE_KEYS.INVOICE_MANAGEMENT_DOWNLOAD)
  @ApiOperation({
    summary: 'Invoice PDF (binary)',
    description:
      'Returns the invoice PDF for authenticated preview or download. Super Admin only.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - SuperAdmin, CorporationAdmin, or CompanyAdmin role required',
  })
  async getInvoicePdf(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<StreamableFile> {
    try {
      const buffer = await this.stripeService.getInvoicePdfBufferForRequester(
        user.sub,
        user.groups,
        invoiceId,
      );
      return new StreamableFile(buffer, {
        type: 'application/pdf',
        disposition: `inline; filename="${encodeURIComponent(invoiceId)}.pdf"`,
      });
    } catch (err) {
      this.logFinanceEndpointError(`getInvoicePdf(${invoiceId})`, err);
      throw err;
    }
  }

  /** Sends a single invoice via Stripe or SES to the company billing contact. */
  @Post('invoices/:invoiceId/send')
  @RequireSubmodule(SUBMODULE_KEYS.INVOICE_MANAGEMENT_SEND_INDIVIDUAL)
  @ApiOperation({
    summary: 'Send invoice email',
    description:
      'Sends the Stripe invoice to the customer via email within the requester scope.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - SuperAdmin, CorporationAdmin, or CompanyAdmin role required',
  })
  async sendInvoice(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse<{ sent: true }>> {
    try {
      await this.stripeService.sendInvoiceForRequester(
        user.sub,
        user.groups,
        invoiceId,
      );
      return ResponseHelper.success(FINANCE_INVOICE_SENT_MSG, { sent: true });
    } catch (err) {
      this.logFinanceEndpointError(`sendInvoice(${invoiceId})`, err);
      throw err;
    }
  }
}
