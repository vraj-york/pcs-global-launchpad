import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiResponse } from '../common';
import { ResponseHelper } from '../common/response.helper';
import { CancelBillingSubscriptionDto } from '../stripe/dto/cancel-billing-subscription.dto';
import {
  FINANCE_BILLING_CANCEL_SCHEDULED_MSG,
  FINANCE_BILLING_HISTORY_FETCHED_MSG,
  FINANCE_BILLING_RECORD_FETCHED_MSG,
  FINANCE_BILLING_RETRY_ATTEMPTED_MSG,
  FINANCE_BILLING_REINSTATE_SUCCESS_MSG,
} from '../stripe/stripe.constants';
import type { BillingAdminListItem } from '../stripe/stripe-billing-admin.types';
import type { BillingHistoryListResult } from '../stripe/stripe-billing-history.types';
import { CompanyAdminBillingHistoryQueryDto } from './dto/company-admin-billing-history-query.dto';
import { CompanyAdminBillingScopeQueryDto } from './dto/company-admin-billing-query.dto';
import { CreateCompanyAdminCheckoutDto } from './dto/create-company-admin-checkout.dto';
import { CompanyAdminPortalService } from './company-admin-portal.service';

@ApiTags('Company admin')
@Controller('company-admin')
@UseGuards(CognitoAuthGuard, AuthorizationGuard)
@ApiBearerAuth()
export class CompanyAdminPortalController {
  private readonly logger = new Logger(CompanyAdminPortalController.name);

  constructor(private readonly portalService: CompanyAdminPortalService) {}

