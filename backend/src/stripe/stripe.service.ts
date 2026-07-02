import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  type CorporationCompany,
  type PromoDiscountType,
} from '@prisma/client';
import Stripe from 'stripe';
import { CompanyService } from '../company/company.service';
import {
  computeOneTimePlanDisplayInvoiceAmount,
  majorUnitsToInvoiceCents,
} from '../company/company-plan-invoice.util';
import { COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG } from '../company/constants/company.messages';
import { COMPANY_STATUS } from '../company/constants/company.status';
import { CORPORATION_ADMIN_APP_USER_TYPE } from '../corporation/constants/corporation.messages';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import {
  APP_USER_STATUS,
  APP_USERS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG,
} from '../user/constants/app-user.constants';
import {
  INDIVIDUAL_PAYMENT_STATUS,
  STRIPE_CHECKOUT_INDIVIDUAL_USER_META,
  STRIPE_INDIVIDUAL_INVOICE_EMAIL_SENT_META,
} from '../user/constants/individual-payment.constants';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma';
import {
  ApiResponse,
  formatDateShort,
  formatPlanEmployeeRange,
  ResponseHelper,
} from '../common';
import { CORPORATION_STATUS } from '../corporation/constants';
import {
  CHECKOUT_SESSION_CREATED_MSG,
  STRIPE_ALREADY_ACTIVE_SUBSCRIPTION_MSG,
  STRIPE_CHECKOUT_CLOSED_CORPORATION_MSG,
  STRIPE_CHECKOUT_NO_URL_MSG,
  STRIPE_CHECKOUT_PROMO_CODE_NOT_FOUND_MSG,
  STRIPE_CHECKOUT_PROMO_NOT_ACTIVE_MSG,
  STRIPE_CHECKOUT_PROMO_NOT_ELIGIBLE_MSG,
  STRIPE_CHECKOUT_PROMO_PLAN_MISMATCH_MSG,
  STRIPE_CHECKOUT_URLS_MISSING_MSG,
  STRIPE_INVALID_SIGNATURE_MSG,
  STRIPE_MISSING_STRIPE_SIGNATURE_HEADER_MSG,
  STRIPE_MONTHLY_ANNUAL_ONLY_MSG,
  STRIPE_NOT_CONFIGURED_MSG,
  STRIPE_PRICING_PLAN_NOT_LINKED_MSG,
  STRIPE_CHECKOUT_MONTHLY_TRIAL_END_MISSING_MSG,
  STRIPE_CHECKOUT_MONTHLY_TRIAL_END_IN_PAST_MSG,
  STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED_MSG,
  FINANCE_BULK_EMAIL_SUBJECT,
  SUBSCRIPTION_PLAN_TYPES,
  STRIPE_PROMO_USAGE_CHECKOUT_MAX_PAGES,
  FINANCE_BILLING_CONTACT_TYPE,
  STRIPE_COMPANY_INVOICE_EMAIL_SENT_META,
  FINANCE_BILLING_INVOICE_ALREADY_PAID_MSG,
  FINANCE_BILLING_NO_INVOICE_TO_RETRY_MSG,
  FINANCE_BILLING_NO_STRIPE_SUBSCRIPTION_MSG,
  FINANCE_BILLING_NO_SUBSCRIPTION_ID_MSG,
  FINANCE_BILLING_NO_SUBSCRIPTION_ON_FILE_MSG,
  FINANCE_BILLING_SUBSCRIPTION_ALREADY_CANCELED_MSG,
  FINANCE_BILLING_SUBSCRIPTION_FULLY_CANCELED_MSG,
  STRIPE_IMPLEMENTATION_FEE_PRICE_ID_NOT_CONFIGURED_MSG,
  STRIPE_ONSITE_TRAINING_PRICE_ID_NOT_CONFIGURED_MSG,
  ONSITE_TRAINING_QUANTITY_BY_OPTION,
  FINANCE_BILLING_STRIPE_PAYMENT_FAILED_MSG,
  FINANCE_BILLING_RECORD_NOT_FOUND_MSG,
  FINANCE_INVOICE_ACCESS_DENIED_MSG,
  FINANCE_INVOICES_FORBIDDEN_MSG,
  FINANCE_BILLING_UPGRADE_COMPANY_ADMIN_EMAIL_SUBJECT,
  FINANCE_BILLING_UPGRADE_CORPORATION_ADMIN_EMAIL_SUBJECT,
} from './stripe.constants';
import {
  getInvoiceEmailHtml,
  getInvoiceEmailText,
} from './templates/invoice-email.template';
import {
  getPlanUpgradeCompanyAdminEmailHtml,
  getPlanUpgradeCompanyAdminEmailText,
  getPlanUpgradeCorporationAdminEmailHtml,
  getPlanUpgradeCorporationAdminEmailText,
} from './templates/plan-upgrade-email.template';
import type { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import type {
  InvoiceAdminListItem,
  InvoiceAdminListResult,
  InvoiceAdminPaymentType,
  InvoiceAdminUiStatus,
} from './stripe-admin-invoice.types';
import type { ListBillingRecordsQueryDto } from './dto/list-billing-records-query.dto';
import type { CancelBillingSubscriptionDto } from './dto/cancel-billing-subscription.dto';
import type { ListBillingHistoryQueryDto } from './dto/list-billing-history-query.dto';
import type {
  BillingHistoryActorKind,
  BillingHistoryEventType,
  BillingHistoryListResult,
} from './stripe-billing-history.types';
import {
  billingActorRoleLabel,
  resolveBillingActorKind,
  type BillingSubscriptionActorContext,
} from './stripe-billing-actor.util';
import {
  BILLING_HISTORY_STRIPE_EVENT_TYPES,
  compareBillingHistoryEvents,
  extractStripeEventCustomerId,
  mapStripeEventToBillingHistory,
  shouldSkipStripeHistoryEventForAudit,
  type PlanByStripePriceId,
} from './stripe-billing-history.util';
import type {
  BillingAdminListItem,
  BillingAdminListResult,
  BillingPaymentMethodType,
  BillingPaymentUiStatus,
  BillingSubscriptionUiStatus,
} from './stripe-billing-admin.types';
import type {
  BillingUpgradeApplyResult,
  BillingUpgradeOptionsResult,
  BillingUpgradePlanPick,
  BillingUpgradePlanSnapshot,
  BillingUpgradePreviewResult,
} from './stripe-billing-upgrade.types';
import {
  FINANCE_BILLING_UPGRADE_CUSTOM_TIER_MSG,
  FINANCE_BILLING_UPGRADE_INACTIVE_SUBSCRIPTION_MSG,
  FINANCE_BILLING_UPGRADE_NOT_ELIGIBLE_MSG,
  FINANCE_BILLING_UPGRADE_NO_CURRENT_PLAN_MSG,
  FINANCE_BILLING_UPGRADE_NO_PAYMENT_METHOD_MSG,
  FINANCE_BILLING_UPGRADE_NO_STRIPE_CUSTOMER_MSG,
  FINANCE_BILLING_UPGRADE_STRIPE_REQUEST_FAILED_MSG,
  FINANCE_BILLING_UPGRADE_SUBSCRIPTION_CANCELED_MSG,
  FINANCE_BILLING_UPGRADE_SUBSCRIPTION_INACTIVE_MSG,
  FINANCE_BILLING_UPGRADE_SUBSCRIPTION_NOT_FOUND_MSG,
} from './stripe-billing-upgrade.constants';
import {
  checkoutQuantityFromPlan,
  filterAllowedUpgradeTargets,
  isEligibleUpgradeSourcePlan,
  isOneTimePlanType,
  planLevelLabel,
  planLevelRank,
  validateBillingUpgrade,
} from './stripe-billing-upgrade.util';
import type { PlanSeatTrialPick } from './stripe.types';
import { normalizeOptionalPromoCodeInput } from '../promo/promo-code-input.util';

/** True when the promo row has no expiry or `expiresAt` is still in the future (schedule still open). */
function isPromoScheduleOpen(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return true;
  }
  return expiresAt.getTime() > Date.now();
}

type CheckoutPromoPick = {
  id: string;
  code: string;
  planTypeId: string;
  limitToAssignment: boolean;
  corporationId: string | null;
  companyId: string | null;
  stripePromotionCodeId: string;
  expiresAt: Date | null;
  discountType: PromoDiscountType;
  percentOff: Prisma.Decimal | null;
  amountOffMinor: number | null;
  currency: string | null;
  createdAt: Date;
};

/** Estimated discount on the first subscription invoice (minor units), for comparing promos. */
function estimatedFirstInvoiceBenefitMinor(
  row: Pick<
    CheckoutPromoPick,
    'discountType' | 'percentOff' | 'amountOffMinor'
  >,
  lineSubtotalMinor: number,
): number {
  if (lineSubtotalMinor <= 0) {
    return 0;
  }
  if (row.discountType === 'percent') {
    const p = Number(row.percentOff ?? 0);
    return Math.min(
      lineSubtotalMinor,
      Math.floor((lineSubtotalMinor * p) / 100),
    );
  }
  const fixed = row.amountOffMinor ?? 0;
  return Math.min(Math.max(0, fixed), lineSubtotalMinor);
}

/**
 * Stripe tiered prices use `line_items[].quantity` as the billed unit count.
 * For employee-band plans, use the band maximum (e.g. 50 for 26–50) so the correct tier applies.
 */
function checkoutLineItemQuantityFromPlan(plan: {
  employeeRangeMax: number | null;
  employeeRangeMin: number | null;
}): number {
  if (plan.employeeRangeMax != null) {
    return plan.employeeRangeMax;
  }
  if (plan.employeeRangeMin != null) {
    return plan.employeeRangeMin;
  }
  return 1;
}

/** End of calendar day in UTC (23:59:59), as Unix seconds for Stripe `subscription_data.trial_end`. */
function trialEndCalendarDateToUnixSeconds(endDate: Date): number {
  const y = endDate.getUTCFullYear();
  const m = endDate.getUTCMonth();
  const d = endDate.getUTCDate();
  return Math.floor(Date.UTC(y, m, d, 23, 59, 59) / 1000);
}

/**
 * For **monthly** subscription checkout only: when `zeroTrial` is false, returns Stripe `trial_end`
 * so the recurring subscription enters trialing until that instant; when `zeroTrial` is true or
 * plan is not monthly, returns `undefined` (charge recurring on first invoice as today).
 */
function computeStripeTrialEndUnixForMonthlySubscription(
  planTypeId: string,
  planSeat: PlanSeatTrialPick | undefined,
): number | undefined {
  if (planTypeId !== 'monthly') {
    return undefined;
  }
  if (!planSeat || planSeat.zeroTrial !== false) {
    return undefined;
  }
  if (!planSeat.trialEndDate) {
    throw new BadRequestException(
      STRIPE_CHECKOUT_MONTHLY_TRIAL_END_MISSING_MSG,
    );
  }
  const trialEndUnix = trialEndCalendarDateToUnixSeconds(planSeat.trialEndDate);
  const nowUnix = Math.floor(Date.now() / 1000);
  if (trialEndUnix <= nowUnix) {
    throw new BadRequestException(
      STRIPE_CHECKOUT_MONTHLY_TRIAL_END_IN_PAST_MSG,
    );
  }
  return trialEndUnix;
}

/** Optional add-on stored on plan seats; used to decide which Stripe Price ID to attach. */
type OnsiteTrainingOption = 'off' | '1_day' | '2_days';

/** Stripe InvoiceItem metadata: marks fees attached after trial checkout for `invoice.paid` handling. */
const STRIPE_DEFERRED_FEE_META_KEY = 'bsp_deferred_fee';
const STRIPE_DEFERRED_FEE_IMPLEMENTATION = 'implementation';
const STRIPE_DEFERRED_FEE_ONSITE = 'onsite_training';

/**
 * Whether the session's `discounts` array references the given Stripe Promotion Code id
 * (handles expanded object or string id shapes from the API).
 */
function checkoutSessionUsesPromotionCode(
  session: Stripe.Checkout.Session,
  stripePromotionCodeId: string,
): boolean {
  const discounts = session.discounts;
  if (!discounts?.length) {
    return false;
  }
  for (const d of discounts) {
    const ref = d.promotion_code;
    const id =
      typeof ref === 'string'
        ? ref
        : ref &&
            typeof ref === 'object' &&
            'id' in ref &&
            typeof (ref as { id?: string }).id === 'string'
          ? (ref as { id: string }).id
          : undefined;
    if (id === stripePromotionCodeId) {
      return true;
    }
  }
  return false;
}

type InvoiceFinanceRole = 'super_admin' | 'corporation_admin' | 'company_admin';

type InvoiceAccessScope = {
  role: InvoiceFinanceRole;
  corporationId: string | null;
  allowedCompanyIds: Set<string> | null;
};