  @Get('me/onboarding-review')
  @RequireSubmodule(SUBMODULE_KEYS.DASHBOARD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Company admin dashboard (all companies)',
    description:
      'Returns every company this user administers, with plan/checkout flags per company. Requires CompanyAdmin group.',
  })
  @SwaggerApiResponse({ status: 200, description: '{ companies: [...] }' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getOnboardingReview(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse> {
    try {
      const data = await this.portalService.getOnboardingReview(user.sub);
      return ResponseHelper.success('Onboarding review loaded', data);
    } catch (err) {
      this.logger.warn(
        `getOnboardingReview failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Post('me/checkout-session')
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create Stripe Checkout session for a company',
    description:
      'Opens subscription checkout. Requires CompanyAdmin. If `companyId` is omitted, the user must have exactly one company; otherwise pass the target company UUID. Stripe receives only a promo code persisted on the company plan seat during Super Admin Plan & Seats setup when that value normalizes to a valid code; otherwise no promotion is pre-applied (no URL/body override and no automatic best-promo selection). Optional `onsiteTrainingOption` is accepted only when the stored plan-seat option is `off`; once Super Admin has set `1_day` or `2_days`, Company Admin cannot override it at checkout.',
  })
  @SwaggerApiResponse({ status: 201, description: 'Checkout URL returned' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  async createCheckoutSession(
    @CurrentUser() user: { sub: string },
    @Body() body: CreateCompanyAdminCheckoutDto,
  ): Promise<ApiResponse<{ url: string }>> {
    try {
      return await this.portalService.createCheckoutSessionForUser(
        user.sub,
        body.companyId,
        body.onsiteTrainingOption,
        body.assessmentQuantity,
      );
    } catch (err) {
      this.logger.warn(
        `createCheckoutSession failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Get('me/billing')
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Company admin billing summary',
    description:
      'Returns subscription and payment details for a company the user administers.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Billing row returned' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getBilling(
    @CurrentUser() user: { sub: string },
    @Query() scope: CompanyAdminBillingScopeQueryDto,
  ): Promise<ApiResponse<BillingAdminListItem>> {
    try {
      const data = await this.portalService.getBillingForUser(
        user.sub,
        scope.companyId,
      );
      return ResponseHelper.success(FINANCE_BILLING_RECORD_FETCHED_MSG, data);
    } catch (err) {
      this.logger.warn(
        `getBilling failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Get('me/billing/history')
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_VIEW)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Company admin billing history',
    description: 'Paginated billing events for a company the user administers.',
  })
  @SwaggerApiResponse({ status: 200, description: 'History list returned' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async listBillingHistory(
    @CurrentUser() user: { sub: string },
    @Query() query: CompanyAdminBillingHistoryQueryDto,
  ): Promise<ApiResponse<BillingHistoryListResult>> {
    try {
      const { companyId, ...historyQuery } = query;
      const data = await this.portalService.listBillingHistoryForUser(
        user.sub,
        companyId,
        historyQuery,
      );
      return ResponseHelper.success(FINANCE_BILLING_HISTORY_FETCHED_MSG, data);
    } catch (err) {
      this.logger.warn(
        `listBillingHistory failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Post('me/billing/cancel-subscription')
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_CANCEL_REINSTATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel subscription (company admin)',
    description:
      'Schedules cancellation at period end for the admin company subscription.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Cancellation scheduled' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async cancelSubscription(
    @CurrentUser() user: { sub: string; groups: string[] },
    @Query() scope: CompanyAdminBillingScopeQueryDto,
    @Body() body: CancelBillingSubscriptionDto,
  ): Promise<ApiResponse<{ ok: true }>> {
    try {
      await this.portalService.cancelSubscriptionForUser(
        user.sub,
        scope.companyId,
        body,
        user.groups,
      );
      return ResponseHelper.success(FINANCE_BILLING_CANCEL_SCHEDULED_MSG, {
        ok: true,
      });
    } catch (err) {
      this.logger.warn(
        `cancelSubscription failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Post('me/billing/retry-payment')
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry subscription payment (company admin)',
  })
  @SwaggerApiResponse({ status: 200, description: 'Retry attempted' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async retryPayment(
    @CurrentUser() user: { sub: string },
    @Query() scope: CompanyAdminBillingScopeQueryDto,
  ): Promise<ApiResponse<{ ok: true }>> {
    try {
      await this.portalService.retryPaymentForUser(user.sub, scope.companyId);
      return ResponseHelper.success(FINANCE_BILLING_RETRY_ATTEMPTED_MSG, {
        ok: true,
      });
    } catch (err) {
      this.logger.warn(
        `retryPayment failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Post('me/billing/reinstate-subscription')
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_CANCEL_REINSTATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reinstate subscription (company admin)',
    description:
      'Clears cancel_at_period_end when the subscription is still active in Stripe.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Subscription reinstated' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async reinstateSubscription(
    @CurrentUser() user: { sub: string; groups: string[] },
    @Query() scope: CompanyAdminBillingScopeQueryDto,
  ): Promise<ApiResponse<{ ok: true }>> {
    try {
      await this.portalService.reinstateSubscriptionForUser(
        user.sub,
        scope.companyId,
        user.groups,
      );
      return ResponseHelper.success(FINANCE_BILLING_REINSTATE_SUCCESS_MSG, {
        ok: true,
      });
    } catch (err) {
      this.logger.warn(
        `reinstateSubscription failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Post('me/billing/request-plan-change')
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request subscription plan change (company admin)',
    description:
      'Creates a support request and notifies the support team to discuss plan options.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Plan change request submitted',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async requestPlanChange(
    @CurrentUser() user: { sub: string },
    @Query() scope: CompanyAdminBillingScopeQueryDto,
  ): Promise<ApiResponse<{ id: string }>> {
    try {
      return await this.portalService.requestPlanChangeForUser(
        user.sub,
        scope.companyId,
      );
    } catch (err) {
      this.logger.warn(
        `requestPlanChange failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  @Get('me/billing/invoices/:invoiceId/pdf')
  @RequireSubmodule(SUBMODULE_KEYS.INVOICE_MANAGEMENT_DOWNLOAD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download invoice PDF (company admin)',
  })
  @SwaggerApiResponse({ status: 200, description: 'PDF bytes' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getInvoicePdf(
    @CurrentUser() user: { sub: string },
    @Query() scope: CompanyAdminBillingScopeQueryDto,
    @Param('invoiceId') invoiceId: string,
  ): Promise<StreamableFile> {
    try {
      const buffer = await this.portalService.getInvoicePdfForUser(
        user.sub,
        scope.companyId,
        invoiceId,
      );
      return new StreamableFile(buffer, {
        type: 'application/pdf',
        disposition: `inline; filename="${encodeURIComponent(invoiceId)}.pdf"`,
      });
    } catch (err) {
      this.logger.warn(
        `getInvoicePdf failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }
}