/**
 * Stripe API surface for this app: checkout sessions, webhooks, invoice admin listing,
 * finance email helpers, and Super Admin promo coupon / promotion code lifecycle.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  /** Present only when `STRIPE_SECRET_KEY` is set; webhook signature verification uses `Stripe.webhooks` and does not need this. */
  private readonly stripe: Stripe | null;

  /**
   * Initializes an optional Stripe SDK client from config; when the secret is missing,
   * {@link requireStripe} throws so checkout and admin invoice paths fail fast with a clear message.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => CompanyService))
    private readonly companyService: CompanyService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set; Stripe API calls will fail until configured',
      );
      this.stripe = null;
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-02-24.acacia',
      });
    }
  }

  /** Throws if `STRIPE_SECRET_KEY` was not configured at startup. */
  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(STRIPE_NOT_CONFIGURED_MSG);
    }
    return this.stripe;
  }

  /**
   * Reads a Stripe Price id from configuration, throwing a 503 with a clear setup message
   * when missing. Used for onboarding fees (implementation + onsite training) that are
   * defined as one-time Prices in Stripe.
   */
  private requireStripePriceId(
    envName: string,
    missingMessage: string,
  ): string {
    const priceId = this.config.get<string>(envName)?.trim();
    if (!priceId) {
      throw new ServiceUnavailableException(missingMessage);
    }
    return priceId;
  }

  /** Loads a Stripe Price (used by pricing endpoint to expose configured onboarding fees). */
  async retrievePrice(priceId: string): Promise<Stripe.Price> {
    return this.requireStripe().prices.retrieve(priceId);
  }

  /**
   * Resolves a configured Stripe Price id by env var name and returns the Stripe Price.
   * Throws a 503 with a clear setup message when the env var is not set.
   */
  async retrieveConfiguredPrice(
    envName: string,
    missingMessage: string,
  ): Promise<Stripe.Price> {
    const priceId = this.requireStripePriceId(envName, missingMessage);
    return this.retrievePrice(priceId);
  }

  /**
   * Gate for applying a promo at checkout: promotion must be active in Stripe, within schedule,
   * and under `max_redemptions` when that cap is set.
   */
  private notExpiredAndWithinRedemptions(
    row: CheckoutPromoPick,
    stripeSummary: {
      active: boolean;
      timesRedeemed: number;
      maxRedemptions: number | null;
    },
  ): boolean {
    if (!stripeSummary.active) {
      return false;
    }
    if (!isPromoScheduleOpen(row.expiresAt)) {
      return false;
    }
    if (
      stripeSummary.maxRedemptions != null &&
      stripeSummary.timesRedeemed >= stripeSummary.maxRedemptions
    ) {
      return false;
    }
    return true;
  }

  /** First subscription invoice line subtotal in minor units: `Price.unit_amount × quantity` (0 if amount missing). */
  private async getRecurringLineSubtotalMinor(
    stripePriceId: string,
    quantity: number,
  ): Promise<number> {
    const stripe = this.requireStripe();
    const price = await stripe.prices.retrieve(stripePriceId);
    const unit = price.unit_amount;
    if (unit == null) {
      return 0;
    }
    return Math.max(0, unit * quantity);
  }

  /**
   * Next recurring charge after upgrade: Stripe price × seat quantity when available,
   * otherwise pricing plan list price (matches plan-seat invoice amount in billing UI).
   */
  private async resolveUpgradeNextBillingAmountCents(
    target: BillingUpgradePlanPick,
    quantity: number,
  ): Promise<number | null> {
    if (target.planTypeId === 'one_time') {
      return null;
    }

    if (target.stripePriceId) {
      const fromStripe = await this.getRecurringLineSubtotalMinor(
        target.stripePriceId,
        quantity,
      );
      if (fromStripe > 0) {
        return fromStripe;
      }
    }

    const listPriceDollars = Number(target.price.toString());
    if (Number.isFinite(listPriceDollars) && listPriceDollars > 0) {
      return Math.round(listPriceDollars * 100);
    }

    return null;
  }

  /** Among redeemable rows in one tier, pick the Stripe promotion with the highest first-invoice benefit. */
  private async bestRedeemableStripePromotionId(
    rows: CheckoutPromoPick[],
    lineSubtotalMinor: number,
  ): Promise<string | undefined> {
    const scored: { pid: string; benefit: number; createdAt: number }[] = [];
    for (const row of rows) {
      const pid = row.stripePromotionCodeId?.trim();
      if (!pid) {
        continue;
      }
      const summary = await this.retrievePromotionCodeSummary(pid);
      if (!this.notExpiredAndWithinRedemptions(row, summary)) {
        continue;
      }
      const benefit = estimatedFirstInvoiceBenefitMinor(row, lineSubtotalMinor);
      scored.push({
        pid,
        benefit,
        createdAt: row.createdAt.getTime(),
      });
    }
    if (scored.length === 0) {
      return undefined;
    }
    scored.sort((a, b) => {
      if (b.benefit !== a.benefit) {
        return b.benefit - a.benefit;
      }
      return b.createdAt - a.createdAt;
    });
    return scored[0].pid;
  }

  /**
   * Throws when an explicitly requested promo does not match checkout context: plan type must match;
   * if assignment-limited, corporation (and company when set on the row) must match the checkout company.
   */
  private validateExplicitCheckoutPromo(
    row: CheckoutPromoPick,
    checkout: { planTypeId: string; companyId: string; corporationId: string },
  ): void {
    if (row.planTypeId !== checkout.planTypeId) {
      throw new BadRequestException(STRIPE_CHECKOUT_PROMO_PLAN_MISMATCH_MSG);
    }
    if (!row.limitToAssignment) {
      return;
    }
    if (row.corporationId !== checkout.corporationId) {
      throw new BadRequestException(STRIPE_CHECKOUT_PROMO_NOT_ELIGIBLE_MSG);
    }
    if (row.companyId != null && row.companyId !== checkout.companyId) {
      throw new BadRequestException(STRIPE_CHECKOUT_PROMO_NOT_ELIGIBLE_MSG);
    }
  }

  /**
   * Resolves which Stripe Promotion Code id to apply at Checkout Session creation.
   * Auto mode (no `explicitPromoCode`): company-scoped → corporation-scoped → unrestricted;
   * within each tier, the redeemable promo with the highest estimated first-invoice benefit wins.
   * Explicit code: that row only, with plan + assignment validation.
   */
  private async resolveStripePromotionForCheckoutSession(params: {
    planTypeId: string;
    companyId: string;
    corporationId: string;
    explicitPromoCode?: string | null;
    /**
     * When true and there is no valid explicit code, skip company/corp/global auto-pick
     * (used for company-admin onboarding so only a Super Admin–saved plan-seat code applies).
     */
    skipAutoPromoWhenNoExplicitCode?: boolean;
    /** Minor units for one billing line (price × quantity); used only for auto tier benefit ranking. */
    lineSubtotalMinor: number;
  }): Promise<string | undefined> {
    const { planTypeId, companyId, corporationId } = params;
    const usableExpiry = {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };
    const pickSelect = {
      id: true,
      code: true,
      planTypeId: true,
      limitToAssignment: true,
      corporationId: true,
      companyId: true,
      stripePromotionCodeId: true,
      expiresAt: true,
      discountType: true,
      percentOff: true,
      amountOffMinor: true,
      currency: true,
      createdAt: true,
    } as const;

    const explicitCode = normalizeOptionalPromoCodeInput(
      params.explicitPromoCode,
    );
    if (!explicitCode && params.skipAutoPromoWhenNoExplicitCode) {
      return undefined;
    }
    if (explicitCode) {
      const row = await this.prisma.promoCode.findFirst({
        where: { code: explicitCode, deletedAt: null },
        select: pickSelect,
      });
      if (!row) {
        throw new BadRequestException(STRIPE_CHECKOUT_PROMO_CODE_NOT_FOUND_MSG);
      }
      this.validateExplicitCheckoutPromo(row, {
        planTypeId,
        companyId,
        corporationId,
      });
      const pid = row.stripePromotionCodeId?.trim();
      if (!pid) {
        throw new BadRequestException(STRIPE_CHECKOUT_PROMO_NOT_ACTIVE_MSG);
      }
      const summary = await this.retrievePromotionCodeSummary(pid);
      if (!this.notExpiredAndWithinRedemptions(row, summary)) {
        throw new BadRequestException(STRIPE_CHECKOUT_PROMO_NOT_ACTIVE_MSG);
      }
      return pid;
    }

    const companyRows = await this.prisma.promoCode.findMany({
      where: {
        planTypeId,
        limitToAssignment: true,
        companyId,
        corporationId,
        deletedAt: null,
        ...usableExpiry,
      },
      take: 50,
      select: pickSelect,
    });
    const fromCompany = await this.bestRedeemableStripePromotionId(
      companyRows,
      params.lineSubtotalMinor,
    );
    if (fromCompany) {
      return fromCompany;
    }

    const corpRows = await this.prisma.promoCode.findMany({
      where: {
        planTypeId,
        limitToAssignment: true,
        companyId: null,
        corporationId,
        deletedAt: null,
        ...usableExpiry,
      },
      take: 50,
      select: pickSelect,
    });
    const fromCorp = await this.bestRedeemableStripePromotionId(
      corpRows,
      params.lineSubtotalMinor,
    );
    if (fromCorp) {
      return fromCorp;
    }

    const globalRows = await this.prisma.promoCode.findMany({
      where: {
        planTypeId,
        limitToAssignment: false,
        deletedAt: null,
        ...usableExpiry,
      },
      take: 50,
      select: pickSelect,
    });
    return this.bestRedeemableStripePromotionId(
      globalRows,
      params.lineSubtotalMinor,
    );
  }

  /**
   * Creates a Stripe Checkout Session for a company.
   * Monthly/annual: `mode: subscription` (recurring plan + one-time fees as configured).
   * **Monthly only:** when `company_plan_seats.zero_trial` is false, the subscription is created
   * with Stripe `trial_end` at the end of the stored trial end date so recurring billing starts after the trial;
   * when `zero_trial` is true (or plan seat is missing), no subscription trial is applied and checkout charges the first cycle per Stripe rules.
   * Individual (`one_time`): `mode: payment` with only the plan line item (no
   * implementation fee or onsite training add-ons; no subscription).
   * New customers use the finance/billing key contact email if set, otherwise the company admin app user email.
   */
  async createCheckoutSession(params: {
    corporationId: string;
    companyId: string;
    pricingPlanId: string;
    /** When set, only this code is validated and applied (no tier auto-pick). */
    promoCode?: string | null;
    /** Effective onsite training selection for this checkout (`off | 1_day | 2_days`). */
    onsiteTrainingOption?: OnsiteTrainingOption;
    /** If true, webhook auto-sends invoice email after successful paid checkout completion. */
    autoSendInvoiceEmailAfterCheckout?: boolean;
    /**
     * When true and `promoCode` is absent/blank after normalization, do not run
     * company/corporation/global auto promo resolution (Stripe session gets no pre-applied discount).
     */
    skipAutoPromoWhenNoExplicitCode?: boolean;
    /** For `one_time` company checkout: number of assessments to purchase (defaults to 1). */
    assessmentQuantity?: number;
  }): Promise<ApiResponse<{ url: string; checkoutSessionId?: string }>> {
    const {
      corporationId,
      companyId,
      pricingPlanId,
      promoCode,
      onsiteTrainingOption: onsiteTrainingOptionOverride,
      autoSendInvoiceEmailAfterCheckout,
      skipAutoPromoWhenNoExplicitCode,
      assessmentQuantity,
    } = params;

    const stripe = this.requireStripe();

    const successUrl = this.config.get<string>('STRIPE_CHECKOUT_SUCCESS_URL');
    const cancelUrl = this.config.get<string>('STRIPE_CHECKOUT_CANCEL_URL');
    if (!successUrl?.trim() || !cancelUrl?.trim()) {
      throw new BadRequestException(STRIPE_CHECKOUT_URLS_MISSING_MSG);
    }

    const corporation = await this.prisma.corporation.findUnique({
      where: { id: corporationId },
      select: { id: true, status: true },
    });
    if (!corporation) {
      throw new NotFoundException(
        `Corporation with ID "${corporationId}" not found`,
      );
    }
    if (corporation.status === CORPORATION_STATUS.CLOSED) {
      throw new BadRequestException(STRIPE_CHECKOUT_CLOSED_CORPORATION_MSG);
    }

    // Minimal company row: `legalName` becomes Stripe Customer `name` (registered entity, not DBA).
    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, corporationId, deletedAt: null },
      select: {
        id: true,
        corporationId: true,
        legalName: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        implementationFeeChargedAt: true,
        planSeat: {
          select: {
            onsiteTrainingOption: true,
            zeroTrial: true,
            trialEndDate: true,
          },
        },
        appKeyContacts: {
          where: { contactType: FINANCE_BILLING_CONTACT_TYPE, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { email: true },
        },
      },
    });
    if (!company) {
      throw new NotFoundException(
        `Company with ID "${companyId}" not found for corporation "${corporationId}"`,
      );
    }

    const activeStatuses = ['active', 'trialing'];
    if (
      company.subscriptionStatus &&
      activeStatuses.includes(company.subscriptionStatus)
    ) {
      throw new BadRequestException(STRIPE_ALREADY_ACTIVE_SUBSCRIPTION_MSG);
    }

    const pricingPlan = await this.prisma.pricingPlan.findUnique({
      where: { id: pricingPlanId },
      select: {
        id: true,
        planTypeId: true,
        stripePriceId: true,
        employeeRangeMin: true,
        employeeRangeMax: true,
      },
    });
    if (!pricingPlan) {
      throw new NotFoundException(
        `Pricing plan with ID "${pricingPlanId}" not found`,
      );
    }
    if (!SUBSCRIPTION_PLAN_TYPES.has(pricingPlan.planTypeId)) {
      throw new BadRequestException(STRIPE_MONTHLY_ANNUAL_ONLY_MSG);
    }
    if (!pricingPlan.stripePriceId) {
      throw new BadRequestException(STRIPE_PRICING_PLAN_NOT_LINKED_MSG);
    }

    const isOneTimePlan = pricingPlan.planTypeId === 'one_time';

    const monthlyTrialEndUnix = isOneTimePlan
      ? undefined
      : computeStripeTrialEndUnixForMonthlySubscription(
          pricingPlan.planTypeId,
          company.planSeat
            ? {
                zeroTrial: company.planSeat.zeroTrial,
                trialEndDate: company.planSeat.trialEndDate,
              }
            : null,
        );
    const deferOneTimeFeesPostTrial =
      !isOneTimePlan && monthlyTrialEndUnix != null;

    const lineQuantity = isOneTimePlan
      ? Math.max(1, Math.floor(assessmentQuantity ?? 1))
      : checkoutLineItemQuantityFromPlan(pricingPlan);
    const lineSubtotalMinor = await this.getRecurringLineSubtotalMinor(
      pricingPlan.stripePriceId,
      lineQuantity,
    );

    const stripePromotionCodeId =
      await this.resolveStripePromotionForCheckoutSession({
        planTypeId: pricingPlan.planTypeId,
        companyId: company.id,
        corporationId: company.corporationId,
        explicitPromoCode: promoCode,
        skipAutoPromoWhenNoExplicitCode,
        lineSubtotalMinor,
      });

    const billingEmail =
      await this.resolveBillingRecipientEmailForCompany(company);

    const customerId = await this.ensureStripeCustomer(company, billingEmail);

    const successWithSessionId = successUrl.includes('{CHECKOUT_SESSION_ID}')
      ? successUrl
      : `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;

    // We submit line items in a deterministic order so the API payload, our
    // tests, the resulting Subscription / Invoice and Stripe webhooks all stay
    // consistent: 1) the plan line (recurring monthly/annual or one-time
    // individual), 2) the mandatory implementation fee (when not yet charged
    // and not an individual one_time plan), 3) the onsite training fee (when
    // the option is 1_day / 2_days and not one_time).
    //
    // **Monthly with a trial:** implementation and onsite training are omitted
    // from Checkout; after `checkout.session.completed` we attach InvoiceItems
    // to the subscription so Stripe bills them on the first post-trial invoice.
    //
    // NOTE on the hosted Checkout page: in `mode: 'subscription'`, Stripe's
    // hosted page sorts the visible "Order summary" by line-item amount
    // descending, independent of this array. As a result the recurring plan
    // can appear below the larger one-time fees on the page itself. This is a
    // Stripe behavior we have accepted for now -- if/when we move to Embedded
    // Checkout we can render the breakdown ourselves and control the order.
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    lineItems.push({
      price: pricingPlan.stripePriceId,
      quantity: lineQuantity,
    });

    const shouldChargeImplementationFee =
      !isOneTimePlan && company.implementationFeeChargedAt == null;
    const includeImplementationInCheckout =
      shouldChargeImplementationFee && !deferOneTimeFeesPostTrial;
    if (includeImplementationInCheckout) {
      const implementationPriceId = this.requireStripePriceId(
        'STRIPE_IMPLEMENTATION_FEE_PRICE_ID',
        STRIPE_IMPLEMENTATION_FEE_PRICE_ID_NOT_CONFIGURED_MSG,
      );
      lineItems.push({ price: implementationPriceId, quantity: 1 });
    }

    const onsiteTrainingOption =
      onsiteTrainingOptionOverride ??
      ((company.planSeat?.onsiteTrainingOption ??
        'off') as OnsiteTrainingOption);
    const includeOnsiteInCheckout =
      !isOneTimePlan &&
      onsiteTrainingOption !== 'off' &&
      !deferOneTimeFeesPostTrial;
    if (includeOnsiteInCheckout) {
      const onsiteTrainingPriceId = this.requireStripePriceId(
        'STRIPE_ONSITE_TRAINING_PRICE_ID',
        STRIPE_ONSITE_TRAINING_PRICE_ID_NOT_CONFIGURED_MSG,
      );
      const quantity = ONSITE_TRAINING_QUANTITY_BY_OPTION[onsiteTrainingOption];
      lineItems.push({ price: onsiteTrainingPriceId, quantity });
    }

    const deferOnsiteTrainingPostTrial: OnsiteTrainingOption =
      deferOneTimeFeesPostTrial && onsiteTrainingOption !== 'off'
        ? onsiteTrainingOption
        : 'off';

    const sessionMetadata: Stripe.MetadataParam = {
      companyId: company.id,
      corporationId: company.corporationId,
      pricingPlanId: pricingPlan.id,
      includesImplementationFee: includeImplementationInCheckout ? '1' : '0',
      deferImplementationFeePostTrial:
        shouldChargeImplementationFee && deferOneTimeFeesPostTrial ? '1' : '0',
      deferOnsiteTrainingPostTrial,
      autoSendInvoiceEmailAfterCheckout: autoSendInvoiceEmailAfterCheckout
        ? '1'
        : '0',
      ...(isOneTimePlan ? { assessmentQuantity: String(lineQuantity) } : {}),
    };

    let sessionCreateParams: Stripe.Checkout.SessionCreateParams;

    if (isOneTimePlan) {
      sessionCreateParams = {
        mode: 'payment',
        customer: customerId,
        line_items: lineItems,
        success_url: successWithSessionId,
        cancel_url: cancelUrl,
        metadata: sessionMetadata,
        /** One-time Checkout: generate an Invoice so post-payment email matches Super Admin invoice send flow. */
        invoice_creation: {
          enabled: true,
          invoice_data: {
            metadata: {
              companyId: company.id,
              pricingPlanId: pricingPlan.id,
            },
          },
        },
      };
    } else {
      const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
        {
          metadata: {
            companyId: company.id,
            pricingPlanId: pricingPlan.id,
          },
        };
      if (monthlyTrialEndUnix != null) {
        subscriptionData.trial_end = monthlyTrialEndUnix;
      }
      sessionCreateParams = {
        mode: 'subscription',
        customer: customerId,
        line_items: lineItems,
        success_url: successWithSessionId,
        cancel_url: cancelUrl,
        metadata: sessionMetadata,
        subscription_data: subscriptionData,
      };
    }

    if (stripePromotionCodeId) {
      sessionCreateParams.discounts = [
        { promotion_code: stripePromotionCodeId },
      ];
    } else {
      sessionCreateParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionCreateParams);

    if (!session.url) {
      this.logger.error('Stripe Checkout session created without url');
      throw new InternalServerErrorException(STRIPE_CHECKOUT_NO_URL_MSG);
    }

    return ResponseHelper.success(CHECKOUT_SESSION_CREATED_MSG, {
      url: session.url,
      checkoutSessionId: session.id,
    });
  }

  /** Success URL with Stripe session placeholder for individual zero-amount activation. */
  getCheckoutSuccessUrlWithSessionPlaceholder(): string {
    const successUrl = this.config.get<string>('STRIPE_CHECKOUT_SUCCESS_URL');
    if (!successUrl?.trim()) {
      throw new BadRequestException(STRIPE_CHECKOUT_URLS_MISSING_MSG);
    }
    return successUrl.includes('{CHECKOUT_SESSION_ID}')
      ? successUrl
      : `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
  }

  /**
   * One-time Checkout for B2C individual assessment users (`app_users.user_type` individual).
   * Mirrors the company `one_time` branch in {@link createCheckoutSession}.
   */
  async createIndividualAppUserCheckoutSession(params: {
    cognitoSub: string;
    email: string;
    firstName: string;
    lastName: string;
    pricingPlanId: string;
    stripePriceId: string;
    promoCode?: string | null;
    existingStripeCustomerId?: string | null;
  }): Promise<ApiResponse<{ url: string; checkoutSessionId: string }>> {
    const stripe = this.requireStripe();
    const successUrl = this.getCheckoutSuccessUrlWithSessionPlaceholder();
    const cancelUrl = this.config.get<string>('STRIPE_CHECKOUT_CANCEL_URL');
    if (!cancelUrl?.trim()) {
      throw new BadRequestException(STRIPE_CHECKOUT_URLS_MISSING_MSG);
    }

    const lineSubtotalMinor = await this.getRecurringLineSubtotalMinor(
      params.stripePriceId,
      1,
    );

    const stripePromotionCodeId =
      await this.resolveStripePromotionForIndividualCheckout({
        promoCode: params.promoCode,
        lineSubtotalMinor,
      });

    const customerId = await this.ensureStripeCustomerForAppUser({
      cognitoSub: params.cognitoSub,
      email: params.email,
      name: [params.firstName, params.lastName]
        .filter(Boolean)
        .join(' ')
        .trim(),
      existingStripeCustomerId: params.existingStripeCustomerId,
    });

    const sessionMetadata: Stripe.MetadataParam = {
      checkoutType: STRIPE_CHECKOUT_INDIVIDUAL_USER_META,
      cognitoSub: params.cognitoSub,
      pricingPlanId: params.pricingPlanId,
      autoSendInvoiceEmailAfterCheckout: '1',
    };

    const sessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: params.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: sessionMetadata,
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            checkoutType: STRIPE_CHECKOUT_INDIVIDUAL_USER_META,
            cognitoSub: params.cognitoSub,
            pricingPlanId: params.pricingPlanId,
            autoSendInvoiceEmailAfterCheckout: '1',
          },
        },
      },
    };

    if (stripePromotionCodeId) {
      sessionCreateParams.discounts = [
        { promotion_code: stripePromotionCodeId },
      ];
    } else {
      sessionCreateParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionCreateParams);
    if (!session.url || !session.id) {
      throw new InternalServerErrorException(STRIPE_CHECKOUT_NO_URL_MSG);
    }

    return ResponseHelper.success(CHECKOUT_SESSION_CREATED_MSG, {
      url: session.url,
      checkoutSessionId: session.id,
    });
  }

  /**
   * Resolves which Stripe Promotion Code id to apply at Individual Checkout Session creation.
   * Explicit code: that row only, with plan + assignment validation.
   */
  private async resolveStripePromotionForIndividualCheckout(params: {
    promoCode?: string | null;
    lineSubtotalMinor: number;
  }): Promise<string | undefined> {
    const explicitCode = normalizeOptionalPromoCodeInput(params.promoCode);
    if (!explicitCode) {
      return undefined;
    }

    const row = await this.prisma.promoCode.findFirst({
      where: {
        code: explicitCode,
        deletedAt: null,
        planTypeId: 'one_time',
        limitToAssignment: false,
      },
      select: {
        id: true,
        code: true,
        planTypeId: true,
        limitToAssignment: true,
        corporationId: true,
        companyId: true,
        stripePromotionCodeId: true,
        expiresAt: true,
        discountType: true,
        percentOff: true,
        amountOffMinor: true,
        currency: true,
        createdAt: true,
      },
    });

    if (!row) {
      throw new BadRequestException(STRIPE_CHECKOUT_PROMO_CODE_NOT_FOUND_MSG);
    }

    const pid = row.stripePromotionCodeId?.trim();
    if (!pid) {
      throw new BadRequestException(STRIPE_CHECKOUT_PROMO_NOT_ACTIVE_MSG);
    }

    const summary = await this.retrievePromotionCodeSummary(pid);
    if (!this.notExpiredAndWithinRedemptions(row, summary)) {
      throw new BadRequestException(STRIPE_CHECKOUT_PROMO_NOT_ACTIVE_MSG);
    }

    return pid;
  }

  /**
   * Returns existing `stripeCustomerId` or creates a Stripe Customer with billing email + individual `name`,
   * then persists the new id on `app_users`.
   */
  private async ensureStripeCustomerForAppUser(params: {
    cognitoSub: string;
    email: string;
    name: string;
    existingStripeCustomerId?: string | null;
  }): Promise<string> {
    const existing = params.existingStripeCustomerId?.trim();
    if (existing) {
      return existing;
    }

    const customer = await this.requireStripe().customers.create({
      email: params.email || undefined,
      name: params.name || undefined,
      metadata: {
        cognitoSub: params.cognitoSub,
        checkoutType: STRIPE_CHECKOUT_INDIVIDUAL_USER_META,
      },
    });

    await this.prisma.appUser.update({
      where: { cognitoSub: params.cognitoSub },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`, then dispatches known event types
   * (subscription checkout completion, `invoice.paid` for deferred fees, subscription lifecycle)
   * to DB sync handlers.
   */
  async handleWebhookEvent(
    payload: Buffer,
    signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret?.trim()) {
      throw new InternalServerErrorException(
        STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED_MSG,
      );
    }
    if (!signature) {
      throw new BadRequestException(STRIPE_MISSING_STRIPE_SIGNATURE_HEADER_MSG);
    }

    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Webhook signature verification failed: ${msg}`);
      throw new BadRequestException(STRIPE_INVALID_SIGNATURE_MSG);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutSessionCompleted(event.data.object);
        break;
      case 'invoice.paid':
        await this.onInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Returns existing `stripeCustomerId` or creates a Stripe Customer with billing email + company `legalName`,
   * then persists the new id on `corporation_companies`.
   */
  private async ensureStripeCustomer(
    company: Pick<
      CorporationCompany,
      'id' | 'corporationId' | 'legalName' | 'stripeCustomerId'
    >,
    billingEmail: string | null,
  ): Promise<string> {
    if (company.stripeCustomerId) {
      return company.stripeCustomerId;
    }

    const customer = await this.requireStripe().customers.create({
      email: billingEmail ?? undefined,
      // Keep billing identity aligned with `corporation_companies.legal_name`.
      name: company.legalName,
      metadata: {
        companyId: company.id,
        corporationId: company.corporationId,
      },
    });

    await this.prisma.corporationCompany.update({
      where: { id: company.id },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Persists checkout outcome from session metadata after a completed Checkout Session
   * (`subscription` or one-time `payment` for individual plans).
   */
  private async onCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (session.mode === 'payment') {
      await this.onCheckoutSessionCompletedPayment(session);
      return;
    }

    if (session.mode !== 'subscription') {
      return;
    }

    const companyId = session.metadata?.companyId;
    const pricingPlanId = session.metadata?.pricingPlanId;
    if (!companyId || !pricingPlanId) {
      this.logger.warn(
        'checkout.session.completed missing companyId or pricingPlanId in metadata',
      );
      return;
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

    if (!subscriptionId || !customerId) {
      this.logger.warn(
        'checkout.session.completed missing subscription or customer id',
      );
      return;
    }

    const sub =
      await this.requireStripe().subscriptions.retrieve(subscriptionId);

    await this.prisma.corporationCompany.update({
      where: { id: companyId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: sub.status,
        planId: pricingPlanId,
        implementationFeeChargedAt:
          session.metadata?.includesImplementationFee === '1'
            ? new Date()
            : undefined,
      },
    });

    try {
      await this.attachDeferredSubscriptionInvoiceItemsIfNeeded({
        session,
        customerId,
        subscriptionId,
        companyId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Deferred post-trial invoice items failed for company ${companyId} session ${session.id ?? 'unknown'}: ${msg}`,
      );
      throw err;
    }

    this.logger.log(
      `Stripe checkout completed for company ${companyId}, plan ${pricingPlanId}`,
    );
  }

  /**
   * After one-time Checkout (`mode: payment`), updates company billing state without a Stripe Subscription.
   */
  private async onCheckoutSessionCompletedPayment(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (
      session.metadata?.checkoutType === STRIPE_CHECKOUT_INDIVIDUAL_USER_META
    ) {
      await this.onIndividualAppUserCheckoutCompleted(session);
      return;
    }

    const companyId = session.metadata?.companyId;
    const pricingPlanId = session.metadata?.pricingPlanId;
    if (!companyId || !pricingPlanId) {
      this.logger.warn(
        'checkout.session.completed (payment) missing companyId or pricingPlanId in metadata',
      );
      return;
    }

    if (session.payment_status !== 'paid') {
      return;
    }

    const sessionId = session.id?.trim() ?? null;
    const existingCompany = await this.prisma.corporationCompany.findUnique({
      where: { id: companyId },
      select: {
        subscriptionStatus: true,
        lastCheckoutSessionId: true,
      },
    });
    if (
      existingCompany?.subscriptionStatus === 'active' &&
      sessionId &&
      existingCompany.lastCheckoutSessionId === sessionId
    ) {
      return;
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
    if (!customerId) {
      this.logger.warn(
        'checkout.session.completed (payment) missing customer id',
      );
      return;
    }

    const parsedAssessmentQuantity = Number.parseInt(
      session.metadata?.assessmentQuantity ?? '1',
      10,
    );
    const assessmentQuantity =
      Number.isFinite(parsedAssessmentQuantity) && parsedAssessmentQuantity >= 1
        ? parsedAssessmentQuantity
        : 1;

    await this.prisma.corporationCompany.update({
      where: { id: companyId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        subscriptionStatus: 'active',
        planId: pricingPlanId,
        assessmentQuantity,
        lastCheckoutSessionId: sessionId ?? undefined,
        implementationFeeChargedAt:
          session.metadata?.includesImplementationFee === '1'
            ? new Date()
            : undefined,
      },
    });

    this.logger.log(
      `Stripe checkout completed (payment) for company ${companyId}, plan ${pricingPlanId}`,
    );
  }

  /**
   * After individual B2C one-time Checkout, marks user paid/active.
   * Company and individual invoice emails are sent from `invoice.paid` only
   * (avoids duplicate sends when checkout and invoice webhooks arrive together).
   */
  private async onIndividualAppUserCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const cognitoSub = session.metadata?.cognitoSub?.trim();
    const pricingPlanId = session.metadata?.pricingPlanId?.trim();
    if (!cognitoSub || !pricingPlanId) {
      this.logger.warn(
        'checkout.session.completed (individual) missing cognitoSub or pricingPlanId in metadata',
      );
      return;
    }

    if (session.payment_status !== 'paid') {
      return;
    }

    const user = await this.prisma.appUser.findFirst({
      where: { cognitoSub, deletedAt: null },
      select: {
        paymentStatus: true,
        email: true,
        lastCheckoutSessionId: true,
      },
    });
    if (!user) {
      return;
    }

    const alreadyPaid =
      user.paymentStatus?.trim().toLowerCase() ===
      INDIVIDUAL_PAYMENT_STATUS.PAID;

    if (!alreadyPaid) {
      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id;
      const sessionId = session.id?.trim() ?? null;

      await this.prisma.appUser.update({
        where: { cognitoSub },
        data: {
          paymentStatus: INDIVIDUAL_PAYMENT_STATUS.PAID,
          status: APP_USER_STATUS.ACTIVE,
          paidAt: new Date(),
          stripeCustomerId: customerId ?? undefined,
          pricingPlanId,
          lastCheckoutSessionId: sessionId ?? undefined,
        },
      });
    }

    this.logger.log(
      `Stripe individual checkout completed for user ${cognitoSub}, plan ${pricingPlanId}`,
    );
  }

  /**
   * Sends the individual user's paid checkout invoice PDF to their app account email.
   * Idempotent via Stripe invoice metadata.
   */
  async sendIndividualPaymentInvoiceEmail(
    invoiceId: string,
    recipientEmail: string,
  ): Promise<void> {
    const email = recipientEmail?.trim();
    if (!email) {
      throw new BadRequestException(
        'Recipient email is required to send the invoice.',
      );
    }

    const stripe = this.requireStripe();
    const initialInv = await stripe.invoices.retrieve(invoiceId);
    if (
      initialInv.metadata?.[STRIPE_INDIVIDUAL_INVOICE_EMAIL_SENT_META] === '1'
    ) {
      return;
    }

    const inv = await this.waitForInvoicePdfReady(invoiceId);
    if (inv.metadata?.[STRIPE_INDIVIDUAL_INVOICE_EMAIL_SENT_META] === '1') {
      return;
    }

    await this.sendCheckoutInvoicePdfToEmail(inv, email);

    await stripe.invoices.update(invoiceId, {
      metadata: {
        ...(inv.metadata ?? {}),
        [STRIPE_INDIVIDUAL_INVOICE_EMAIL_SENT_META]: '1',
      },
    });

    this.logger.log(
      `Individual payment invoice email sent for ${invoiceId} to ${email}`,
    );
  }

  /**
   * Waits for an invoice's PDF to be ready via Stripe API.
   */
  private async waitForInvoicePdfReady(
    invoiceId: string,
    maxAttempts = 10,
    delayMs = 2000,
  ): Promise<Stripe.Invoice> {
    const stripe = this.requireStripe();
    let last: Stripe.Invoice | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      last = await stripe.invoices.retrieve(invoiceId);
      if (last.invoice_pdf) {
        return last;
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new NotFoundException(
      `Invoice PDF is not available yet for ${invoiceId}.`,
    );
  }

  /**
   * Resolves the invoice id from a checkout session.
   */
  private async resolveCheckoutSessionInvoiceId(
    session: Stripe.Checkout.Session,
  ): Promise<string | null> {
    let invoiceId =
      typeof session.invoice === 'string'
        ? session.invoice
        : (session.invoice?.id ?? null);
    if (invoiceId) {
      return invoiceId;
    }
    if (!session.id) {
      return null;
    }

    const stripe = this.requireStripe();
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['invoice', 'payment_intent'],
    });
    invoiceId =
      typeof full.invoice === 'string'
        ? full.invoice
        : (full.invoice?.id ?? null);
    if (invoiceId) {
      return invoiceId;
    }

    const paymentIntentRef = full.payment_intent;
    if (!paymentIntentRef) {
      return null;
    }

    const paymentIntent =
      typeof paymentIntentRef === 'string'
        ? await stripe.paymentIntents.retrieve(paymentIntentRef)
        : paymentIntentRef;
    const piInvoice = paymentIntent.invoice;
    invoiceId =
      typeof piInvoice === 'string' ? piInvoice : (piInvoice?.id ?? null);
    if (invoiceId) {
      return invoiceId;
    }

    const customerId =
      typeof full.customer === 'string' ? full.customer : full.customer?.id;
    if (!customerId) {
      return null;
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
      status: 'paid',
    });
    const sessionCognitoSub = session.metadata?.cognitoSub?.trim();
    for (const inv of invoices.data) {
      if (!inv.id || inv.subscription) {
        continue;
      }
      const md = inv.metadata ?? {};
      if (
        md.checkoutType === STRIPE_CHECKOUT_INDIVIDUAL_USER_META ||
        (sessionCognitoSub && md.cognitoSub === sessionCognitoSub)
      ) {
        return inv.id;
      }
    }

    const latestOneTime = invoices.data.find(
      (inv) => inv.id && !inv.subscription,
    );
    return latestOneTime?.id ?? null;
  }

  /**
   * Resolves `corporation_companies.id` from a Stripe invoice (metadata, subscription, or customer).
   */
  private async resolveCompanyIdFromInvoice(
    invoice: Stripe.Invoice,
  ): Promise<string | null> {
    const fromInvoiceMeta = invoice.metadata?.companyId?.trim();
    if (fromInvoiceMeta) {
      return fromInvoiceMeta;
    }

    const subRef = invoice.subscription;
    const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
    if (subscriptionId) {
      const company = await this.prisma.corporationCompany.findFirst({
        where: { stripeSubscriptionId: subscriptionId, deletedAt: null },
        select: { id: true },
      });
      return company?.id ?? null;
    }

    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
    if (!customerId) {
      return null;
    }

    const customer = await this.requireStripe().customers.retrieve(customerId);
    if (!customer || ('deleted' in customer && customer.deleted)) {
      return null;
    }
    if (
      customer.metadata?.checkoutType === STRIPE_CHECKOUT_INDIVIDUAL_USER_META
    ) {
      return null;
    }

    return customer.metadata?.companyId?.trim() ?? null;
  }

  /**
   * Auto-sends a paid company invoice to finance/billing contact or company admin.
   * Idempotent via Stripe invoice metadata.
   */
  private async tryAutoSendCompanyInvoiceEmail(
    invoice: Stripe.Invoice,
    source: string,
  ): Promise<void> {
    const invoiceId = invoice.id;
    if (!invoiceId || invoice.status !== 'paid') {
      return;
    }

    if (invoice.metadata?.[STRIPE_COMPANY_INVOICE_EMAIL_SENT_META] === '1') {
      return;
    }

    if (await this.resolveIndividualInvoiceContext(invoice)) {
      return;
    }

    const companyId = await this.resolveCompanyIdFromInvoice(invoice);
    if (!companyId) {
      return;
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });
    if (!company) {
      return;
    }

    try {
      const stripe = this.requireStripe();
      const inv = await this.waitForInvoicePdfReady(invoiceId);
      if (inv.metadata?.[STRIPE_COMPANY_INVOICE_EMAIL_SENT_META] === '1') {
        return;
      }

      const priorMetadata = { ...(inv.metadata ?? {}) };
      await stripe.invoices.update(invoiceId, {
        metadata: {
          ...priorMetadata,
          [STRIPE_COMPANY_INVOICE_EMAIL_SENT_META]: '1',
        },
      });

      const customerId =
        typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
      const recipientEmail = customerId
        ? await this.resolveCompanyBillingEmailForStripeCustomer(customerId)
        : null;

      try {
        await this.sendInvoiceForAdmin(invoiceId);
      } catch (sendErr) {
        try {
          await stripe.invoices.update(invoiceId, {
            metadata: {
              ...priorMetadata,
              [STRIPE_COMPANY_INVOICE_EMAIL_SENT_META]: '0',
            },
          });
        } catch {
          // Best-effort revert so a retried webhook can send again.
        }
        throw sendErr;
      }

      this.logger.log(
        `${source}: company invoice email sent for ${invoiceId} (company ${companyId}${recipientEmail ? `, to ${recipientEmail}` : ''})`,
      );
    } catch (err) {
      this.logger.warn(
        `${source}: company invoice email failed for ${invoiceId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Resolves the individual invoice context from a Stripe invoice.
   */
  private async resolveIndividualInvoiceContext(
    invoice: Stripe.Invoice,
  ): Promise<{ cognitoSub: string } | null> {
    const md = invoice.metadata ?? {};
    if (
      md.companyId?.trim() &&
      md.checkoutType !== STRIPE_CHECKOUT_INDIVIDUAL_USER_META
    ) {
      return null;
    }
    let cognitoSub = md.cognitoSub?.trim();
    const invoiceMarksIndividual =
      md.checkoutType === STRIPE_CHECKOUT_INDIVIDUAL_USER_META ||
      (Boolean(cognitoSub) && md.autoSendInvoiceEmailAfterCheckout === '1');

    if (invoiceMarksIndividual && cognitoSub && !invoice.subscription) {
      return { cognitoSub };
    }

    if (invoice.subscription) {
      return null;
    }

    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
    if (!customerId) {
      return null;
    }

    const customer = await this.requireStripe().customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }

    const customerMeta = customer.metadata ?? {};
    if (customerMeta.checkoutType !== STRIPE_CHECKOUT_INDIVIDUAL_USER_META) {
      return null;
    }

    cognitoSub = customerMeta.cognitoSub?.trim();
    return cognitoSub ? { cognitoSub } : null;
  }

  /**
   * Tries to send an individual invoice email from a Stripe invoice.
   */
  private async trySendIndividualInvoiceEmailFromInvoice(
    invoice: Stripe.Invoice,
    source: string,
  ): Promise<boolean> {
    const context = await this.resolveIndividualInvoiceContext(invoice);
    if (!context) {
      return false;
    }

    if (invoice.status !== 'paid' || !invoice.id) {
      return true;
    }

    const user = await this.prisma.appUser.findFirst({
      where: { cognitoSub: context.cognitoSub, deletedAt: null },
      select: { email: true },
    });
    const recipientEmail = user?.email?.trim();
    if (!recipientEmail) {
      this.logger.warn(
        `${source}: no app user email for cognitoSub ${context.cognitoSub}`,
      );
      return true;
    }

    try {
      await this.sendIndividualPaymentInvoiceEmail(invoice.id, recipientEmail);
    } catch (err) {
      this.logger.warn(
        `${source} individual invoice email failed for ${invoice.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return true;
  }

  /**
   * Tries to handle an individual invoice paid event.
   */
  private async tryHandleIndividualInvoicePaid(
    invoice: Stripe.Invoice,
  ): Promise<boolean> {
    return this.trySendIndividualInvoiceEmailFromInvoice(
      invoice,
      'invoice.paid',
    );
  }

  /**
   * Sends a PDF invoice to the given email address via SES.
   */
  private async sendCheckoutInvoicePdfToEmail(
    inv: Stripe.Invoice,
    email: string,
  ): Promise<void> {
    const invoiceId = inv.id;
    if (!invoiceId) {
      throw new BadRequestException('Invoice id is required to send email.');
    }

    const { buffer, safeFilename } =
      await this.fetchPdfBufferFromStripeInvoice(inv);
    const summaryLine = inv.number
      ? `Invoice ${inv.number}`
      : `Invoice ${invoiceId}`;
    const { htmlBody, textBody } = this.buildInvoiceEmailBodies(summaryLine);

    const ok = await this.emailService.sendEmailWithPdfAttachments({
      to: email,
      subject: FINANCE_BULK_EMAIL_SUBJECT,
      textBody,
      htmlBody,
      attachments: [{ filename: safeFilename, content: buffer }],
    });
    if (!ok) {
      throw new InternalServerErrorException('Failed to send invoice email.');
    }
  }

  /**
   * After subscription Checkout with a **monthly trial**, adds pending InvoiceItems so
   * implementation and onsite training bill on the first post-trial subscription invoice.
   */
  private async attachDeferredSubscriptionInvoiceItemsIfNeeded(params: {
    session: Stripe.Checkout.Session;
    customerId: string;
    subscriptionId: string;
    companyId: string;
  }): Promise<void> {
    const { session, customerId, subscriptionId, companyId } = params;
    const md = session.metadata ?? {};
    const deferImpl = md.deferImplementationFeePostTrial === '1';
    const deferOnsiteRaw = md.deferOnsiteTrainingPostTrial;
    const deferOnsite =
      deferOnsiteRaw === '1_day' || deferOnsiteRaw === '2_days';

    if (!deferImpl && !deferOnsite) {
      return;
    }

    const stripe = this.requireStripe();
    const idempotencyBase = session.id?.trim() || `company-${companyId}`;

    if (deferImpl) {
      const implementationPriceId = this.requireStripePriceId(
        'STRIPE_IMPLEMENTATION_FEE_PRICE_ID',
        STRIPE_IMPLEMENTATION_FEE_PRICE_ID_NOT_CONFIGURED_MSG,
      );
      await stripe.invoiceItems.create(
        {
          customer: customerId,
          subscription: subscriptionId,
          price: implementationPriceId,
          quantity: 1,
          metadata: {
            companyId,
            [STRIPE_DEFERRED_FEE_META_KEY]: STRIPE_DEFERRED_FEE_IMPLEMENTATION,
          },
        },
        { idempotencyKey: `${idempotencyBase}:bsp-defer-implementation` },
      );
    }

    if (deferOnsite) {
      const onsiteTrainingPriceId = this.requireStripePriceId(
        'STRIPE_ONSITE_TRAINING_PRICE_ID',
        STRIPE_ONSITE_TRAINING_PRICE_ID_NOT_CONFIGURED_MSG,
      );
      const quantity =
        deferOnsiteRaw === '2_days'
          ? ONSITE_TRAINING_QUANTITY_BY_OPTION['2_days']
          : ONSITE_TRAINING_QUANTITY_BY_OPTION['1_day'];
      await stripe.invoiceItems.create(
        {
          customer: customerId,
          subscription: subscriptionId,
          price: onsiteTrainingPriceId,
          quantity,
          metadata: {
            companyId,
            [STRIPE_DEFERRED_FEE_META_KEY]: STRIPE_DEFERRED_FEE_ONSITE,
          },
        },
        { idempotencyKey: `${idempotencyBase}:bsp-defer-onsite` },
      );
    }
  }

  /**
   * When a paid invoice includes our deferred implementation-fee InvoiceItem, sets
   * `implementation_fee_charged_at` (onsite training has no separate company column).
   */
  private async onInvoicePaid(rawInvoice: Stripe.Invoice): Promise<void> {
    const stripe = this.requireStripe();
    const invoice = await stripe.invoices.retrieve(rawInvoice.id, {
      expand: ['lines.data.invoice_item'],
    });

    if (await this.tryHandleIndividualInvoicePaid(invoice)) {
      return;
    }

    await this.tryAutoSendCompanyInvoiceEmail(invoice, 'invoice.paid');

    const subRef = invoice.subscription;
    const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
    if (!subscriptionId) {
      return;
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: {
        stripeSubscriptionId: subscriptionId,
        deletedAt: null,
      },
      select: { id: true, implementationFeeChargedAt: true },
    });
    if (!company) {
      return;
    }

    if (company.implementationFeeChargedAt == null) {
      let hasDeferredImplementationLine = false;
      for (const line of invoice.lines?.data ?? []) {
        if (line.type !== 'invoiceitem') {
          continue;
        }
        const ii = line.invoice_item;
        if (!ii || typeof ii === 'string') {
          continue;
        }
        const meta = ii.metadata ?? {};
        if (
          meta[STRIPE_DEFERRED_FEE_META_KEY] !==
          STRIPE_DEFERRED_FEE_IMPLEMENTATION
        ) {
          continue;
        }
        if (meta.companyId !== company.id) {
          continue;
        }
        hasDeferredImplementationLine = true;
        break;
      }

      if (hasDeferredImplementationLine) {
        await this.prisma.corporationCompany.update({
          where: { id: company.id },
          data: { implementationFeeChargedAt: new Date() },
        });
        this.logger.log(
          `implementation_fee_charged_at set for company ${company.id} (invoice ${invoice.id}).`,
        );
      }
    }

    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await this.onSubscriptionUpdated(sub);
  }

  /**
   * Syncs subscription status when an invoice payment fails so access restrictions
   * apply immediately (restored on `invoice.paid` / `customer.subscription.updated`).
   */
  private async onInvoicePaymentFailed(
    rawInvoice: Stripe.Invoice,
  ): Promise<void> {
    const subRef = rawInvoice.subscription;
    const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;
    if (!subscriptionId) {
      return;
    }

    const sub =
      await this.requireStripe().subscriptions.retrieve(subscriptionId);
    await this.onSubscriptionUpdated(sub);
  }

  /**
   * Loads completed subscription Checkout Sessions and returns those that applied
   * the given Stripe Promotion Code id (`promo_xxx`). Paginates Stripe's global session
   * list (newest-first per page) up to {@link STRIPE_PROMO_USAGE_CHECKOUT_MAX_PAGES} pages.
   */
  async listCompletedCheckoutSessionsForPromotionCode(params: {
    stripePromotionCodeId: string;
    /** Unix seconds (inclusive). When set, passed to Stripe `created[gte]`. */
    createdGte?: number;
    maxPages?: number;
  }): Promise<Stripe.Checkout.Session[]> {
    const stripe = this.requireStripe();
    const promotionId = params.stripePromotionCodeId.trim();
    if (!promotionId) {
      return [];
    }
    const maxPages = params.maxPages ?? STRIPE_PROMO_USAGE_CHECKOUT_MAX_PAGES;
    const matches: Stripe.Checkout.Session[] = [];
    let startingAfter: string | undefined;
    let pages = 0;

    while (pages < maxPages) {
      const listParams: Stripe.Checkout.SessionListParams = {
        status: 'complete',
        limit: 100,
      };
      if (params.createdGte != null) {
        listParams.created = { gte: params.createdGte };
      }
      if (startingAfter) {
        listParams.starting_after = startingAfter;
      }

      const page = await stripe.checkout.sessions.list(listParams);
      pages += 1;

      for (const session of page.data) {
        if (
          session.mode === 'subscription' &&
          checkoutSessionUsesPromotionCode(session, promotionId)
        ) {
          matches.push(session);
        }
      }

      if (!page.has_more) {
        break;
      }
      const last = page.data[page.data.length - 1];
      if (!last) {
        break;
      }
      startingAfter = last.id;
    }

    matches.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
    return matches;
  }

  /** Resolves the company id from the Stripe subscription metadata or the database. */
  private async resolveCompanyIdForStripeSubscription(
    sub: Stripe.Subscription,
  ): Promise<string | null> {
    const fromMeta = sub.metadata?.companyId?.trim();
    if (fromMeta) {
      return fromMeta;
    }
    const row = await this.prisma.corporationCompany.findFirst({
      where: { stripeSubscriptionId: sub.id },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  /** Keeps `corporation_companies.subscription_status` (and subscription id) in sync when Stripe subscription changes. */
  private async onSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
    const companyId = await this.resolveCompanyIdForStripeSubscription(sub);
    if (!companyId) {
      return;
    }

    if (sub.metadata?.companyId?.trim()) {
      await this.prisma.corporationCompany.updateMany({
        where: { id: companyId },
        data: {
          subscriptionStatus: sub.status,
          stripeSubscriptionId: sub.id,
        },
      });
    } else {
      await this.prisma.corporationCompany.update({
        where: { id: companyId },
        data: { subscriptionStatus: sub.status },
      });
    }

    await this.companyService.syncEndUserAccessForSubscription(
      companyId,
      sub.status,
    );
  }

  /** Marks the company row canceled and clears `stripeSubscriptionId` when the Stripe subscription is deleted. */
  private async onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
    const companyId = await this.resolveCompanyIdForStripeSubscription(sub);
    if (!companyId) {
      return;
    }

    await this.prisma.corporationCompany.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
      },
    });

    await this.companyService.syncEndUserAccessForSubscription(
      companyId,
      'canceled',
    );
  }

  /**
   * Asserts the finance role based on the user's groups.
   * @param groups - The user's groups.
   * @returns The finance role.
   */
  private assertInvoiceFinanceRole(groups: string[]): InvoiceFinanceRole {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return 'super_admin';
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      return 'corporation_admin';
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      return 'company_admin';
    }
    throw new ForbiddenException(FINANCE_INVOICES_FORBIDDEN_MSG);
  }

  /**
   * Resolves the invoice access scope for the given user.
   * @param cognitoSub - The user's Cognito sub.
   * @param groups - The user's groups.
   * @returns The invoice access scope.
   */
  private async resolveInvoiceAccessScope(
    cognitoSub: string,
    groups: string[],
  ): Promise<InvoiceAccessScope> {
    const role = this.assertInvoiceFinanceRole(groups);
    const sub = cognitoSub?.trim();
    if (!sub) {
      throw new ForbiddenException(FINANCE_INVOICES_FORBIDDEN_MSG);
    }

    if (role === 'super_admin') {
      return {
        role,
        corporationId: null,
        allowedCompanyIds: null,
      };
    }

    if (role === 'corporation_admin') {
      const corporationId =
        await this.resolveCorporationIdForInvoiceCorpAdmin(sub);
      if (!corporationId) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
      }
      const companyIds = await this.loadEligibleInvoiceCompanyIds({
        corporationId,
      });
      return {
        role,
        corporationId,
        allowedCompanyIds: new Set(companyIds),
      };
    }

    const companyIds = await this.resolveCompanyIdsForInvoiceCompanyAdmin(sub);
    if (companyIds.length === 0) {
      throw new ForbiddenException(APP_USERS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG);
    }
    const eligible = await this.loadEligibleInvoiceCompanyIds({
      companyIds,
    });
    return {
      role: 'company_admin',
      corporationId: null,
      allowedCompanyIds: new Set(eligible),
    };
  }

  /**
   * Asserts the company id for the given invoice query.
   * @param scope - The invoice access scope.
   * @param companyId - The company id.
   * @returns The company id.
   */
  private assertInvoiceQueryCompanyId(
    scope: InvoiceAccessScope,
    companyId?: string,
  ): string | undefined {
    const trimmed = companyId?.trim();
    if (scope.role === 'super_admin') {
      return trimmed || undefined;
    }

    const allowed = scope.allowedCompanyIds;
    if (!allowed || allowed.size === 0) {
      return undefined;
    }

    if (trimmed) {
      if (!allowed.has(trimmed)) {
        throw new ForbiddenException(FINANCE_INVOICE_ACCESS_DENIED_MSG);
      }
      return trimmed;
    }

    if (scope.role === 'company_admin' && allowed.size === 1) {
      return [...allowed][0];
    }

    return undefined;
  }

  /**
   * Builds the eligible invoice company where clause.
   * @param scope - The invoice access scope.
   * @returns The eligible invoice company where clause.
   */
  private buildEligibleInvoiceCompanyWhere(
    scope: InvoiceAccessScope,
  ): Prisma.CorporationCompanyWhereInput {
    const base: Prisma.CorporationCompanyWhereInput = {
      deletedAt: null,
      status: { not: COMPANY_STATUS.SUSPENDED },
      stripeCustomerId: { not: null },
      corporation: {
        status: {
          notIn: [CORPORATION_STATUS.SUSPENDED, CORPORATION_STATUS.CLOSED],
        },
      },
    };

    if (scope.allowedCompanyIds) {
      return {
        ...base,
        id: { in: [...scope.allowedCompanyIds] },
      };
    }

    if (scope.corporationId) {
      return {
        ...base,
        corporationId: scope.corporationId,
      };
    }

    return base;
  }

  /**
   * Asserts the invoice in access scope.
   * @param scope - The invoice access scope.
   * @param stripeCustomerId - The Stripe customer id.
   * @returns The invoice in access scope.
   */
  private async assertInvoiceInAccessScope(
    scope: InvoiceAccessScope,
    stripeCustomerId: string | null | undefined,
  ): Promise<void> {
    if (scope.role === 'super_admin') {
      return;
    }
    if (!stripeCustomerId?.trim()) {
      throw new ForbiddenException(FINANCE_INVOICE_ACCESS_DENIED_MSG);
    }

    const where = this.buildEligibleInvoiceCompanyWhere(scope);
    const company = await this.prisma.corporationCompany.findFirst({
      where: {
        ...where,
        stripeCustomerId: stripeCustomerId.trim(),
      },
      select: { id: true },
    });
    if (!company) {
      throw new ForbiddenException(FINANCE_INVOICE_ACCESS_DENIED_MSG);
    }
  }

  /**
   * Loads the eligible invoice company ids.
   * @param filter - The filter.
   * @returns The eligible invoice company ids.
   */
  private async loadEligibleInvoiceCompanyIds(filter: {
    corporationId?: string;
    companyIds?: string[];
  }): Promise<string[]> {
    const where: Prisma.CorporationCompanyWhereInput = {
      deletedAt: null,
      status: { not: COMPANY_STATUS.SUSPENDED },
      stripeCustomerId: { not: null },
      corporation: {
        status: {
          notIn: [CORPORATION_STATUS.SUSPENDED, CORPORATION_STATUS.CLOSED],
        },
      },
    };
    if (filter.corporationId) {
      where.corporationId = filter.corporationId;
    }
    if (filter.companyIds?.length) {
      where.id = { in: filter.companyIds };
    }

    const rows = await this.prisma.corporationCompany.findMany({
      where,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /**
   * Resolves the corporation id for the given invoice corp admin.
   * @param cognitoSub - The user's Cognito sub.
   * @returns The corporation id.
   */
  private async resolveCorporationIdForInvoiceCorpAdmin(
    cognitoSub: string,
  ): Promise<string | null> {
    const row = await this.prisma.appUser.findFirst({
      where: {
        cognitoSub,
        corporationId: { not: null },
        deletedAt: null,
        userType: {
          contains: CORPORATION_ADMIN_APP_USER_TYPE,
          mode: 'insensitive',
        },
      },
      select: { corporationId: true },
    });
    return row?.corporationId ?? null;
  }

  /**
   * Resolves the company ids for the given invoice company admin.
   * @param cognitoSub - The user's Cognito sub.
   * @returns The company ids.
   */
  private async resolveCompanyIdsForInvoiceCompanyAdmin(
    cognitoSub: string,
  ): Promise<string[]> {
    const rows = await this.prisma.userCompanyAccess.findMany({
      where: {
        userId: cognitoSub,
        isAdmin: true,
        company: { deletedAt: null },
      },
      select: { companyId: true },
    });
    return rows.map((row) => row.companyId);
  }

  /**
   * Returns an empty invoice list result.
   * @returns The empty invoice list result.
   */
  private emptyInvoiceListResult(): InvoiceAdminListResult {
    return {
      items: [],
      hasMore: false,
      nextStartingAfter: null,
      nextSearchPage: null,
      nextSearchOffset: null,
      usedSearch: false,
    };
  }

  /**
   * Lists Stripe invoices (newest first) for Super Admin finance UI via `invoices.list`.
   */
  async listInvoicesForAdmin(
    query: ListInvoicesQueryDto,
  ): Promise<InvoiceAdminListResult> {
    const stripe = this.requireStripe();
    const paymentTypes = this.parsePaymentMethods(query.paymentMethods);

    let stripeCustomerId: string | undefined;
    if (query.companyId) {
      const company = await this.prisma.corporationCompany.findFirst({
        where: {
          id: query.companyId,
          deletedAt: null,
          status: { not: COMPANY_STATUS.SUSPENDED },
        },
        select: { stripeCustomerId: true },
      });
      stripeCustomerId = company?.stripeCustomerId ?? undefined;
      if (!stripeCustomerId) {
        return this.emptyInvoiceListResult();
      }
    }

    return this.listInvoicesListAccumulating(
      stripe,
      query,
      stripeCustomerId,
      paymentTypes,
      null,
    );
  }

  /**
   * Lists Stripe invoices scoped to the requester's role (Super / Corporation / Company admin).
   */
  async listInvoicesForRequester(
    cognitoSub: string,
    groups: string[],
    query: ListInvoicesQueryDto,
  ): Promise<InvoiceAdminListResult> {
    const scope = await this.resolveInvoiceAccessScope(cognitoSub, groups);
    const companyId = this.assertInvoiceQueryCompanyId(scope, query.companyId);

    if (scope.role === 'super_admin') {
      return this.listInvoicesForAdmin({ ...query, companyId });
    }

    const stripe = this.requireStripe();
    const paymentTypes = this.parsePaymentMethods(query.paymentMethods);
    const where = this.buildEligibleInvoiceCompanyWhere(scope);
    const companies = await this.prisma.corporationCompany.findMany({
      where: companyId ? { ...where, id: companyId } : where,
      select: { id: true, stripeCustomerId: true },
    });

    const stripeCustomerIds = companies
      .map((c) => c.stripeCustomerId)
      .filter((id): id is string => Boolean(id?.trim()));

    if (stripeCustomerIds.length === 0) {
      return this.emptyInvoiceListResult();
    }

    const allowedCompanyIds = new Set(companies.map((c) => c.id));

    if (stripeCustomerIds.length === 1) {
      return this.listInvoicesListAccumulating(
        stripe,
        query,
        stripeCustomerIds[0],
        paymentTypes,
        allowedCompanyIds,
      );
    }

    return this.listInvoicesSearchAccumulating(
      stripe,
      query,
      stripeCustomerIds,
      paymentTypes,
      allowedCompanyIds,
    );
  }

  /** Company dropdown options for Invoice Management filters (scoped by role). */
  async getCompaniesWithStripeCustomerForRequester(
    cognitoSub: string,
    groups: string[],
  ): Promise<Array<{ value: string; label: string }>> {
    const scope = await this.resolveInvoiceAccessScope(cognitoSub, groups);
    if (scope.role === 'company_admin') {
      return [];
    }
    if (scope.role === 'super_admin') {
      return this.getCompaniesWithStripeCustomer();
    }

    const where = this.buildEligibleInvoiceCompanyWhere(scope);
    const rows = await this.prisma.corporationCompany.findMany({
      where,
      select: { id: true, legalName: true },
      orderBy: { legalName: 'asc' },
    });
    return rows.map((r) => ({
      value: r.id,
      label: r.legalName.trim(),
    }));
  }

  /** Returns invoice PDF bytes when the invoice is within the requester's scope. */
  async getInvoicePdfBufferForRequester(
    cognitoSub: string,
    groups: string[],
    invoiceId: string,
  ): Promise<Buffer> {
    const scope = await this.resolveInvoiceAccessScope(cognitoSub, groups);
    if (scope.role === 'super_admin') {
      return this.getInvoicePdfBufferForAdmin(invoiceId);
    }

    const stripe = this.requireStripe();
    const inv = await stripe.invoices.retrieve(invoiceId);
    const customerId =
      typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
    await this.assertInvoiceInAccessScope(scope, customerId);
    return this.getInvoicePdfBufferForAdmin(invoiceId);
  }

  /** Sends an invoice email when the invoice is within the requester's scope. */
  async sendInvoiceForRequester(
    cognitoSub: string,
    groups: string[],
    invoiceId: string,
  ): Promise<void> {
    const scope = await this.resolveInvoiceAccessScope(cognitoSub, groups);
    await this.assertInvoiceIdsInAccessScope(scope, [invoiceId]);
    await this.sendInvoiceForAdmin(invoiceId);
  }

  /** Builds a ZIP of invoice PDFs when every id is within the requester's scope. */
  async getInvoicesZipBufferForRequester(
    cognitoSub: string,
    groups: string[],
    invoiceIds: string[],
  ): Promise<Buffer> {
    const scope = await this.resolveInvoiceAccessScope(cognitoSub, groups);
    await this.assertInvoiceIdsInAccessScope(scope, invoiceIds);
    return this.getInvoicesZipBufferForAdmin(invoiceIds);
  }

  /** Bulk-sends invoices when every id is within the requester's scope. */
  async bulkSendInvoicesForRequester(
    cognitoSub: string,
    groups: string[],
    invoiceIds: string[],
    additionalEmails: string[] = [],
  ): Promise<void> {
    const scope = await this.resolveInvoiceAccessScope(cognitoSub, groups);
    await this.assertInvoiceIdsInAccessScope(scope, invoiceIds);
    await this.bulkSendInvoicesForAdmin(invoiceIds, additionalEmails);
  }

  /**
   * Asserts the invoice ids in access scope.
   * @param scope - The invoice access scope.
   * @param invoiceIds - The invoice ids.
   * @returns The invoice ids in access scope.
   */
  private async assertInvoiceIdsInAccessScope(
    scope: InvoiceAccessScope,
    invoiceIds: string[],
  ): Promise<void> {
    if (scope.role === 'super_admin') {
      return;
    }
    const stripe = this.requireStripe();
    const unique = this.normalizeInvoiceIdList(invoiceIds);
    for (const id of unique) {
      const inv = await stripe.invoices.retrieve(id);
      const customerId =
        typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
      await this.assertInvoiceInAccessScope(scope, customerId);
    }
  }

  /**
   * Sends the invoice to the company billing contact:
   * - Open/draft `send_invoice` invoices: Stripe `invoices.sendInvoice` (payment request to customer on file).
   * - Paid invoices (including Checkout `invoice_creation` one-time): PDF via SES to finance/billing or company admin.
   *   Checkout one-time invoices are `send_invoice` but already `paid`; Stripe `sendInvoice` does not email them.
   */
  async sendInvoiceForAdmin(invoiceId: string): Promise<void> {
    const stripe = this.requireStripe();
    const inv = await stripe.invoices.retrieve(invoiceId);

    const shouldUseStripeNativeInvoiceSend =
      inv.collection_method === 'send_invoice' &&
      inv.status !== 'paid' &&
      (inv.status === 'open' || inv.status === 'draft');

    if (shouldUseStripeNativeInvoiceSend) {
      await stripe.invoices.sendInvoice(invoiceId);
      return;
    }

    const customerId =
      typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
    if (!customerId) {
      throw new BadRequestException(
        'Invoice has no Stripe customer; cannot send by email.',
      );
    }

    const adminEmail =
      await this.resolveCompanyBillingEmailForStripeCustomer(customerId);
    if (!adminEmail) {
      throw new BadRequestException(
        'No company billing email found. Add a Finance / Billing contact or ensure a company admin has an email.',
      );
    }

    const { buffer, safeFilename } =
      await this.fetchPdfBufferFromStripeInvoice(inv);

    const summaryLine = inv.number
      ? `Invoice ${inv.number}`
      : `Invoice ${invoiceId}`;
    const { htmlBody, textBody } = this.buildInvoiceEmailBodies(summaryLine);

    const ok = await this.emailService.sendEmailWithPdfAttachments({
      to: adminEmail,
      subject: FINANCE_BULK_EMAIL_SUBJECT,
      textBody,
      htmlBody,
      attachments: [{ filename: safeFilename, content: buffer }],
    });
    if (!ok) {
      throw new InternalServerErrorException('Failed to send invoice email.');
    }
  }

  /**
   * Loads invoice PDF bytes from Stripe's hosted `invoice_pdf` URL.
   * Used by the finance API so the SPA can preview PDFs in an iframe (Stripe blocks cross-origin iframes).
   */
  async getInvoicePdfBufferForAdmin(invoiceId: string): Promise<Buffer> {
    const { buffer } = await this.getInvoicePdfBufferWithMeta(invoiceId);
    return buffer;
  }

  /**
   * Ensures the Stripe invoice belongs to the company's Stripe customer before PDF download.
   */
  async assertInvoiceBelongsToCompany(
    invoiceId: string,
    companyId: string,
  ): Promise<void> {
    const company = await this.prisma.corporationCompany.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        status: { not: COMPANY_STATUS.SUSPENDED },
      },
      select: { stripeCustomerId: true },
    });
    if (!company?.stripeCustomerId) {
      throw new NotFoundException(FINANCE_BILLING_RECORD_NOT_FOUND_MSG);
    }
    const stripe = this.requireStripe();
    const inv = await stripe.invoices.retrieve(invoiceId);
    const customerId =
      typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
    if (!customerId || customerId !== company.stripeCustomerId) {
      throw new ForbiddenException(FINANCE_INVOICE_ACCESS_DENIED_MSG);
    }
  }

  /** Returns the PDF invoice for the target company. */
  async getInvoicePdfBufferForCompanyAdmin(
    invoiceId: string,
    companyId: string,
  ): Promise<Buffer> {
    await this.assertInvoiceBelongsToCompany(invoiceId, companyId);
    return this.getInvoicePdfBufferForAdmin(invoiceId);
  }

  /**
   * Builds a ZIP of PDFs for the given Stripe invoice ids (deduped, order preserved).
   */
  async getInvoicesZipBufferForAdmin(invoiceIds: string[]): Promise<Buffer> {
    const unique = this.normalizeInvoiceIdList(invoiceIds);
    const files = await this.collectInvoicePdfFiles(unique);
    return this.buildZipBuffer(files);
  }

  /**
   * Bulk send:
   * - If `additionalEmails` is non-empty: emails PDFs via SES to those addresses only (no Stripe `sendInvoice`).
   * - Otherwise: for each invoice, emails the PDF via SES to that company's finance/billing contact or company admin email (no Stripe `sendInvoice`).
   */
  async bulkSendInvoicesForAdmin(
    invoiceIds: string[],
    additionalEmails: string[] = [],
  ): Promise<void> {
    const unique = this.normalizeInvoiceIdList(invoiceIds);
    const extra = this.normalizeEmailList(additionalEmails);
    const stripe = this.requireStripe();

    if (extra.length > 0) {
      const attachments =
        await this.buildInvoiceAttachmentsForFilenames(unique);
      const summaryLine =
        unique.length === 1
          ? '1 invoice — see attached PDF'
          : `${unique.length} invoices — see attached PDFs`;
      const { htmlBody, textBody } = this.buildInvoiceEmailBodies(summaryLine);
      for (const email of extra) {
        const ok = await this.emailService.sendEmailWithPdfAttachments({
          to: email,
          subject: FINANCE_BULK_EMAIL_SUBJECT,
          textBody,
          htmlBody,
          attachments,
        });
        if (!ok) {
          throw new InternalServerErrorException(
            `Failed to send invoice copy to ${email}.`,
          );
        }
      }
      return;
    }

    for (const id of unique) {
      const inv = await stripe.invoices.retrieve(id);
      const customerId =
        typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
      if (!customerId) {
        throw new BadRequestException(
          `Invoice ${inv.number ?? id} has no Stripe customer; cannot resolve company.`,
        );
      }

      const adminEmail =
        await this.resolveCompanyBillingEmailForStripeCustomer(customerId);
      if (!adminEmail) {
        throw new BadRequestException(
          `No billing or company admin email found for invoice ${inv.number ?? id}. Add a Finance / Billing contact or ensure a company admin has an email.`,
        );
      }

      const { buffer, safeFilename } =
        await this.fetchPdfBufferFromStripeInvoice(inv);

      const summaryLine = inv.number
        ? `Invoice ${inv.number}`
        : `Invoice ${id}`;
      const { htmlBody, textBody } = this.buildInvoiceEmailBodies(summaryLine);

      const ok = await this.emailService.sendEmailWithPdfAttachments({
        to: adminEmail,
        subject: FINANCE_BULK_EMAIL_SUBJECT,
        textBody,
        htmlBody,
        attachments: [{ filename: safeFilename, content: buffer }],
      });
      if (!ok) {
        throw new InternalServerErrorException(
          `Failed to send invoice to company admin at ${adminEmail}.`,
        );
      }
    }
  }

  /**
   * Finance/billing key contact (`finance_billing_contact`) email, else company admin
   * `AppUser.email` (`UserCompanyAccess.isAdmin`). Used for checkout Stripe customers and invoice PDFs.
   */
  private async resolveBillingRecipientEmailForCompany(company: {
    id: string;
    appKeyContacts?: { email: string | null }[];
  }): Promise<string | null> {
    const financeBilling = company.appKeyContacts?.[0]?.email?.trim();
    if (financeBilling) {
      return financeBilling.toLowerCase();
    }

    const adminAccess = await this.prisma.userCompanyAccess.findFirst({
      where: {
        companyId: company.id,
        isAdmin: true,
        user: { deletedAt: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        user: { select: { email: true } },
      },
    });
    const adminEmail = adminAccess?.user?.email?.trim();
    return adminEmail ? adminEmail.toLowerCase() : null;
  }

  /** Looks up the company by Stripe customer id and reuses {@link resolveBillingRecipientEmailForCompany} for invoice sends. */
  private async resolveCompanyBillingEmailForStripeCustomer(
    stripeCustomerId: string,
  ): Promise<string | null> {
    const company = await this.prisma.corporationCompany.findFirst({
      where: { stripeCustomerId, deletedAt: null },
      select: {
        id: true,
        appKeyContacts: {
          where: { contactType: FINANCE_BILLING_CONTACT_TYPE, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { email: true },
        },
      },
    });
    if (!company) {
      return null;
    }
    return this.resolveBillingRecipientEmailForCompany(company);
  }

  /** Trims, dedupes, and rejects empty invoice id lists (used by ZIP and bulk send entry points). */
  private normalizeInvoiceIdList(invoiceIds: string[]): string[] {
    const unique = [
      ...new Set(invoiceIds.map((id) => id.trim()).filter(Boolean)),
    ];
    if (unique.length === 0) {
      throw new BadRequestException('No invoice ids provided.');
    }
    return unique;
  }

  /** Trims, lowercases, dedupes additional recipient emails for bulk invoice copy sends. */
  private normalizeEmailList(emails: string[]): string[] {
    return [
      ...new Set(
        emails.map((e) => e.trim().toLowerCase()).filter((e) => e.length > 0),
      ),
    ];
  }

  /** Same branding as company admin invite emails (`EMAIL_LOGO_URL`). */
  private buildInvoiceEmailBodies(summaryLine: string): {
    htmlBody: string;
    textBody: string;
  } {
    const p = {
      summaryLine,
    };
    return {
      htmlBody: getInvoiceEmailHtml(p),
      textBody: getInvoiceEmailText(p),
    };
  }

  /** Retrieves the invoice from Stripe then downloads PDF bytes + a filesystem-safe filename. */
  private async getInvoicePdfBufferWithMeta(
    invoiceId: string,
  ): Promise<{ buffer: Buffer; safeFilename: string }> {
    const stripe = this.requireStripe();
    const inv = await stripe.invoices.retrieve(invoiceId);
    return this.fetchPdfBufferFromStripeInvoice(inv);
  }

  /** HTTP GET on Stripe's `invoice_pdf` URL; used for email attachments and admin PDF proxy. */
  private async fetchPdfBufferFromStripeInvoice(
    inv: Stripe.Invoice,
  ): Promise<{ buffer: Buffer; safeFilename: string }> {
    const invoiceId = inv.id;
    const pdfUrl = inv.invoice_pdf;
    if (!pdfUrl) {
      throw new NotFoundException('Invoice PDF is not available yet.');
    }
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      this.logger.warn(
        `Stripe invoice PDF fetch failed: ${res.status} for ${invoiceId}`,
      );
      throw new InternalServerErrorException(
        'Could not retrieve invoice PDF from Stripe.',
      );
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const num = inv.number ?? invoiceId;
    const safe = String(num).replace(/[^\w.-]+/g, '_');
    return { buffer, safeFilename: `invoice-${safe}.pdf` };
  }

  /** Fetches each invoice PDF and assigns unique ZIP entry names when numbers collide. */
  private async collectInvoicePdfFiles(
    invoiceIds: string[],
  ): Promise<{ name: string; buffer: Buffer }[]> {
    const files: { name: string; buffer: Buffer }[] = [];
    const usedNames = new Set<string>();
    for (const id of invoiceIds) {
      const { buffer, safeFilename } =
        await this.getInvoicePdfBufferWithMeta(id);
      let name = safeFilename;
      let n = 2;
      while (usedNames.has(name)) {
        const dot = safeFilename.lastIndexOf('.');
        const base = dot >= 0 ? safeFilename.slice(0, dot) : safeFilename;
        const ext = dot >= 0 ? safeFilename.slice(dot) : '';
        name = `${base}-${n}${ext}`;
        n += 1;
      }
      usedNames.add(name);
      files.push({ name, buffer });
    }
    return files;
  }

  /** Maps collected PDFs into SES attachment shape (`filename` + `content`). */
  private async buildInvoiceAttachmentsForFilenames(
    invoiceIds: string[],
  ): Promise<{ filename: string; content: Buffer }[]> {
    const files = await this.collectInvoicePdfFiles(invoiceIds);
    return files.map((f) => ({ filename: f.name, content: f.buffer }));
  }

  /** Streams PDF buffers into an in-memory ZIP (max compression) for multi-invoice download. */
  private async buildZipBuffer(
    files: { name: string; buffer: Buffer }[],
  ): Promise<Buffer> {
    const archiver = (await import('archiver')).default;
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      for (const f of files) {
        archive.append(f.buffer, { name: f.name });
      }
      void archive.finalize();
    });
  }

  /** Select options for finance admin filters: active companies that already have a Stripe customer id. */
  async getCompaniesWithStripeCustomer(): Promise<
    Array<{ value: string; label: string }>
  > {
    const rows = await this.prisma.corporationCompany.findMany({
      where: {
        stripeCustomerId: { not: null },
        deletedAt: null,
        status: { not: COMPANY_STATUS.SUSPENDED },
      },
      select: { id: true, legalName: true },
      orderBy: { legalName: 'asc' },
    });
    return rows.map((r) => ({
      value: r.id,
      label: r.legalName.trim(),
    }));
  }

  /**
   * Paginates Stripe `invoices.list`, maps each batch to admin rows, and stops when enough items
   * pass the company + payment-method filters or Stripe has no more pages.
   */
  private async listInvoicesSearchAccumulating(
    stripe: Stripe,
    query: ListInvoicesQueryDto,
    stripeCustomerIds: string[],
    paymentTypes: InvoiceAdminPaymentType[] | undefined,
    allowedCompanyIds: Set<string>,
  ): Promise<InvoiceAdminListResult> {
    const limit = query.limit;
    const collected: InvoiceAdminListItem[] = [];
    let page: string | undefined = query.searchPage;
    let offsetWithinPage = query.searchOffset ?? 0;
    let lastHasMore = false;
    let nextSearchPageToken: string | null = null;
    let pageTokenUsed: string | null = query.searchPage ?? null;
    let lastProcessedRawIndex = -1;
    let lastResponseLength = 0;
    let stoppedEarlyInBatch = false;

    // Stripe Search cannot mix AND with OR; status/time filters are applied after fetch.
    const searchQuery =
      stripeCustomerIds.length === 1
        ? `customer:'${stripeCustomerIds[0]}'`
        : stripeCustomerIds.map((id) => `customer:'${id}'`).join(' OR ');

    for (let iter = 0; iter < 50 && collected.length < limit; iter++) {
      const batchLimit = Math.min(100, Math.max(limit * 2, 20));
      const searchParams: Stripe.InvoiceSearchParams = {
        query: searchQuery,
        limit: batchLimit,
        expand: ['data.charge', 'data.lines.data.price'],
      };
      if (page) {
        searchParams.page = page;
      }

      const response = await stripe.invoices.search(searchParams);
      lastHasMore = response.has_more;
      nextSearchPageToken = response.next_page ?? null;
      pageTokenUsed = page ?? null;
      lastResponseLength = response.data.length;
      if (response.data.length === 0) {
        break;
      }

      const priceIds = this.collectStripePriceIdsFromInvoices(response.data);
      const planTypesByPriceId =
        await this.buildPlanTypeByStripePriceId(priceIds);
      const companyMap = await this.buildCompanyMapFromInvoices(response.data);
      stoppedEarlyInBatch = false;
      for (let i = offsetWithinPage; i < response.data.length; i++) {
        const inv = response.data[i];
        lastProcessedRawIndex = i;
        const item = this.mapInvoiceToAdminItem(
          inv,
          companyMap,
          planTypesByPriceId,
        );
        if (
          item.companyId != null &&
          allowedCompanyIds.has(item.companyId) &&
          this.matchesInvoiceListQueryFilters(item, query, paymentTypes) &&
          this.matchesInvoiceTextSearch(item, query.search)
        ) {
          collected.push(item);
          if (collected.length >= limit) {
            stoppedEarlyInBatch = true;
            break;
          }
        }
      }
      offsetWithinPage = 0;
      if (collected.length >= limit) {
        break;
      }
      if (!lastHasMore || !nextSearchPageToken) {
        break;
      }
      page = nextSearchPageToken;
      pageTokenUsed = null;
    }

    const items = collected.slice(0, limit);
    const hasRemainingOnPage =
      stoppedEarlyInBatch &&
      lastProcessedRawIndex >= 0 &&
      lastProcessedRawIndex < lastResponseLength - 1;
    const hasMore =
      items.length >= limit && (hasRemainingOnPage || lastHasMore);

    let nextSearchPage: string | null = null;
    let nextSearchOffset: number | null = null;
    if (hasMore) {
      if (hasRemainingOnPage) {
        nextSearchPage = pageTokenUsed;
        nextSearchOffset = lastProcessedRawIndex + 1;
      } else {
        nextSearchPage = nextSearchPageToken;
        nextSearchOffset = 0;
      }
    }

    return {
      items,
      hasMore,
      nextStartingAfter: null,
      nextSearchPage,
      nextSearchOffset,
      usedSearch: true,
    };
  }

  /**
   * Paginates Stripe `invoices.list`, maps each batch to admin rows, and stops when enough items
   * pass the company + payment-method filters or Stripe has no more pages.
   */
  private async listInvoicesListAccumulating(
    stripe: Stripe,
    query: ListInvoicesQueryDto,
    stripeCustomerId: string | undefined,
    paymentTypes: InvoiceAdminPaymentType[] | undefined,
    allowedCompanyIds: Set<string> | null,
  ): Promise<InvoiceAdminListResult> {
    const limit = query.limit;
    const collected: InvoiceAdminListItem[] = [];
    let startingAfter: string | undefined = query.startingAfter;
    let lastStripeHasMore = false;
    let lastBatchEndId: string | null = null;
    let lastCollectedInvoiceId: string | null = null;
    let stoppedEarlyInBatch = false;

    for (let iter = 0; iter < 50 && collected.length < limit; iter++) {
      const batchLimit = Math.min(100, Math.max(limit * 2, 20));
      const listParams: Stripe.InvoiceListParams = {
        limit: batchLimit,
        expand: ['data.charge', 'data.lines.data.price'],
      };
      if (startingAfter) {
        listParams.starting_after = startingAfter;
      }
      if (query.status !== 'all') {
        listParams.status = query.status as Stripe.Invoice.Status;
      }
      if (stripeCustomerId) {
        listParams.customer = stripeCustomerId;
      }
      if (query.createdGte != null || query.createdLte != null) {
        listParams.created = {};
        if (query.createdGte != null) {
          listParams.created.gte = query.createdGte;
        }
        if (query.createdLte != null) {
          listParams.created.lte = query.createdLte;
        }
      }

      const response = await stripe.invoices.list(listParams);
      lastStripeHasMore = response.has_more;
      if (response.data.length === 0) {
        break;
      }

      lastBatchEndId = response.data[response.data.length - 1].id;
      const priceIds = this.collectStripePriceIdsFromInvoices(response.data);
      const planTypesByPriceId =
        await this.buildPlanTypeByStripePriceId(priceIds);
      const companyMap = await this.buildCompanyMapFromInvoices(response.data);
      stoppedEarlyInBatch = false;
      for (const inv of response.data) {
        const item = this.mapInvoiceToAdminItem(
          inv,
          companyMap,
          planTypesByPriceId,
        );
        if (
          item.companyId != null &&
          (allowedCompanyIds == null ||
            allowedCompanyIds.has(item.companyId)) &&
          this.matchesPaymentFilter(item, paymentTypes) &&
          this.matchesInvoiceTextSearch(item, query.search)
        ) {
          collected.push(item);
          lastCollectedInvoiceId = item.id;
          if (collected.length >= limit) {
            stoppedEarlyInBatch = true;
            break;
          }
        }
      }
      if (collected.length >= limit) {
        break;
      }
      if (!lastStripeHasMore || !lastBatchEndId) {
        break;
      }
      startingAfter = lastBatchEndId;
    }

    const items = collected.slice(0, limit);
    const hasMore =
      items.length >= limit && (lastStripeHasMore || stoppedEarlyInBatch);

    return {
      items,
      hasMore,
      nextStartingAfter:
        hasMore && lastCollectedInvoiceId ? lastCollectedInvoiceId : null,
      nextSearchPage: null,
      nextSearchOffset: null,
      usedSearch: false,
    };
  }

  /** Parses comma-separated `ACH` / `CC` query tokens into a filter list; returns `undefined` when unset. */
  private parsePaymentMethods(
    raw?: string,
  ): InvoiceAdminPaymentType[] | undefined {
    if (!raw?.trim()) {
      return undefined;
    }
    const allowed = new Set<string>(['ACH', 'CC']);
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const out = parts.filter((p) =>
      allowed.has(p),
    ) as InvoiceAdminPaymentType[];
    return out.length > 0 ? out : undefined;
  }

  /** Case-insensitive match on invoice display id or company office name. */
  private matchesInvoiceTextSearch(
    item: InvoiceAdminListItem,
    search: string | undefined,
  ): boolean {
    const q = search?.trim().toLowerCase();
    if (!q) {
      return true;
    }
    if (item.displayId.toLowerCase().includes(q)) {
      return true;
    }
    const office = item.companyOfficeName?.trim().toLowerCase();
    return office != null && office.includes(q);
  }

  /** When payment filters are present, requires the invoice row to have a matching derived payment type. */
  private matchesPaymentFilter(
    item: InvoiceAdminListItem,
    paymentTypes: InvoiceAdminPaymentType[] | undefined,
  ): boolean {
    if (!paymentTypes || paymentTypes.length === 0) {
      return true;
    }
    if (!item.paymentType) {
      return false;
    }
    return paymentTypes.includes(item.paymentType);
  }

  /** Post-filters invoice rows for status, created range, and payment type (used with Stripe Search). */
  private matchesInvoiceListQueryFilters(
    item: InvoiceAdminListItem,
    query: Pick<ListInvoicesQueryDto, 'status' | 'createdGte' | 'createdLte'>,
    paymentTypes: InvoiceAdminPaymentType[] | undefined,
  ): boolean {
    if (!this.matchesPaymentFilter(item, paymentTypes)) {
      return false;
    }
    if (query.status !== 'all' && item.stripeStatus !== query.status) {
      return false;
    }
    if (query.createdGte != null && item.created < query.createdGte) {
      return false;
    }
    if (query.createdLte != null && item.created > query.createdLte) {
      return false;
    }
    return true;
  }

  /** Batch-loads companies by Stripe customer ids appearing on the invoice page for office name + region columns. */
  private async buildCompanyMapFromInvoices(
    invoices: Stripe.Invoice[],
  ): Promise<
    Map<string, { companyId: string; officeName: string; region: string }>
  > {
    const customerIds = new Set<string>();
    for (const inv of invoices) {
      const cid =
        typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
      if (cid) {
        customerIds.add(cid);
      }
    }
    if (customerIds.size === 0) {
      return new Map();
    }
    const rows = await this.prisma.corporationCompany.findMany({
      where: {
        stripeCustomerId: { in: [...customerIds] },
        deletedAt: null,
        status: { not: COMPANY_STATUS.SUSPENDED },
      },
      select: {
        id: true,
        stripeCustomerId: true,
        legalName: true,
        corporation: { select: { dataResidencyRegion: true } },
      },
    });
    const map = new Map<
      string,
      { companyId: string; officeName: string; region: string }
    >();
    for (const r of rows) {
      if (r.stripeCustomerId) {
        map.set(r.stripeCustomerId, {
          companyId: r.id,
          officeName: r.legalName.trim(),
          region: r.corporation.dataResidencyRegion,
        });
      }
    }
    return map;
  }

  /** Shapes one Stripe Invoice into the finance admin list DTO (amount, status, company, plan label, PDF link). */
  private mapInvoiceToAdminItem(
    inv: Stripe.Invoice,
    companyMap: Map<
      string,
      { companyId: string; officeName: string; region: string }
    >,
    planTypesByPriceId: Map<string, { id: string; name: string }>,
  ): InvoiceAdminListItem {
    const customerId =
      typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
    const companyInfo = customerId ? companyMap.get(customerId) : undefined;

    let charge: Stripe.Charge | null = null;
    if (typeof inv.charge === 'object' && inv.charge) {
      charge = inv.charge;
    }

    return {
      id: inv.id,
      displayId: inv.number ?? inv.id,
      amountCents: inv.total ?? 0,
      currency: inv.currency,
      stripeStatus: inv.status ?? 'unknown',
      uiStatus: this.mapInvoiceUiStatus(inv.status),
      created: inv.created,
      paymentType: charge ? this.paymentTypeFromCharge(charge) : null,
      companyId: companyInfo?.companyId ?? null,
      companyOfficeName: companyInfo?.officeName ?? null,
      companyRegion: companyInfo?.region ?? null,
      ...this.resolvePlanFromStripeInvoice(inv, planTypesByPriceId),
      invoicePdf: inv.invoice_pdf ?? null,
    };
  }

  /** Gathers unique Stripe Price ids from expanded invoice line items for plan-type label resolution. */
  private collectStripePriceIdsFromInvoices(
    invoices: Stripe.Invoice[],
  ): string[] {
    const ids = new Set<string>();
    for (const inv of invoices) {
      for (const line of inv.lines?.data ?? []) {
        const pid = this.stripePriceIdFromLineItem(line);
        if (pid) {
          ids.add(pid);
        }
      }
    }
    return [...ids];
  }

  /** Reads `price` as string id or expanded object; returns null for missing or deleted prices. */
  private stripePriceIdFromLineItem(
    line: Stripe.InvoiceLineItem,
  ): string | null {
    const p = line.price;
    if (typeof p === 'string') {
      return p;
    }
    if (typeof p === 'object' && p !== null && 'id' in p) {
      if ('deleted' in p && (p as { deleted?: boolean }).deleted === true) {
        return null;
      }
      return p.id;
    }
    return null;
  }

  /** Joins `pricing_plans` → `plan_types` to map each `stripe_price_id` to plan type id and name. */
  private async buildPlanTypeByStripePriceId(
    priceIds: string[],
  ): Promise<Map<string, { id: string; name: string }>> {
    const map = new Map<string, { id: string; name: string }>();
    if (priceIds.length === 0) {
      return map;
    }
    const rows = await this.prisma.pricingPlan.findMany({
      where: { stripePriceId: { in: priceIds } },
      select: {
        stripePriceId: true,
        planType: { select: { id: true, name: true } },
      },
    });
    for (const row of rows) {
      if (row.stripePriceId && !map.has(row.stripePriceId)) {
        map.set(row.stripePriceId, {
          id: row.planType.id,
          name: row.planType.name,
        });
      }
    }
    return map;
  }

  /**
   * Plan column: `PlanType.name` and `plan_types.id` for the first line whose `price` id
   * matches `PricingPlan.stripePriceId`.
   */
  private resolvePlanFromStripeInvoice(
    inv: Stripe.Invoice,
    planTypesByPriceId: Map<string, { id: string; name: string }>,
  ): { planLabel: string | null; planTypeId: string | null } {
    const lines = inv.lines?.data;
    if (!lines?.length) {
      return { planLabel: null, planTypeId: null };
    }
    for (const line of lines) {
      const priceId = this.stripePriceIdFromLineItem(line);
      if (priceId && planTypesByPriceId.has(priceId)) {
        const planType = planTypesByPriceId.get(priceId)!;
        const name =
          planType.name.length > 120
            ? `${planType.name.slice(0, 117)}...`
            : planType.name;
        return { planLabel: name, planTypeId: planType.id };
      }
    }
    return { planLabel: null, planTypeId: null };
  }

  /** Collapses Stripe invoice statuses into coarse admin UI buckets (paid / pending / failed). */
  private mapInvoiceUiStatus(
    status: Stripe.Invoice.Status | null,
  ): InvoiceAdminUiStatus {
    switch (status) {
      case 'paid':
        return 'paid';
      case 'void':
      case 'uncollectible':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /** Infers ACH vs card vs offline from `payment_method_details` on the expanded Charge object. */
  private paymentTypeFromCharge(
    charge: Stripe.Charge,
  ): InvoiceAdminPaymentType | null {
    const d = charge.payment_method_details;
    if (!d) {
      return null;
    }
    if (d.card) {
      return 'CC';
    }
    if (d.us_bank_account) {
      return 'ACH';
    }
    if (d.type === 'card') {
      return 'CC';
    }
    if (d.type === 'us_bank_account') {
      return 'ACH';
    }
    return 'Offline';
  }

  /**
   * Super Admin promos: creates a Stripe Coupon (discount rules + optional `applies_to.products`),
   * then a Promotion Code (customer-entered string) pointing at that coupon.
   */
  async createCouponAndPromotionCode(params: {
    code: string;
    discountType: 'percent' | 'fixed_amount';
    percentOff?: number;
    amountOffMinor?: number;
    currency?: string;
    duration: 'once' | 'forever';
    expiresAt?: Date | null;
    maxRedemptions?: number | null;
    /** When set, coupon only applies to these Stripe Product IDs (from `applies_to.products`). */
    appliesToProductIds?: string[];
  }): Promise<{ couponId: string; promotionCodeId: string }> {
    const stripe = this.requireStripe();
    const duration: Stripe.CouponCreateParams['duration'] =
      params.duration === 'once' ? 'once' : 'forever';

    // Coupon carries discount math; promotion code is the redeemable customer-facing code.
    const couponParams: Stripe.CouponCreateParams = {
      name: params.code,
      duration,
    };

    if (params.discountType === 'percent') {
      if (params.percentOff == null) {
        throw new BadRequestException('Internal: percentOff required');
      }
      couponParams.percent_off = params.percentOff;
    } else {
      if (params.amountOffMinor == null || !params.currency?.trim()) {
        throw new BadRequestException(
          'Internal: fixed amount requires currency',
        );
      }
      couponParams.amount_off = params.amountOffMinor;
      couponParams.currency = params.currency.trim().toLowerCase();
    }

    if (params.appliesToProductIds?.length) {
      couponParams.applies_to = {
        products: params.appliesToProductIds,
      };
    }

    const coupon = await stripe.coupons.create(couponParams);

    // Promotion code must reference the coupon id; schedule limits live on the promotion object.
    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: coupon.id,
      code: params.code,
      active: true,
    };
    if (params.expiresAt) {
      promoParams.expires_at = Math.floor(params.expiresAt.getTime() / 1000);
    }
    if (params.maxRedemptions != null) {
      promoParams.max_redemptions = params.maxRedemptions;
    }

    try {
      const promotionCode = await stripe.promotionCodes.create(promoParams);
      return {
        couponId: coupon.id,
        promotionCodeId: promotionCode.id,
      };
    } catch (err) {
      // Avoid leaving a headless coupon if promotion code creation fails.
      try {
        await stripe.coupons.del(coupon.id);
      } catch (delErr) {
        const msg = delErr instanceof Error ? delErr.message : String(delErr);
        this.logger.warn(
          `Failed to delete orphaned coupon ${coupon.id} after promotion code failure: ${msg}`,
        );
      }
      throw err;
    }
  }

  /**
   * Resolves each Stripe Price to its Product id (deduped). Used to build coupon `applies_to.products`.
   */
  async resolveProductIdsFromPriceIds(priceIds: string[]): Promise<string[]> {
    if (priceIds.length === 0) {
      return [];
    }
    const stripe = this.requireStripe();
    const productIds = new Set<string>();
    for (const priceId of priceIds) {
      // Default retrieve returns `product` as id string unless expanded.
      const price = await stripe.prices.retrieve(priceId);
      const product = price.product;
      const id = typeof product === 'string' ? product : product?.id;
      if (id) {
        productIds.add(id);
      }
    }
    return [...productIds];
  }

  /**
   * True when the coupon has no product restriction or includes `productId` in `applies_to.products`.
   */
  async couponAppliesToProduct(
    couponId: string,
    productId: string,
  ): Promise<boolean> {
    const trimmedCouponId = couponId?.trim();
    const trimmedProductId = productId?.trim();
    if (!trimmedCouponId || !trimmedProductId) {
      return false;
    }
    const stripe = this.requireStripe();
    const coupon = await stripe.coupons.retrieve(trimmedCouponId);
    const products = coupon.applies_to?.products;
    if (!products?.length) {
      return true;
    }
    return products.includes(trimmedProductId);
  }

  /**
   * Adds another promotion code on the same coupon (e.g. customer-facing rename) without changing discount rules.
   */
  async createPromotionCodeForCoupon(params: {
    couponId: string;
    code: string;
    expiresAt?: Date | null;
    maxRedemptions?: number | null;
  }): Promise<{ promotionCodeId: string }> {
    const stripe = this.requireStripe();
    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: params.couponId,
      code: params.code,
      active: true,
    };
    if (params.expiresAt) {
      promoParams.expires_at = Math.floor(params.expiresAt.getTime() / 1000);
    }
    if (params.maxRedemptions != null) {
      promoParams.max_redemptions = params.maxRedemptions;
    }
    const promotionCode = await stripe.promotionCodes.create(promoParams);
    return { promotionCodeId: promotionCode.id };
  }

  /**
   * Updates expiry and/or max redemptions on an existing promotion code (no new coupon).
   * Stripe's OpenAPI typings omit these fields on `UpdateParams`; the live API accepts them.
   */
  async updatePromotionCodeSchedule(
    promotionCodeId: string,
    params: {
      expiresAt: Date | null;
      maxRedemptions: number | null;
    },
  ): Promise<void> {
    const stripe = this.requireStripe();
    const update: Record<string, unknown> = {};
    if (params.expiresAt) {
      update.expires_at = Math.floor(params.expiresAt.getTime() / 1000);
    }
    if (params.maxRedemptions != null && params.maxRedemptions >= 1) {
      update.max_redemptions = params.maxRedemptions;
    }
    if (Object.keys(update).length === 0) {
      return;
    }
    // Cast: typings lag behind fields Stripe accepts on promotion code update.
    await stripe.promotionCodes.update(
      promotionCodeId,
      update as Stripe.PromotionCodeUpdateParams,
    );
  }

  /** Soft-disable a promotion code (codes are not hard-deleted in Stripe). */
  async deactivatePromotionCode(promotionCodeId: string): Promise<void> {
    const stripe = this.requireStripe();
    await stripe.promotionCodes.update(promotionCodeId, { active: false });
  }

  /** Sets Stripe promotion code `active` (enable/disable redemption without deleting the code). */
  async setPromotionCodeActiveState(
    promotionCodeId: string,
    active: boolean,
  ): Promise<void> {
    const stripe = this.requireStripe();
    await stripe.promotionCodes.update(promotionCodeId, { active });
  }

  /** Loads promotion code flags used by Super Admin promo detail (active + redemption counts). */
  async retrievePromotionCodeSummary(promotionCodeId: string): Promise<{
    active: boolean;
    timesRedeemed: number;
    maxRedemptions: number | null;
  }> {
    const stripe = this.requireStripe();
    const pc = await stripe.promotionCodes.retrieve(promotionCodeId);
    return {
      active: pc.active,
      timesRedeemed: pc.times_redeemed ?? 0,
      maxRedemptions: pc.max_redemptions ?? null,
    };
  }

  // --- Super Admin billing dashboard (companies + Stripe subscription) ---

  /** Prefer Stripe invoice number, else customer id. */
  private async resolveAdminBillingId(params: {
    stripe: Stripe;
    stripeCustomerId: string;
  }): Promise<string> {
    try {
      const invoices = await params.stripe.invoices.list({
        customer: params.stripeCustomerId,
        limit: 1,
      });
      const number = invoices.data[0]?.number?.trim();
      if (number) {
        return number;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Billing id invoice list failed for ${params.stripeCustomerId}: ${msg}`,
      );
    }
    return params.stripeCustomerId;
  }

  /** Fallback next charge from the subscription's first line item when upcoming invoice is unavailable. */
  private subscriptionItemAmountCents(
    sub: Stripe.Subscription,
  ): { cents: number; currency: string } | null {
    const item0 = sub.items?.data?.[0];
    const price = item0?.price;
    if (typeof price !== 'object' || !price) {
      return null;
    }
    const unit =
      typeof price.unit_amount === 'number' ? price.unit_amount : null;
    const qty = item0?.quantity ?? 1;
    if (unit == null) {
      return null;
    }
    return {
      cents: unit * qty,
      currency: price.currency ?? sub.currency ?? 'usd',
    };
  }

  /** Uses Stripe `invoices.retrieveUpcoming` for the next billing total shown in the admin UI. */
  private async resolveUpcomingInvoiceAmount(params: {
    stripe: Stripe;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
  }): Promise<{ cents: number; currency: string } | null> {
    try {
      const upcoming = await params.stripe.invoices.retrieveUpcoming({
        customer: params.stripeCustomerId,
        subscription: params.stripeSubscriptionId,
      });
      if (typeof upcoming.total === 'number') {
        return {
          cents: upcoming.total,
          currency: upcoming.currency ?? 'usd',
        };
      }
    } catch {
      // No upcoming invoice (e.g. canceled subscription).
    }
    return null;
  }

  /** Maps BSP `plan_types.id` to display labels for billing cycle column. */
  private billingCycleLabelFromPlanTypeId(
    planTypeId: string | null,
  ): string | null {
    if (!planTypeId) {
      return null;
    }
    if (planTypeId === 'monthly') {
      return 'Monthly';
    }
    if (planTypeId === 'annual') {
      return 'Annual';
    }
    if (planTypeId === 'one_time') {
      return 'One-time';
    }
    return planTypeId;
  }

  /**
   * Derives coarse paid/pending/failed UI status from subscription state and latest invoice.
   * Sets `inconsistent` when BSP shows active but the latest invoice is still open.
   */
  private deriveBillingPaymentStatus(params: {
    subscriptionStatus: BillingSubscriptionUiStatus;
    latestInvoice: Stripe.Invoice | null;
    planTypeId?: string | null;
  }): { paymentStatus: BillingPaymentUiStatus; inconsistent: boolean } {
    const { subscriptionStatus, latestInvoice, planTypeId } = params;
    if (!latestInvoice) {
      // One-time Checkout (`mode: payment`) sets subscriptionStatus active on paid
      // webhook but does not create a Stripe Subscription or subscription invoice.
      if (planTypeId === 'one_time' && subscriptionStatus === 'active') {
        return { paymentStatus: 'paid', inconsistent: false };
      }

      const pendingSubs: BillingSubscriptionUiStatus[] = [
        'trialing',
        'incomplete',
        'none',
      ];
      return {
        paymentStatus: pendingSubs.includes(subscriptionStatus)
          ? 'pending'
          : subscriptionStatus === 'past_due'
            ? 'failed'
            : subscriptionStatus === 'canceled'
              ? 'paid'
              : 'pending',
        inconsistent: subscriptionStatus === 'active',
      };
    }

    const st = latestInvoice.status;
    if (st === 'paid') {
      return { paymentStatus: 'paid', inconsistent: false };
    }
    if (st === 'uncollectible') {
      return { paymentStatus: 'failed', inconsistent: false };
    }
    if (st === 'open') {
      const pi = latestInvoice.payment_intent;
      const piObj = typeof pi === 'object' && pi ? pi : null;
      if (piObj?.status === 'requires_payment_method') {
        return { paymentStatus: 'failed', inconsistent: false };
      }
      const inconsistent = subscriptionStatus === 'active';
      return { paymentStatus: 'pending', inconsistent };
    }
    return { paymentStatus: 'pending', inconsistent: false };
  }

  /** Maps Stripe default payment method to ACH / card / offline filter buckets. */
  private paymentTypeFromPm(
    pm: Stripe.PaymentMethod | string | null | undefined,
  ): BillingPaymentMethodType {
    if (!pm || typeof pm === 'string') {
      return 'offline';
    }
    if (pm.type === 'us_bank_account') {
      return 'ach';
    }
    if (pm.type === 'card') {
      return 'cc';
    }
    return 'offline';
  }

  /** Normalizes DB/Stripe subscription status strings for billing dashboard badges. */
  private normalizeSubscriptionUiStatus(
    raw: string | null | undefined,
  ): BillingSubscriptionUiStatus {
    if (!raw) {
      return 'none';
    }
    const v = raw.toLowerCase();
    if (v === 'cancelled') {
      return 'canceled';
    }
    if (v === 'trial') {
      return 'trialing';
    }
    if (
      v === 'active' ||
      v === 'trialing' ||
      v === 'past_due' ||
      v === 'canceled' ||
      v === 'incomplete' ||
      v === 'unpaid'
    ) {
      return v as BillingSubscriptionUiStatus;
    }
    return 'none';
  }

  /** Prisma filter for companies that participate in billing (Stripe or plan on file). */
  private buildBillingListWhere(
    query: ListBillingRecordsQueryDto,
  ): Prisma.CorporationCompanyWhereInput {
    const and: Prisma.CorporationCompanyWhereInput[] = [
      { deletedAt: null },
      {
        OR: [
          { stripeCustomerId: { not: null } },
          { stripeSubscriptionId: { not: null } },
          { planId: { not: null } },
        ],
      },
    ];

    if (query.planTypeId) {
      and.push({ plan: { is: { planTypeId: query.planTypeId } } });
    }

    if (query.subscriptionStatus && query.subscriptionStatus !== 'all') {
      if (query.subscriptionStatus === 'none') {
        and.push({
          OR: [{ subscriptionStatus: null }, { subscriptionStatus: '' }],
        });
      } else if (query.subscriptionStatus === 'canceled') {
        // DB may still be active/trialing/past_due when Stripe has cancel_at_period_end.
        // Final match uses enriched row in billingRowMatchesQuery.
        and.push({
          OR: [
            { subscriptionStatus: { equals: 'canceled', mode: 'insensitive' } },
            {
              subscriptionStatus: { equals: 'cancelled', mode: 'insensitive' },
            },
            {
              subscriptionStatus: {
                in: ['active', 'trialing', 'past_due'],
                mode: 'insensitive',
              },
              OR: [
                { stripeSubscriptionId: { not: null } },
                { stripeCustomerId: { not: null } },
              ],
            },
          ],
        });
      }
      // active, trialing, past_due, incomplete, unpaid: match on Stripe-enriched status
      // in billingRowMatchesQuery (DB subscriptionStatus may be stale).
    }

    const q = query.search?.trim();
    if (q) {
      and.push({
        OR: [
          { legalName: { contains: q, mode: 'insensitive' } },
          { dbaName: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    return { AND: and };
  }

  /** Post-enrich filters (payment status, billing cycle, renewal window) not expressible in Prisma alone. */
  private billingRowMatchesQuery(
    row: BillingAdminListItem,
    query: ListBillingRecordsQueryDto,
  ): boolean {
    if (query.subscriptionStatus && query.subscriptionStatus !== 'all') {
      if (query.subscriptionStatus === 'none') {
        if (row.subscriptionStatus !== 'none') {
          return false;
        }
      } else if (query.subscriptionStatus === 'canceled') {
        const matchesCanceled =
          row.subscriptionStatus === 'canceled' ||
          (row.cancelAtPeriodEnd &&
            (row.subscriptionStatus === 'active' ||
              row.subscriptionStatus === 'trialing' ||
              row.subscriptionStatus === 'past_due'));
        if (!matchesCanceled) {
          return false;
        }
      } else if (row.subscriptionStatus !== query.subscriptionStatus) {
        return false;
      }
    }

    if (query.billingCycles?.trim()) {
      const allowed = new Set(
        query.billingCycles
          .split(',')
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean),
      );
      const cycleId =
        row.billingCycle?.toLowerCase() === 'one-time'
          ? 'one_time'
          : row.billingCycle?.toLowerCase();
      if (!cycleId || !allowed.has(cycleId)) {
        return false;
      }
    }

    if (query.paymentTypes?.trim()) {
      const allowed = new Set(
        query.paymentTypes
          .split(',')
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean),
      );
      const type = row.paymentType ?? 'offline';
      if (!allowed.has(type)) {
        return false;
      }
    }

    if (query.timePeriod) {
      if (!row.renewalDate) {
        return false;
      }
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const gte =
        query.timePeriod === '1h'
          ? now - 60 * 60 * 1000
          : query.timePeriod === '7d'
            ? now - 7 * dayMs
            : query.timePeriod === '30d'
              ? now - 30 * dayMs
              : query.timePeriod === '3m'
                ? now - 90 * dayMs
                : query.timePeriod === '6m'
                  ? now - 180 * dayMs
                  : now - 365 * dayMs;
      const renewalTs = new Date(`${row.renewalDate}T00:00:00Z`).getTime();
      if (Number.isNaN(renewalTs) || renewalTs < gte) {
        return false;
      }
    }

    if (query.paymentStatus && query.paymentStatus !== 'all') {
      if (row.paymentStatus !== query.paymentStatus) {
        return false;
      }
    }
    return true;
  }

  /** In-memory comparator for enriched billing rows after the scan/filter pass. */
  private compareBillingValues(
    a: BillingAdminListItem,
    b: BillingAdminListItem,
    sortBy: NonNullable<ListBillingRecordsQueryDto['sortBy']>,
    sortOrder: ListBillingRecordsQueryDto['sortOrder'],
  ): number {
    const get = (row: BillingAdminListItem): string | number => {
      switch (sortBy) {
        case 'billingId':
          return row.billingId ?? '';
        case 'companyName':
          return row.companyName;
        case 'planLabel':
          return row.planLabel ?? '';
        case 'billingCycle':
          return row.billingCycle ?? '';
        case 'subscriptionStatus':
          return row.subscriptionStatus;
        case 'renewalDate':
          return row.renewalDate ?? '';
        case 'paymentStatus':
          return row.paymentStatus;
        case 'nextBillingAmount':
          return row.nextBillingAmountCents ?? -1;
        case 'paymentType':
          return row.paymentType ?? 'offline';
      }
    };
    const av = get(a);
    const bv = get(b);
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortOrder === 'desc' ? -cmp : cmp;
  }

  /** Row action flags for list/detail UI (edit, retry, cancel, reinstate). */
  private computeBillingActions(
    row: BillingAdminListItem,
  ): Pick<
    BillingAdminListItem,
    | 'canEdit'
    | 'canRetryPayment'
    | 'canCancelSubscription'
    | 'canReinstateSubscription'
  > {
    const s = row.subscriptionStatus;
    const p = row.paymentStatus;
    const hasSub = Boolean(row.stripeSubscriptionId);
    const isActiveSubscription = StripeService.UPGRADE_ELIGIBLE_STATUSES.has(s);
    const isOneTimePlan = row.planTypeId === 'one_time';
    // Rows scheduled to cancel show subscriptionStatus `canceled` but remain upgrade-eligible.
    const cancelScheduledStillUpgradeable = hasSub && row.cancelAtPeriodEnd;

    const canEdit =
      isOneTimePlan || isActiveSubscription || cancelScheduledStillUpgradeable;

    const canRetryPayment = hasSub && isActiveSubscription && p === 'failed';

    const canCancelSubscription =
      hasSub && isActiveSubscription && !row.cancelAtPeriodEnd;

    const canReinstateSubscription = hasSub && row.cancelAtPeriodEnd;

    return {
      canEdit,
      canRetryPayment,
      canCancelSubscription,
      canReinstateSubscription,
    };
  }

  /**
   * Loads Stripe subscription, latest invoice, upcoming amount, and payment method
   * for one company; merges with BSP plan fields into a billing dashboard row.
   */
  private async enrichCompanyBillingRow(params: {
    company: {
      id: string;
      companyCode: number;
      legalName: string;
      dbaName: string | null;
      subscriptionStatus: string | null;
      stripeSubscriptionId: string | null;
      stripeCustomerId: string | null;
      planId: string | null;
      createdAt: Date;
      plan: {
        id?: string;
        employeeRangeMin: number | null;
        employeeRangeMax: number | null;
        price?: Prisma.Decimal;
        planType: { id: string; name: string };
      } | null;
      planSeat: {
        planPrice: Prisma.Decimal;
        discount: Prisma.Decimal;
        invoiceAmount: Prisma.Decimal;
      } | null;
      assessmentQuantity: number | null;
      corporation: { dataResidencyRegion: string };
    };
  }): Promise<BillingAdminListItem> {
    const { company } = params;
    let billingId: string | null = null;
    const companyName = (company.dbaName?.trim() || company.legalName).trim();
    const region = company.corporation.dataResidencyRegion;

    let planLabel: string | null = null;
    let planLevel: string | null = null;
    let planTypeId: string | null = null;
    let billingCycle: string | null = null;
    if (company.plan) {
      planTypeId = company.plan.planType.id;
      const cycle = this.billingCycleLabelFromPlanTypeId(planTypeId);
      billingCycle = cycle;
      planLabel = company.plan.planType.name;
      planLevel = formatPlanEmployeeRange(
        company.plan.employeeRangeMin,
        company.plan.employeeRangeMax,
      );
    }

    let subscriptionStatus = this.normalizeSubscriptionUiStatus(
      company.subscriptionStatus,
    );
    let cancelAtPeriodEnd = false;
    let latestInvoice: Stripe.Invoice | null = null;
    let renewalDate: string | null = null;
    let currentPeriodStart: string | null = null;
    let currentPeriodEnd: string | null = null;
    let nextBillingAmountCents: number | null = null;
    let nextBillingCurrency: string | null = null;
    let paymentType: BillingPaymentMethodType = null;

    if (this.stripe) {
      const stripe = this.requireStripe();
      if (company.stripeCustomerId) {
        billingId = await this.resolveAdminBillingId({
          stripe,
          stripeCustomerId: company.stripeCustomerId,
        });
      }

      let subscriptionId = company.stripeSubscriptionId;
      if (!subscriptionId && company.stripeCustomerId) {
        try {
          const subs = await stripe.subscriptions.list({
            customer: company.stripeCustomerId,
            status: 'all',
            limit: 1,
          });
          subscriptionId = subs.data[0]?.id ?? null;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(
            `Billing subscription list failed for company ${company.id}: ${msg}`,
          );
        }
      }

      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: [
              'latest_invoice',
              'latest_invoice.payment_intent',
              'default_payment_method',
              'items.data.price',
            ],
          });
          subscriptionStatus = this.normalizeSubscriptionUiStatus(sub.status);
          cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
          if (
            cancelAtPeriodEnd &&
            (subscriptionStatus === 'active' ||
              subscriptionStatus === 'trialing' ||
              subscriptionStatus === 'past_due')
          ) {
            subscriptionStatus = 'canceled';
          }
          const li = sub.latest_invoice;
          if (typeof li === 'object' && li) {
            latestInvoice = li;
          }
          if (sub.current_period_end) {
            currentPeriodEnd = new Date(sub.current_period_end * 1000)
              .toISOString()
              .slice(0, 10);
            renewalDate = currentPeriodEnd;
          }
          if (sub.current_period_start) {
            currentPeriodStart = new Date(sub.current_period_start * 1000)
              .toISOString()
              .slice(0, 10);
          }
          if (company.stripeCustomerId) {
            const upcoming = await this.resolveUpcomingInvoiceAmount({
              stripe,
              stripeCustomerId: company.stripeCustomerId,
              stripeSubscriptionId: subscriptionId,
            });
            if (upcoming) {
              nextBillingAmountCents = upcoming.cents;
              nextBillingCurrency = upcoming.currency;
            }
          }
          if (nextBillingAmountCents == null) {
            const itemAmount = this.subscriptionItemAmountCents(sub);
            if (itemAmount) {
              nextBillingAmountCents = itemAmount.cents;
              nextBillingCurrency = itemAmount.currency;
            }
          }
          paymentType = this.paymentTypeFromPm(sub.default_payment_method);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(
            `Billing enrich failed for company ${company.id}: ${msg}`,
          );
        }
      }

      if (!latestInvoice && company.stripeCustomerId && !subscriptionId) {
        try {
          const invoices = await stripe.invoices.list({
            customer: company.stripeCustomerId,
            limit: 1,
            expand: ['data.payment_intent'],
          });
          latestInvoice = invoices.data[0] ?? null;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(
            `Billing customer invoice list failed for company ${company.id}: ${msg}`,
          );
        }
      }
    }

    if (nextBillingAmountCents == null && latestInvoice != null) {
      const invoiceCents =
        latestInvoice.amount_paid ?? latestInvoice.total ?? null;
      if (invoiceCents != null && invoiceCents > 0) {
        nextBillingAmountCents = invoiceCents;
        nextBillingCurrency =
          latestInvoice.currency ?? nextBillingCurrency ?? 'usd';
      }
    }

    if (nextBillingAmountCents == null && company.planSeat) {
      if (planTypeId === 'one_time') {
        const dollars = computeOneTimePlanDisplayInvoiceAmount(
          company.planSeat,
          company.assessmentQuantity,
        );
        nextBillingAmountCents = majorUnitsToInvoiceCents(dollars);
        nextBillingCurrency = nextBillingCurrency ?? 'usd';
      } else if (company.planSeat.invoiceAmount != null) {
        const dollars = Number(company.planSeat.invoiceAmount);
        if (!Number.isNaN(dollars)) {
          nextBillingAmountCents = Math.round(dollars * 100);
          nextBillingCurrency = nextBillingCurrency ?? 'usd';
        }
      }
    }

    const { paymentStatus, inconsistent } = this.deriveBillingPaymentStatus({
      subscriptionStatus,
      latestInvoice,
      planTypeId,
    });

    const oneTimePaymentCents =
      planTypeId === 'one_time' && company.plan?.price != null
        ? Math.round(Number(company.plan.price) * 100)
        : null;

    const row: BillingAdminListItem = {
      companyId: company.id,
      billingId,
      companyName,
      companyRegion: region,
      planLabel,
      planLevel,
      planTypeId,
      pricingPlanId: company.planId,
      billingCycle,
      subscriptionStatus,
      paymentStatus,
      renewalDate,
      currentPeriodStart,
      currentPeriodEnd,
      oneTimePaymentCents,
      nextBillingAmountCents,
      nextBillingCurrency,
      paymentType,
      inconsistentBillingState: inconsistent,
      cancelAtPeriodEnd,
      canEdit: false,
      canRetryPayment: false,
      canCancelSubscription: false,
      canReinstateSubscription: false,
      stripeSubscriptionId: company.stripeSubscriptionId,
    };
    Object.assign(row, this.computeBillingActions(row));
    return row;
  }

  /**
   * Paginated Super Admin billing rows: DB filters + Stripe enrich per row.
   * Scans companies in `companyCode` order until the page is filled (payment filter may skip rows).
   */
  async listBillingRecordsForAdmin(
    query: ListBillingRecordsQueryDto,
  ): Promise<BillingAdminListResult> {
    const limit = query.limit;
    const page = query.page;
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const baseWhere = this.buildBillingListWhere(query);

    const prismaSelect = {
      id: true,
      companyCode: true,
      legalName: true,
      dbaName: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      stripeCustomerId: true,
      planId: true,
      createdAt: true,
      assessmentQuantity: true,
      plan: {
        select: {
          id: true,
          price: true,
          employeeRangeMin: true,
          employeeRangeMax: true,
          planType: { select: { id: true, name: true } },
        },
      },
      planSeat: {
        select: {
          planPrice: true,
          discount: true,
          invoiceAmount: true,
        },
      },
      corporation: { select: { dataResidencyRegion: true } },
    } as const;

    const matchedRows: BillingAdminListItem[] = [];
    let prismaSkip = 0;
    const PRISMA_BATCH = 40;
    const MAX_SCAN = 8000;
    let truncatedTotal = false;

    while (prismaSkip < MAX_SCAN) {
      const companies = await this.prisma.corporationCompany.findMany({
        where: baseWhere,
        orderBy: { companyCode: 'asc' },
        skip: prismaSkip,
        take: PRISMA_BATCH,
        select: prismaSelect,
      });
      if (companies.length === 0) {
        break;
      }
      const enriched = await Promise.all(
        companies.map((c) => this.enrichCompanyBillingRow({ company: c })),
      );
      for (const row of enriched) {
        if (!this.billingRowMatchesQuery(row, query)) {
          continue;
        }
        matchedRows.push(row);
      }
      prismaSkip += companies.length;
      if (companies.length < PRISMA_BATCH) {
        break;
      }
    }

    if (prismaSkip >= MAX_SCAN) {
      const tail = await this.prisma.corporationCompany.findMany({
        where: baseWhere,
        orderBy: { companyCode: 'asc' },
        skip: prismaSkip,
        take: 1,
        select: { id: true },
      });
      if (tail.length > 0) {
        truncatedTotal = true;
      }
    }

    if (query.sortBy) {
      matchedRows.sort((a, b) =>
        this.compareBillingValues(a, b, query.sortBy!, query.sortOrder),
      );
    }
    const items = matchedRows.slice(startIdx, endIdx);
    const totalCount = matchedRows.length;
    const hasNextPage = endIdx < totalCount || truncatedTotal;

    return {
      items,
      page,
      limit,
      totalCount,
      totalTruncated: truncatedTotal,
      hasNextPage,
    };
  }

  /** Distinct pricing plans for Super Admin billing filters. */
  async getBillingPlanFilterOptions(): Promise<
    Array<{ value: string; label: string }>
  > {
    const rows = await this.prisma.planType.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => ({ value: r.id, label: r.name }));
  }

  /**
   * Builds Stripe Price id → plan type map for billing-history labels.
   * Only plans with `stripePriceId` set can be resolved from subscription/invoice events.
   */
  private async loadPlanByStripePriceIdMap(): Promise<PlanByStripePriceId> {
    const rows = await this.prisma.pricingPlan.findMany({
      where: { stripePriceId: { not: null } },
      select: {
        stripePriceId: true,
        planType: { select: { id: true, name: true } },
      },
    });
    const map: PlanByStripePriceId = new Map();
    for (const row of rows) {
      if (row.stripePriceId) {
        map.set(row.stripePriceId, {
          planTypeId: row.planType.id,
          planLabel: row.planType.name,
        });
      }
    }
    return map;
  }

  /**
   * Paginated billing history for Super Admin company billing detail.
   * Fetches Stripe Events API (filtered by type), maps to UI rows, filters/sorts in memory.
   * Actor is System/BSPBlueprint until audit-backed user actions exist.
   */
  async listBillingHistoryForAdmin(
    companyId: string,
    query: ListBillingHistoryQueryDto,
  ): Promise<BillingHistoryListResult> {
    const empty: BillingHistoryListResult = {
      items: [],
      page: query.page,
      limit: query.limit,
      totalCount: 0,
      hasNextPage: false,
    };

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { stripeCustomerId: true },
    });
    // Companies without a Stripe customer have no event stream to show.
    if (!company?.stripeCustomerId) {
      return empty;
    }

    const stripe = this.requireStripe();
    const customerId = company.stripeCustomerId;
    const planByPriceId = await this.loadPlanByStripePriceIdMap();
    const raw: BillingHistoryListResult['items'] = [];
    // Stripe Events list is account-wide; cap pages/events then filter by customer id.
    const MAX_EVENTS = 400;
    const MAX_PAGES = 8;
    let startingAfter: string | undefined;
    let pages = 0;

    while (raw.length < MAX_EVENTS && pages < MAX_PAGES) {
      const resp = await stripe.events.list({
        limit: 100,
        types: [...BILLING_HISTORY_STRIPE_EVENT_TYPES],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const event of resp.data) {
        if (extractStripeEventCustomerId(event) !== customerId) {
          continue;
        }
        const mapped = mapStripeEventToBillingHistory(event, planByPriceId);
        if (mapped) {
          raw.push(mapped);
        }
      }
      if (!resp.has_more || resp.data.length === 0) {
        break;
      }
      startingAfter = resp.data[resp.data.length - 1]?.id;
      pages += 1;
    }

    const auditRows = await this.prisma.billingSubscriptionAction.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        action: true,
        planLabel: true,
        planTypeId: true,
        amountCents: true,
        currency: true,
        actorName: true,
        actorRole: true,
        actorKind: true,
        newPlanLevel: true,
        adjustmentAmountCents: true,
        createdAt: true,
      },
    });
    const auditEvents: BillingHistoryListResult['items'] = auditRows.map(
      (action) => {
        const eventType: BillingHistoryEventType =
          action.action === 'reinstate'
            ? 'subscription_reinstated'
            : action.action === 'plan_upgrade'
              ? 'plan_upgraded'
              : 'subscription_canceled';
        return {
          eventId: action.id,
          eventType,
          planLabel: action.planLabel,
          planTypeId: action.planTypeId,
          amountCents: action.adjustmentAmountCents ?? action.amountCents,
          currency: action.currency,
          actorName: action.actorName,
          actorRole: action.actorRole,
          actorKind: action.actorKind as BillingHistoryActorKind,
          occurredAt: Math.floor(action.createdAt.getTime() / 1000),
        };
      },
    );
    const auditOccurredAtByType = new Map<BillingHistoryEventType, number[]>();
    for (const audit of auditEvents) {
      const list = auditOccurredAtByType.get(audit.eventType) ?? [];
      list.push(audit.occurredAt);
      auditOccurredAtByType.set(audit.eventType, list);
    }
    const stripeFiltered = raw.filter(
      (e) => !shouldSkipStripeHistoryEventForAudit(e, auditOccurredAtByType),
    );

    let filtered = [...auditEvents, ...stripeFiltered];
    if (query.eventType && query.eventType !== 'all') {
      filtered = filtered.filter((e) => e.eventType === query.eventType);
    }
    if (query.planTypeId) {
      filtered = filtered.filter((e) => e.planTypeId === query.planTypeId);
    }
    if (query.actorKind && query.actorKind !== 'all') {
      filtered = filtered.filter((e) => e.actorKind === query.actorKind);
    }

    const sortBy = query.sortBy ?? 'occurredAt';
    const sortOrder = query.sortOrder ?? 'desc';
    filtered.sort((a, b) =>
      compareBillingHistoryEvents(a, b, sortBy, sortOrder),
    );

    // Pagination is in-memory because Stripe does not filter events per customer.
    const totalCount = filtered.length;
    const startIdx = (query.page - 1) * query.limit;
    const items = filtered.slice(startIdx, startIdx + query.limit);
    const hasNextPage = startIdx + query.limit < totalCount;

    return {
      items,
      page: query.page,
      limit: query.limit,
      totalCount,
      hasNextPage,
    };
  }

  /** Single enriched billing row for the company detail view; null when not billable. */
  async getBillingRecordForAdmin(
    companyId: string,
  ): Promise<BillingAdminListItem | null> {
    const company = await this.prisma.corporationCompany.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        OR: [
          { stripeCustomerId: { not: null } },
          { stripeSubscriptionId: { not: null } },
          { planId: { not: null } },
        ],
      },
      select: {
        id: true,
        companyCode: true,
        legalName: true,
        dbaName: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        planId: true,
        createdAt: true,
        assessmentQuantity: true,
        plan: {
          select: {
            id: true,
            price: true,
            employeeRangeMin: true,
            employeeRangeMax: true,
            planType: { select: { id: true, name: true } },
          },
        },
        planSeat: {
          select: {
            planPrice: true,
            discount: true,
            invoiceAmount: true,
          },
        },
        corporation: { select: { dataResidencyRegion: true } },
      },
    });
    if (!company) {
      return null;
    }
    return this.enrichCompanyBillingRow({ company });
  }

  /**
   * Resolves actor display fields from Cognito user + app_users for billing audit rows.
   */
  async resolveBillingSubscriptionActor(
    cognitoSub: string,
    groups: string[],
  ): Promise<BillingSubscriptionActorContext> {
    const actorKind = resolveBillingActorKind(groups);
    const appUser = await this.prisma.appUser.findFirst({
      where: { cognitoSub, deletedAt: null },
      select: { firstName: true, lastName: true, email: true },
    });
    const nameParts = [appUser?.firstName, appUser?.lastName].filter(Boolean);
    const actorName =
      nameParts.length > 0
        ? nameParts.join(' ').trim()
        : (appUser?.email?.trim() ?? 'Admin');
    return {
      actorKind,
      actorCognitoSub: cognitoSub,
      actorName,
      actorRole: billingActorRoleLabel(actorKind),
    };
  }

  /**
   * Persists an admin cancel or reinstate action for billing-history actor attribution.
   * Snapshots plan and amount from the enriched billing row at action time.
   * Cancel rows store `reason` and optional `additionalNotes`; reinstate omits those fields.
   */
  private async recordBillingSubscriptionAction(params: {
    companyId: string;
    action: 'cancel' | 'reinstate';
    reason?: string;
    additionalNotes?: string;
    actor: BillingSubscriptionActorContext;
  }): Promise<void> {
    const billingRow = await this.getBillingRecordForAdmin(params.companyId);
    await this.prisma.billingSubscriptionAction.create({
      data: {
        companyId: params.companyId,
        action: params.action,
        reason: params.reason ?? null,
        additionalNotes: params.additionalNotes ?? null,
        actorKind: params.actor.actorKind,
        actorCognitoSub: params.actor.actorCognitoSub,
        actorName: params.actor.actorName,
        actorRole: params.actor.actorRole,
        planLabel: billingRow?.planLabel ?? null,
        planTypeId: billingRow?.planTypeId ?? null,
        amountCents: billingRow?.nextBillingAmountCents ?? null,
        currency: billingRow?.nextBillingCurrency ?? null,
      },
    });
  }

  /**
   * Schedules Stripe subscription cancellation at period end (not immediate delete).
   * No-op when cancel_at_period_end is already set.
   */
  async cancelCompanySubscriptionForAdmin(
    companyId: string,
    dto: CancelBillingSubscriptionDto,
    actor: BillingSubscriptionActorContext,
  ): Promise<void> {
    const stripe = this.requireStripe();
    const row = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { stripeSubscriptionId: true },
    });
    if (!row?.stripeSubscriptionId) {
      throw new BadRequestException(FINANCE_BILLING_NO_SUBSCRIPTION_ID_MSG);
    }
    const sub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
    if (sub.status === 'canceled') {
      throw new BadRequestException(
        FINANCE_BILLING_SUBSCRIPTION_ALREADY_CANCELED_MSG,
      );
    }
    if (sub.cancel_at_period_end) {
      return;
    }
    await stripe.subscriptions.update(row.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await this.recordBillingSubscriptionAction({
      companyId,
      action: 'cancel',
      reason: dto.reason,
      additionalNotes: dto.additionalNotes,
      actor,
    });
  }

  /**
   * Retries collection on the subscription latest invoice (`pay` or `sendInvoice`
   * when collection_method is send_invoice).
   */
  async retryCompanyPaymentForAdmin(companyId: string): Promise<void> {
    const stripe = this.requireStripe();
    const row = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { stripeSubscriptionId: true, stripeCustomerId: true },
    });
    if (!row?.stripeSubscriptionId) {
      throw new BadRequestException(FINANCE_BILLING_NO_STRIPE_SUBSCRIPTION_MSG);
    }
    const sub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId, {
      expand: ['latest_invoice'],
    });
    const invRef = sub.latest_invoice;
    const invId = typeof invRef === 'string' ? invRef : invRef?.id;
    if (!invId) {
      throw new BadRequestException(FINANCE_BILLING_NO_INVOICE_TO_RETRY_MSG);
    }
    const inv = await stripe.invoices.retrieve(invId);
    if (inv.status === 'paid') {
      throw new BadRequestException(FINANCE_BILLING_INVOICE_ALREADY_PAID_MSG);
    }
    if (inv.collection_method === 'send_invoice') {
      await stripe.invoices.sendInvoice(invId);
      return;
    }
    try {
      await stripe.invoices.pay(invId, { paid_out_of_band: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(
        FINANCE_BILLING_STRIPE_PAYMENT_FAILED_MSG(msg),
      );
    }
  }

  /**
   * Clears `cancel_at_period_end` when Stripe still holds the subscription.
   * Fully ended subscriptions require a new checkout, not reinstate.
   */
  async reinstateCompanySubscriptionForAdmin(
    companyId: string,
    actor: BillingSubscriptionActorContext,
  ): Promise<void> {
    const stripe = this.requireStripe();
    const row = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { stripeSubscriptionId: true },
    });
    if (!row?.stripeSubscriptionId) {
      throw new BadRequestException(
        FINANCE_BILLING_NO_SUBSCRIPTION_ON_FILE_MSG,
      );
    }
    const sub = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
    if (sub.status === 'canceled') {
      throw new BadRequestException(
        FINANCE_BILLING_SUBSCRIPTION_FULLY_CANCELED_MSG,
      );
    }
    if (!sub.cancel_at_period_end) {
      return;
    }
    try {
      await stripe.subscriptions.update(row.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `reinstateCompanySubscriptionForAdmin failed for ${companyId}: ${msg}`,
      );
      throw new BadRequestException(msg);
    }
    await this.recordBillingSubscriptionAction({
      companyId,
      action: 'reinstate',
      actor,
    });
  }

  // --- Super Admin billing plan upgrade ---

  private static readonly UPGRADE_ELIGIBLE_STATUSES = new Set([
    'active',
    'trialing',
    'past_due',
  ]);

  private billingUpgradePlanSelect = {
    id: true,
    planTypeId: true,
    customerType: true,
    employeeRangeMin: true,
    employeeRangeMax: true,
    price: true,
    stripePriceId: true,
    isCustomPricing: true,
    planType: { select: { id: true, name: true } },
  } as const;

  /** Loads the company row for billing upgrade operations. */
  private async loadBillingUpgradeCompany(companyId: string) {
    return this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: {
        id: true,
        legalName: true,
        dbaName: true,
        corporationId: true,
        planId: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        plan: { select: this.billingUpgradePlanSelect },
        planSeat: { select: { invoiceAmount: true, planPrice: true } },
      },
    });
  }

  /** Requires the company row for billing upgrade operations. */
  private async requireBillingUpgradeCompany(companyId: string): Promise<
    NonNullable<
      Awaited<ReturnType<StripeService['loadBillingUpgradeCompany']>>
    > & {
      plan: BillingUpgradePlanPick;
    }
  > {
    const company = await this.loadBillingUpgradeCompany(companyId);
    if (!company) {
      throw new NotFoundException(FINANCE_BILLING_RECORD_NOT_FOUND_MSG);
    }
    if (!company.plan) {
      throw new BadRequestException(
        FINANCE_BILLING_UPGRADE_NO_CURRENT_PLAN_MSG,
      );
    }
    return { ...company, plan: company.plan };
  }

  /** Asserts the company is eligible for an upgrade. */
  private assertCompanyEligibleForUpgrade(company: {
    subscriptionStatus: string | null;
    plan: BillingUpgradePlanPick;
  }): void {
    if (!isEligibleUpgradeSourcePlan(company.plan)) {
      throw new BadRequestException(FINANCE_BILLING_UPGRADE_NOT_ELIGIBLE_MSG);
    }
    if (company.plan.isCustomPricing) {
      throw new BadRequestException(FINANCE_BILLING_UPGRADE_CUSTOM_TIER_MSG);
    }
    if (
      !isOneTimePlanType(company.plan.planTypeId) &&
      planLevelRank(company.plan) == null
    ) {
      throw new BadRequestException(FINANCE_BILLING_UPGRADE_CUSTOM_TIER_MSG);
    }

    const isOneTime = isOneTimePlanType(company.plan.planTypeId);
    if (isOneTime) {
      return;
    }

    const status = company.subscriptionStatus?.trim().toLowerCase() ?? '';
    if (!StripeService.UPGRADE_ELIGIBLE_STATUSES.has(status)) {
      throw new BadRequestException(
        FINANCE_BILLING_UPGRADE_INACTIVE_SUBSCRIPTION_MSG,
      );
    }
  }

  /** True when the error is a Stripe missing resource error. */
  private isStripeMissingResourceError(err: unknown): boolean {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'resource_missing'
    ) {
      return true;
    }
    return (
      err instanceof Stripe.errors.StripeInvalidRequestError &&
      err.code === 'resource_missing'
    );
  }

  /** Throws a BadRequestException for Stripe upgrade errors. */
  private throwStripeUpgradeError(err: unknown, context: string): never {
    if (err instanceof BadRequestException) {
      throw err;
    }
    const detail = err instanceof Error ? err.message : String(err);
    this.logger.warn(`${context}: ${detail}`);
    if (this.isStripeMissingResourceError(err)) {
      throw new BadRequestException(
        FINANCE_BILLING_UPGRADE_SUBSCRIPTION_NOT_FOUND_MSG,
      );
    }
    throw new BadRequestException(
      FINANCE_BILLING_UPGRADE_STRIPE_REQUEST_FAILED_MSG(detail),
    );
  }

  /** Retrieves the upgrade Stripe subscription. */
  private async retrieveUpgradeStripeSubscription(
    stripe: Stripe,
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });
      if (sub.status === 'canceled') {
        throw new BadRequestException(
          FINANCE_BILLING_UPGRADE_SUBSCRIPTION_CANCELED_MSG,
        );
      }
      if (
        sub.status === 'incomplete' ||
        sub.status === 'incomplete_expired' ||
        sub.status === 'unpaid'
      ) {
        throw new BadRequestException(
          FINANCE_BILLING_UPGRADE_SUBSCRIPTION_INACTIVE_MSG,
        );
      }
      return sub;
    } catch (err) {
      this.throwStripeUpgradeError(
        err,
        `retrieveUpgradeStripeSubscription(${subscriptionId})`,
      );
    }
  }

  /** Sums the negative invoice line credits. */
  private sumNegativeInvoiceLineCredits(
    lines: Stripe.InvoiceLineItem[] | undefined,
  ): number {
    if (!lines?.length) {
      return 0;
    }
    return lines.reduce((total, line) => {
      const amount = line.amount ?? 0;
      return amount < 0 ? total + Math.abs(amount) : total;
    }, 0);
  }

  /** Applies the one-time upgrade credit. */
  private async applyOneTimeUpgradeCredit(
    stripe: Stripe,
    customerId: string,
    creditCents: number,
    currency: string,
  ): Promise<void> {
    if (creditCents <= 0) {
      return;
    }
    await stripe.customers.createBalanceTransaction(customerId, {
      amount: -creditCents,
      currency,
      description: 'Credit from one-time plan upgrade',
    });
  }

  /** Reverses the one-time upgrade credit. */
  private async reverseOneTimeUpgradeCredit(
    stripe: Stripe,
    customerId: string,
    creditCents: number,
    currency: string,
  ): Promise<void> {
    if (creditCents <= 0) {
      return;
    }
    try {
      await stripe.customers.createBalanceTransaction(customerId, {
        amount: creditCents,
        currency,
        description: 'Reversal: plan upgrade could not be completed',
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to reverse one-time upgrade credit for customer ${customerId}: ${detail}`,
      );
    }
  }

  /** Pays the upgrade invoice if needed. */
  private async payUpgradeInvoiceIfNeeded(
    stripe: Stripe,
    invoiceId: string,
  ): Promise<void> {
    const inv = await stripe.invoices.retrieve(invoiceId);
    if (inv.status === 'paid' || (inv.amount_due ?? 0) <= 0) {
      return;
    }
    try {
      await stripe.invoices.pay(invoiceId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(
        FINANCE_BILLING_STRIPE_PAYMENT_FAILED_MSG(msg),
      );
    }
  }

  /** Asserts the upgrade payment method when due. */
  private async assertUpgradePaymentMethodWhenDue(
    stripe: Stripe,
    customerId: string,
    amountDueCents: number,
    subscriptionId?: string | null,
  ): Promise<void> {
    if (amountDueCents <= 0) {
      return;
    }
    const paymentMethodId = await this.resolveStripeDefaultPaymentMethodId(
      stripe,
      customerId,
      subscriptionId,
    );
    if (!paymentMethodId) {
      throw new BadRequestException(
        FINANCE_BILLING_UPGRADE_NO_PAYMENT_METHOD_MSG,
      );
    }
  }

  /** Checks if the company has a generated assessment. */
  private async companyHasReportGeneratedAssessment(
    companyId: string,
  ): Promise<boolean> {
    const count = await this.prisma.assessment.count({
      where: {
        status: 'report_generated',
        user: {
          companyAccess: {
            some: { companyId },
          },
        },
      },
    });
    return count > 0;
  }

  /** Resolves the one-time credit cents. */
  private resolveOneTimeCreditCents(params: {
    plan: BillingUpgradePlanPick;
    hasReport: boolean;
  }): number {
    if (params.plan.planTypeId !== 'one_time' || params.hasReport) {
      return 0;
    }
    const dollars = Number(params.plan.price);
    if (Number.isNaN(dollars) || dollars <= 0) {
      return 0;
    }
    return Math.round(dollars * 100);
  }

  /** Converts the upgrade plan to a snapshot. */
  private toUpgradePlanSnapshot(params: {
    plan: BillingUpgradePlanPick;
    periodStart?: string | null;
    periodEnd?: string | null;
  }): BillingUpgradePlanSnapshot {
    return {
      pricingPlanId: params.plan.id,
      planTypeId: params.plan.planTypeId,
      planLabel: params.plan.planType.name,
      planLevel: planLevelLabel(params.plan),
      employeeRangeMin: params.plan.employeeRangeMin,
      employeeRangeMax: params.plan.employeeRangeMax,
      periodStart: params.periodStart ?? null,
      periodEnd: params.periodEnd ?? null,
    };
  }

  /** Loads the target pricing plan. */
  private async loadTargetPricingPlan(
    targetPricingPlanId: string,
  ): Promise<BillingUpgradePlanPick | null> {
    return this.prisma.pricingPlan.findFirst({
      where: {
        id: targetPricingPlanId,
        customerType: 'company',
        isCustomPricing: false,
      },
      select: this.billingUpgradePlanSelect,
    });
  }

  /** Loads the company upgrade target plans. */
  private async loadCompanyUpgradeTargetPlans(): Promise<
    BillingUpgradePlanPick[]
  > {
    return this.prisma.pricingPlan.findMany({
      where: { customerType: 'company', isCustomPricing: false },
      select: this.billingUpgradePlanSelect,
      orderBy: [{ planTypeId: 'asc' }, { employeeRangeMin: 'asc' }],
    });
  }

  /** Normalizes a Stripe payment method reference to a payment method ID. */
  private paymentMethodIdFromStripeRef(
    pm: Stripe.PaymentMethod | string | null | undefined,
  ): string | null {
    if (!pm) {
      return null;
    }
    if (typeof pm === 'string') {
      return pm;
    }
    return pm.id ?? null;
  }

  /** Extracts a reusable payment method ID from a Stripe invoice. */
  private paymentMethodIdFromInvoice(
    invoice: Stripe.Invoice | null | undefined,
  ): string | null {
    if (!invoice) {
      return null;
    }
    const paymentIntent = invoice.payment_intent;
    if (typeof paymentIntent === 'object' && paymentIntent) {
      const fromIntent = this.paymentMethodIdFromStripeRef(
        paymentIntent.payment_method,
      );
      if (fromIntent) {
        return fromIntent;
      }
    }
    const charge = invoice.charge;
    if (typeof charge === 'object' && charge) {
      return this.paymentMethodIdFromStripeRef(charge.payment_method);
    }
    return null;
  }

  /** Resolves subscription ID from DB or Stripe when missing on the company row. */
  private async resolveCompanyStripeSubscriptionIdForUpgrade(
    stripe: Stripe,
    company: {
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      plan: { planTypeId: string };
    },
  ): Promise<string | null> {
    if (isOneTimePlanType(company.plan.planTypeId)) {
      return null;
    }
    if (company.stripeSubscriptionId) {
      return company.stripeSubscriptionId;
    }
    if (!company.stripeCustomerId) {
      return null;
    }
    try {
      const subs = await stripe.subscriptions.list({
        customer: company.stripeCustomerId,
        status: 'all',
        limit: 1,
      });
      return subs.data[0]?.id ?? null;
    } catch (err) {
      this.throwStripeUpgradeError(
        err,
        `resolveCompanyStripeSubscriptionIdForUpgrade(${company.stripeCustomerId})`,
      );
    }
  }

  /** Resolves a subscription default payment method, including Stripe list fallback. */
  private async resolveSubscriptionDefaultPaymentMethodId(
    stripe: Stripe,
    customerId: string,
    preferredSubscriptionId?: string | null,
  ): Promise<string | null> {
    if (preferredSubscriptionId) {
      const preferred = await stripe.subscriptions.retrieve(
        preferredSubscriptionId,
        { expand: ['default_payment_method'] },
      );
      const preferredPm = this.paymentMethodIdFromStripeRef(
        preferred.default_payment_method,
      );
      if (preferredPm) {
        return preferredPm;
      }
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
      expand: ['data.default_payment_method'],
    });
    for (const subscription of subscriptions.data) {
      const subscriptionPm = this.paymentMethodIdFromStripeRef(
        subscription.default_payment_method,
      );
      if (subscriptionPm) {
        return subscriptionPm;
      }
    }
    return null;
  }

  /** Resolves a payment method from recent customer invoices. */
  private async resolveInvoicePaymentMethodId(
    stripe: Stripe,
    customerId: string,
  ): Promise<string | null> {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 5,
      expand: ['data.payment_intent', 'data.charge'],
    });
    for (const invoice of invoices.data) {
      const invoicePm = this.paymentMethodIdFromInvoice(invoice);
      if (invoicePm) {
        return invoicePm;
      }
    }
    return null;
  }

  /**
   * Resolves a chargeable payment method for billing upgrades:
   * customer invoice default, subscription default(s), attached methods,
   * then recent invoice payment methods.
   */
  private async resolveStripeDefaultPaymentMethodId(
    stripe: Stripe,
    customerId: string,
    subscriptionId?: string | null,
  ): Promise<string | null> {
    try {
      const customer = await stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      });
      if (customer.deleted) {
        return null;
      }

      const invoiceDefaultPm = this.paymentMethodIdFromStripeRef(
        customer.invoice_settings?.default_payment_method,
      );
      if (invoiceDefaultPm) {
        return invoiceDefaultPm;
      }

      const subscriptionDefaultPm =
        await this.resolveSubscriptionDefaultPaymentMethodId(
          stripe,
          customerId,
          subscriptionId,
        );
      if (subscriptionDefaultPm) {
        return subscriptionDefaultPm;
      }

      const attached = await stripe.paymentMethods.list({
        customer: customerId,
        limit: 1,
      });
      const attachedPm = attached.data[0]?.id ?? null;
      if (attachedPm) {
        return attachedPm;
      }

      return this.resolveInvoicePaymentMethodId(stripe, customerId);
    } catch (err) {
      this.throwStripeUpgradeError(
        err,
        `resolveStripeDefaultPaymentMethodId(${customerId})`,
      );
    }
  }

  /** Formats the money from minor units. */
  private formatMoneyFromMinor(cents: number, currency: string): string {
    const amount = cents / 100;
    const code = currency.toUpperCase();
    if (code === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    return `${amount.toFixed(2)} ${code}`;
  }

  /** Gets the billing upgrade options for the admin. */
  async getBillingUpgradeOptionsForAdmin(
    companyId: string,
  ): Promise<BillingUpgradeOptionsResult> {
    const company = await this.requireBillingUpgradeCompany(companyId);
    this.assertCompanyEligibleForUpgrade(company);

    const billingRow = await this.getBillingRecordForAdmin(companyId);
    const hasReport = await this.companyHasReportGeneratedAssessment(companyId);
    const creditCents = this.resolveOneTimeCreditCents({
      plan: company.plan,
      hasReport,
    });

    const allPlans = await this.loadCompanyUpgradeTargetPlans();
    const allowed = filterAllowedUpgradeTargets(company.plan, allPlans);

    return {
      current: this.toUpgradePlanSnapshot({
        plan: company.plan,
        periodStart: billingRow?.currentPeriodStart ?? null,
        periodEnd: billingRow?.currentPeriodEnd ?? null,
      }),
      allowedTargets: allowed.map((plan) => ({
        pricingPlanId: plan.id,
        planTypeId: plan.planTypeId,
        planLabel: plan.planType.name,
        planLevel: planLevelLabel(plan),
        employeeRangeMin: plan.employeeRangeMin,
        employeeRangeMax: plan.employeeRangeMax,
        price: Number(plan.price),
      })),
      oneTimeCreditEligible: creditCents > 0,
      oneTimePaymentCents: creditCents > 0 ? creditCents : null,
    };
  }

  /** Previews the billing upgrade for the admin. */
  async previewBillingUpgradeForAdmin(
    companyId: string,
    targetPricingPlanId: string,
  ): Promise<BillingUpgradePreviewResult> {
    const company = await this.requireBillingUpgradeCompany(companyId);
    this.assertCompanyEligibleForUpgrade(company);

    const target = await this.loadTargetPricingPlan(targetPricingPlanId);
    const validated = validateBillingUpgrade({
      current: company.plan,
      target,
    });

    const billingRow = await this.getBillingRecordForAdmin(companyId);
    const hasReport = await this.companyHasReportGeneratedAssessment(companyId);
    const creditCents = this.resolveOneTimeCreditCents({
      plan: company.plan,
      hasReport,
    });

    const stripe = this.requireStripe();
    const quantity = checkoutQuantityFromPlan(validated.target);
    let amountDueCents = 0;
    let prorationCreditCents = 0;
    let currency = 'usd';
    let renewalDate: string | null = null;

    if (
      !isOneTimePlanType(company.plan.planTypeId) &&
      company.stripeSubscriptionId &&
      company.stripeCustomerId
    ) {
      const sub = await this.retrieveUpgradeStripeSubscription(
        stripe,
        company.stripeSubscriptionId,
      );
      const itemId = sub.items.data[0]?.id;
      if (!itemId) {
        throw new BadRequestException(FINANCE_BILLING_UPGRADE_NOT_ELIGIBLE_MSG);
      }
      let preview: Stripe.Invoice;
      try {
        preview = await stripe.invoices.createPreview({
          customer: company.stripeCustomerId,
          subscription: company.stripeSubscriptionId,
          subscription_details: {
            items: [
              {
                id: itemId,
                price: validated.target.stripePriceId!,
                quantity,
              },
            ],
            proration_behavior: 'always_invoice',
            billing_cycle_anchor: 'now',
          },
        });
      } catch (err) {
        this.throwStripeUpgradeError(
          err,
          `previewBillingUpgradeForAdmin(${companyId})`,
        );
      }
      amountDueCents = Math.max(0, preview.amount_due ?? 0);
      currency = preview.currency ?? sub.currency ?? 'usd';
      prorationCreditCents = this.sumNegativeInvoiceLineCredits(
        preview.lines?.data,
      );
      if (validated.target.planTypeId === 'monthly') {
        renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
      } else {
        renewalDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
      }
      if (creditCents > 0) {
        amountDueCents = Math.max(0, amountDueCents - creditCents);
      }
    } else {
      if (!company.stripeCustomerId) {
        throw new BadRequestException(
          FINANCE_BILLING_UPGRADE_NO_STRIPE_CUSTOMER_MSG,
        );
      }
      let preview: Stripe.Invoice;
      try {
        preview = await stripe.invoices.createPreview({
          customer: company.stripeCustomerId,
          subscription_details: {
            items: [
              {
                price: validated.target.stripePriceId!,
                quantity,
              },
            ],
          },
        });
      } catch (err) {
        this.throwStripeUpgradeError(
          err,
          `previewBillingUpgradeForAdmin(${companyId}, new-subscription)`,
        );
      }
      amountDueCents = Math.max(0, preview.amount_due ?? preview.total ?? 0);
      currency = preview.currency ?? 'usd';
      amountDueCents = Math.max(0, amountDueCents - creditCents);
      const targetInterval =
        validated.target.planTypeId === 'monthly' ? 30 : 365;
      renewalDate = new Date(Date.now() + targetInterval * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
    }

    const nextBillingAmountCents =
      await this.resolveUpgradeNextBillingAmountCents(
        validated.target,
        quantity,
      );

    return {
      current: this.toUpgradePlanSnapshot({
        plan: validated.current,
        periodStart: billingRow?.currentPeriodStart ?? null,
        periodEnd: billingRow?.currentPeriodEnd ?? null,
      }),
      target: this.toUpgradePlanSnapshot({ plan: validated.target }),
      creditCents,
      prorationCreditCents,
      amountDueCents,
      currency,
      renewalDate,
      nextBillingAmountCents,
    };
  }

  /** Applies the billing upgrade for the admin. */
  async applyBillingUpgradeForAdmin(
    companyId: string,
    targetPricingPlanId: string,
    actor: BillingSubscriptionActorContext,
  ): Promise<BillingUpgradeApplyResult> {
    const preview = await this.previewBillingUpgradeForAdmin(
      companyId,
      targetPricingPlanId,
    );
    const company = await this.requireBillingUpgradeCompany(companyId);
    this.assertCompanyEligibleForUpgrade(company);

    const target = await this.loadTargetPricingPlan(targetPricingPlanId);
    const validated = validateBillingUpgrade({
      current: company.plan,
      target,
    });

    const stripe = this.requireStripe();
    if (!company.stripeCustomerId) {
      throw new BadRequestException(
        FINANCE_BILLING_UPGRADE_NO_STRIPE_CUSTOMER_MSG,
      );
    }

    const quantity = checkoutQuantityFromPlan(validated.target);
    let subscriptionId =
      await this.resolveCompanyStripeSubscriptionIdForUpgrade(stripe, company);

    await this.assertUpgradePaymentMethodWhenDue(
      stripe,
      company.stripeCustomerId,
      preview.amountDueCents,
      subscriptionId,
    );
    let renewalDate = preview.renewalDate;
    let creditApplied = false;

    try {
      if (preview.creditCents > 0) {
        await this.applyOneTimeUpgradeCredit(
          stripe,
          company.stripeCustomerId,
          preview.creditCents,
          preview.currency,
        );
        creditApplied = true;
      }

      if (subscriptionId) {
        const sub = await this.retrieveUpgradeStripeSubscription(
          stripe,
          subscriptionId,
        );
        const itemId = sub.items.data[0]?.id;
        if (!itemId) {
          throw new BadRequestException(
            FINANCE_BILLING_UPGRADE_NOT_ELIGIBLE_MSG,
          );
        }
        let updated: Stripe.Subscription;
        try {
          updated = await stripe.subscriptions.update(subscriptionId, {
            items: [
              {
                id: itemId,
                price: validated.target.stripePriceId!,
                quantity,
              },
            ],
            proration_behavior: 'always_invoice',
            billing_cycle_anchor: 'now',
            cancel_at_period_end: false,
            metadata: {
              companyId: company.id,
              pricingPlanId: validated.target.id,
            },
          });
        } catch (err) {
          this.throwStripeUpgradeError(
            err,
            `applyBillingUpgradeForAdmin(${companyId}, update-subscription)`,
          );
        }
        subscriptionId = updated.id;
        if (updated.current_period_end) {
          renewalDate = new Date(updated.current_period_end * 1000)
            .toISOString()
            .slice(0, 10);
        }
        const latestInvoiceId =
          typeof updated.latest_invoice === 'string'
            ? updated.latest_invoice
            : updated.latest_invoice?.id;
        if (latestInvoiceId) {
          await this.payUpgradeInvoiceIfNeeded(stripe, latestInvoiceId);
        }
      } else {
        const paymentMethodId = await this.resolveStripeDefaultPaymentMethodId(
          stripe,
          company.stripeCustomerId,
          subscriptionId,
        );
        if (!paymentMethodId) {
          throw new BadRequestException(
            FINANCE_BILLING_UPGRADE_NO_PAYMENT_METHOD_MSG,
          );
        }
        let created: Stripe.Subscription;
        try {
          created = await stripe.subscriptions.create({
            customer: company.stripeCustomerId,
            items: [
              {
                price: validated.target.stripePriceId!,
                quantity,
              },
            ],
            default_payment_method: paymentMethodId,
            metadata: {
              companyId: company.id,
              pricingPlanId: validated.target.id,
            },
          });
        } catch (err) {
          this.throwStripeUpgradeError(
            err,
            `applyBillingUpgradeForAdmin(${companyId}, create-subscription)`,
          );
        }
        subscriptionId = created.id;
        if (created.current_period_end) {
          renewalDate = new Date(created.current_period_end * 1000)
            .toISOString()
            .slice(0, 10);
        }
        const latestInvoiceId =
          typeof created.latest_invoice === 'string'
            ? created.latest_invoice
            : created.latest_invoice?.id;
        if (latestInvoiceId) {
          await this.payUpgradeInvoiceIfNeeded(stripe, latestInvoiceId);
        }
      }
    } catch (err) {
      if (creditApplied) {
        await this.reverseOneTimeUpgradeCredit(
          stripe,
          company.stripeCustomerId,
          preview.creditCents,
          preview.currency,
        );
      }
      throw err;
    }

    await this.prisma.corporationCompany.update({
      where: { id: companyId },
      data: {
        planId: validated.target.id,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'active',
      },
    });

    if (company.planSeat) {
      await this.prisma.companyPlanSeat.update({
        where: { companyId },
        data: {
          planPrice: new Prisma.Decimal(validated.target.price.toString()),
          invoiceAmount: new Prisma.Decimal(validated.target.price.toString()),
        },
      });
    }

    await this.recordBillingPlanUpgradeAction({
      companyId,
      actor,
      previousPlan: validated.current,
      newPlan: validated.target,
      previousPlanLevel: validated.currentPlanLevel,
      newPlanLevel: validated.targetPlanLevel,
      amountCents: preview.nextBillingAmountCents,
      adjustmentAmountCents: preview.amountDueCents,
      currency: preview.currency,
    });

    await this.sendPlanUpgradeNotificationEmail({
      company,
      preview,
      validated,
    });

    return {
      ok: true,
      pricingPlanId: validated.target.id,
      amountDueCents: preview.amountDueCents,
      currency: preview.currency,
      renewalDate,
    };
  }

  /**
   * Records the billing plan upgrade action
   */
  private async recordBillingPlanUpgradeAction(params: {
    companyId: string;
    actor: BillingSubscriptionActorContext;
    previousPlan: BillingUpgradePlanPick;
    newPlan: BillingUpgradePlanPick;
    previousPlanLevel: string;
    newPlanLevel: string;
    amountCents: number | null;
    adjustmentAmountCents: number;
    currency: string;
  }): Promise<void> {
    await this.prisma.billingSubscriptionAction.create({
      data: {
        companyId: params.companyId,
        action: 'plan_upgrade',
        actorKind: params.actor.actorKind,
        actorCognitoSub: params.actor.actorCognitoSub,
        actorName: params.actor.actorName,
        actorRole: params.actor.actorRole,
        planLabel: params.newPlan.planType.name,
        planTypeId: params.newPlan.planTypeId,
        amountCents: params.amountCents,
        currency: params.currency,
        previousPricingPlanId: params.previousPlan.id,
        newPricingPlanId: params.newPlan.id,
        previousPlanLevel: params.previousPlanLevel,
        newPlanLevel: params.newPlanLevel,
        adjustmentAmountCents: params.adjustmentAmountCents,
      },
    });
  }

  /**
   * Sends email notification for plan upgrade
   */
  private async sendPlanUpgradeNotificationEmail(params: {
    company: {
      id: string;
      legalName: string;
      dbaName: string | null;
    };
    preview: BillingUpgradePreviewResult;
    validated: {
      current: BillingUpgradePlanPick;
      target: BillingUpgradePlanPick;
      currentPlanLevel: string;
      targetPlanLevel: string;
    };
  }): Promise<void> {
    const fullCompany = await this.prisma.corporationCompany.findFirst({
      where: { id: params.company.id },
      select: {
        id: true,
        corporationId: true,
        appKeyContacts: {
          where: { contactType: FINANCE_BILLING_CONTACT_TYPE },
          select: { email: true },
          take: 1,
        },
        corporation: {
          select: {
            legalName: true,
            dbaName: true,
          },
        },
      },
    });
    if (!fullCompany) {
      this.logger.warn(
        `Plan upgrade email skipped: company not found (${params.company.id})`,
      );
      return;
    }

    const companyName = (
      params.company.dbaName?.trim() || params.company.legalName
    ).trim();
    const corporationName = (
      fullCompany.corporation?.dbaName?.trim() ||
      fullCompany.corporation?.legalName ||
      ''
    ).trim();
    const effectiveDate = formatDateShort(new Date());
    const supportEmail =
      this.config.get<string>('SUPPORT_CONTACT_EMAIL')?.trim() ||
      'support@bspblueprint.com';
    const sharedTemplateParams = {
      companyName,
      previousPlanLabel: params.validated.current.planType.name,
      previousPlanLevel: params.validated.currentPlanLevel,
      newPlanLabel: params.validated.target.planType.name,
      newPlanLevel: params.validated.targetPlanLevel,
      effectiveDate,
      supportEmail,
    };

    const billingEmail = await this.resolveBillingRecipientEmailForCompany({
      id: fullCompany.id,
      appKeyContacts: fullCompany.appKeyContacts,
    });
    const companyAdminAccess = await this.prisma.userCompanyAccess.findFirst({
      where: {
        companyId: fullCompany.id,
        isAdmin: true,
        user: { deletedAt: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    const companyAdminName =
      `${companyAdminAccess?.user?.firstName ?? ''} ${companyAdminAccess?.user?.lastName ?? ''}`.trim();

    if (billingEmail) {
      const ok = await this.emailService.sendEmail({
        to: billingEmail,
        subject: FINANCE_BILLING_UPGRADE_COMPANY_ADMIN_EMAIL_SUBJECT,
        htmlBody: getPlanUpgradeCompanyAdminEmailHtml({
          ...sharedTemplateParams,
          companyAdminName,
          amountChargedFormatted: this.formatMoneyFromMinor(
            params.preview.amountDueCents,
            params.preview.currency,
          ),
        }),
        textBody: getPlanUpgradeCompanyAdminEmailText({
          ...sharedTemplateParams,
          companyAdminName,
          amountChargedFormatted: this.formatMoneyFromMinor(
            params.preview.amountDueCents,
            params.preview.currency,
          ),
        }),
      });
      if (!ok) {
        this.logger.warn(
          `Plan upgrade company admin email failed to send for company ${params.company.id}`,
        );
      }
    } else {
      this.logger.warn(
        `Plan upgrade company admin email skipped: no billing recipient for company ${params.company.id}`,
      );
    }

    if (!fullCompany.corporationId || !corporationName) {
      return;
    }

    const corpAdmin = await this.prisma.appUser.findFirst({
      where: {
        corporationId: fullCompany.corporationId,
        deletedAt: null,
        userType: {
          contains: CORPORATION_ADMIN_APP_USER_TYPE,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    const corpAdminEmail = corpAdmin?.email?.trim().toLowerCase();
    if (!corpAdminEmail) {
      this.logger.warn(
        `Plan upgrade corporation admin email skipped: no corporation admin email (companyId=${params.company.id})`,
      );
      return;
    }

    const corporationAdminName =
      `${corpAdmin?.firstName ?? ''} ${corpAdmin?.lastName ?? ''}`.trim();
    const corpOk = await this.emailService.sendEmail({
      to: corpAdminEmail,
      subject: FINANCE_BILLING_UPGRADE_CORPORATION_ADMIN_EMAIL_SUBJECT,
      htmlBody: getPlanUpgradeCorporationAdminEmailHtml({
        ...sharedTemplateParams,
        corporationAdminName,
        corporationName,
      }),
      textBody: getPlanUpgradeCorporationAdminEmailText({
        ...sharedTemplateParams,
        corporationAdminName,
        corporationName,
      }),
    });
    if (!corpOk) {
      this.logger.warn(
        `Plan upgrade corporation admin email failed to send for company ${params.company.id}`,
      );
    }
  }

  /**
   * Best-effort cleanup after failed DB write. Promotion codes are not deletable;
   * we deactivate the code then delete the coupon.
   */
  async deleteCouponAndPromotionCode(
    couponId: string,
    promotionCodeId: string,
  ): Promise<void> {
    const stripe = this.requireStripe();
    try {
      await stripe.promotionCodes.update(promotionCodeId, { active: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Failed to deactivate Stripe promotion code ${promotionCodeId}: ${msg}`,
      );
    }
    try {
      await stripe.coupons.del(couponId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Failed to delete Stripe coupon ${couponId}: ${msg}`);
    }
  }
}
