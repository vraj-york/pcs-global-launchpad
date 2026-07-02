import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  COMPANY_ID_REQUIRED_MSG,
  NO_COMPANY_ACCESS_FOUND_MESSAGE,
  NO_ACCESS_TO_COMPANY_MESSAGE,
  COMPANY_NOT_FOUND_MESSAGE,
  NO_SUBSCRIPTION_PLAN_ASSIGNED_TO_COMPANY_MESSAGE,
  ONSITE_TRAINING_OPTION_LOCKED_FOR_COMPANY_MSG,
} from '../company/constants/company.messages';
import { decimalToString, formatEmployeeRange, formatUsDate } from '../common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { normalizeOptionalPromoCodeInput } from '../promo/promo-code-input.util';
import {
  computePromoDiscountAmountFromPlanPrice,
  minorUnitsToMajorUnits,
} from '../promo/promo-money.util';
import { CancelBillingSubscriptionDto } from '../stripe/dto/cancel-billing-subscription.dto';
import { ListBillingHistoryQueryDto } from '../stripe/dto/list-billing-history-query.dto';
import { ApiResponse } from '../common';
import { StripeService } from '../stripe';
import { FINANCE_BILLING_RECORD_NOT_FOUND_MSG } from '../stripe/stripe.constants';
import { SupportRequestService } from '../support-request';
import type { BillingAdminListItem } from '../stripe/stripe-billing-admin.types';
import type { BillingHistoryListResult } from '../stripe/stripe-billing-history.types';
import {
  type CompanyWithRelations,
  ONSITE_TRAINING_OPTIONS,
  OnsiteTrainingOption,
  type PromoDiscountLookup,
} from './company-admin-portal.types';
import {
  MAX_ONE_TIME_ASSESSMENT_QUANTITY,
  MIN_ONE_TIME_ASSESSMENT_QUANTITY,
  ONE_TIME_ASSESSMENT_QUANTITY_INVALID_MSG,
  ONE_TIME_ASSESSMENT_QUANTITY_REQUIRED_MSG,
} from './constants/assessment-quantity.constants';

/** Returns normalized promo for Stripe, or `undefined` if blank or invalid (no throw). */
function tryNormalizePromoCodeForCheckout(
  raw: string | null | undefined,
): string | undefined {
  if (raw == null || typeof raw !== 'string') {
    return undefined;
  }
  try {
    return normalizeOptionalPromoCodeInput(raw);
  } catch {
    return undefined;
  }
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
const ONSITE_TRAINING_OPTIONS_LIST = [...ONSITE_TRAINING_OPTIONS].join(', ');

function resolveSeatDiscount(
  seat: {
    planPrice: { toString(): string };
    discount: { toString(): string };
    checkoutPromoCode: string | null;
  },
  promoLookup?: PromoDiscountLookup,
): Prisma.Decimal {
  const promoCode = seat.checkoutPromoCode?.trim();
  if (promoCode && promoLookup?.size) {
    const promo = promoLookup.get(promoCode.toLowerCase());
    if (promo) {
      return computePromoDiscountAmountFromPlanPrice(
        new Prisma.Decimal(seat.planPrice.toString()),
        promo,
      );
    }
  }
  return new Prisma.Decimal(seat.discount.toString());
}

@Injectable()
export class CompanyAdminPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly supportRequestService: SupportRequestService,
  ) {}

  /** Maps a company to an item. */
  mapCompanyToItem(
    company: CompanyWithRelations,
    promoLookup?: PromoDiscountLookup,
  ) {
    const corp = company.corporation;
    const subStatus = company.subscriptionStatus?.toLowerCase() ?? null;
    const hasActiveSubscription =
      subStatus != null && ACTIVE_SUBSCRIPTION_STATUSES.has(subStatus);

    const addressParts = [
      company.addressLine,
      [company.city, company.state, company.zip].filter(Boolean).join(', '),
      company.country,
    ].filter(Boolean);

    const plan = company.plan;
    const seat = company.planSeat;

    const isAnnualPlan = plan?.planTypeId === 'annual';
    const isOneTimePlan = plan?.planTypeId === 'one_time';
    const omitTrialSection = isAnnualPlan || isOneTimePlan;

    const planSummary =
      plan != null
        ? {
            pricingPlanId: plan.id,
            planTypeId: plan.planTypeId,
            planTypeName: plan.planType.name,
            stripePriceConfigured: Boolean(plan.stripePriceId?.trim()),
            customerType: plan.customerType,
            employeeRangeLabel: formatEmployeeRange(
              plan.employeeRangeMin,
              plan.employeeRangeMax,
            ),
            listPrice: decimalToString(plan.price),
            trial:
              omitTrialSection || !seat
                ? null
                : {
                    zeroTrial: seat.zeroTrial,
                    trialLengthDays: seat.trialLengthDuration,
                    trialStartDate: formatUsDate(seat.trialStartDate),
                    trialEndDate: formatUsDate(seat.trialEndDate),
                    autoConvertTrial: seat.autoConvertTrial,
                  },
            pricing: seat
              ? isOneTimePlan
                ? (() => {
                    const planP = new Prisma.Decimal(seat.planPrice.toString());
                    const promoCode = seat.checkoutPromoCode?.trim();
                    const promo =
                      promoCode && promoLookup?.size
                        ? promoLookup.get(promoCode.toLowerCase())
                        : undefined;

                    const computeDiscountOnSubtotal = (
                      subtotal: Prisma.Decimal,
                    ): Prisma.Decimal => {
                      if (promo) {
                        return computePromoDiscountAmountFromPlanPrice(
                          subtotal,
                          promo,
                        );
                      }
                      const seatDisc = new Prisma.Decimal(
                        seat.discount.toString(),
                      );
                      if (seatDisc.lessThanOrEqualTo(0)) {
                        return new Prisma.Decimal(0);
                      }
                      return Prisma.Decimal.min(subtotal, seatDisc);
                    };

                    let promoDiscountType: 'percent' | 'fixed_amount' | null =
                      null;
                    let promoDiscountValue: string | null = null;
                    if (promo) {
                      promoDiscountType = promo.discountType;
                      promoDiscountValue =
                        promo.discountType === 'percent'
                          ? String(promo.percentOff ?? 0)
                          : String(
                              minorUnitsToMajorUnits(
                                promo.amountOffMinor,
                                promo.currency,
                              ),
                            );
                    } else if (
                      new Prisma.Decimal(seat.discount.toString()).greaterThan(
                        0,
                      )
                    ) {
                      promoDiscountType = 'fixed_amount';
                      promoDiscountValue = decimalToString(seat.discount);
                    }

                    const subtotalOne = planP;
                    const discountOne = computeDiscountOnSubtotal(subtotalOne);
                    const invoiceOne = subtotalOne.minus(discountOne);
                    const invoiceDec = invoiceOne.lessThan(0)
                      ? new Prisma.Decimal(0)
                      : invoiceOne;

                    return {
                      planPrice: decimalToString(planP),
                      discount: decimalToString(discountOne),
                      pricePerAssessment: decimalToString(planP),
                      promoDiscountType,
                      promoDiscountValue,
                      onsiteTrainingOption: 'off',
                      invoiceAmount: decimalToString(invoiceDec),
                      billingCurrency: seat.billingCurrency,
                      promoCode: promoCode ? promoCode : null,
                      minAssessmentQuantity: MIN_ONE_TIME_ASSESSMENT_QUANTITY,
                    };
                  })()
                : (() => {
                    const disc = resolveSeatDiscount(seat, promoLookup);
                    const planP = new Prisma.Decimal(seat.planPrice.toString());
                    const net = planP.minus(disc);
                    const invoiceDec = net.lessThan(0)
                      ? new Prisma.Decimal(0)
                      : net;
                    return {
                      planPrice: decimalToString(seat.planPrice),
                      discount: decimalToString(disc),
                      onsiteTrainingOption: seat.onsiteTrainingOption,
                      invoiceAmount: decimalToString(invoiceDec),
                      billingCurrency: seat.billingCurrency,
                      promoCode: seat.checkoutPromoCode?.trim()
                        ? seat.checkoutPromoCode.trim()
                        : null,
                    };
                  })()
              : {
                  planPrice: decimalToString(plan.price),
                  discount: '0',
                  onsiteTrainingOption: 'off',
                  invoiceAmount: decimalToString(plan.price),
                  billingCurrency: 'USD ($)',
                  promoCode: null as string | null,
                },
          }
        : null;

    const canCheckout =
      !hasActiveSubscription &&
      company.planId != null &&
      plan != null &&
      Boolean(plan.stripePriceId?.trim());

    return {
      companyId: company.id,
      corporationId: company.corporationId,
      hasActiveSubscription,
      subscriptionStatus: company.subscriptionStatus,
      corporation: {
        legalName: corp.legalName,
        ownershipType: corp.ownershipType,
        dataResidencyRegion: corp.dataResidencyRegion,
      },
      company: {
        legalName: company.legalName,
        dbaName: company.dbaName,
        website: company.website,
        companyType: company.companyType,
        officeType: company.officeType,
        industry: company.industry,
        phoneNo: company.phoneNo,
        addressFormatted: addressParts.join(', '),
      },
      planSummary,
      canCheckout,
    };
  }

  async getOnboardingReview(cognitoSub: string) {
    const accesses = await this.prisma.userCompanyAccess.findMany({
      where: { userId: cognitoSub },
      orderBy: { createdAt: 'asc' },
      select: {
        company: {
          select: {
            id: true,
            corporationId: true,
            subscriptionStatus: true,
            addressLine: true,
            city: true,
            state: true,
            zip: true,
            country: true,
            legalName: true,
            dbaName: true,
            website: true,
            companyType: true,
            officeType: true,
            industry: true,
            phoneNo: true,
            planId: true,
            corporation: {
              select: {
                legalName: true,
                ownershipType: true,
                dataResidencyRegion: true,
              },
            },
            plan: {
              select: {
                id: true,
                planTypeId: true,
                stripePriceId: true,
                customerType: true,
                employeeRangeMin: true,
                employeeRangeMax: true,
                price: true,
                planType: { select: { name: true } },
              },
            },
            planSeat: {
              select: {
                zeroTrial: true,
                trialLengthDuration: true,
                trialStartDate: true,
                trialEndDate: true,
                autoConvertTrial: true,
                planPrice: true,
                discount: true,
                onsiteTrainingOption: true,
                invoiceAmount: true,
                billingCurrency: true,
                checkoutPromoCode: true,
              },
            },
          },
        },
      },
    });

    if (accesses.length === 0) {
      throw new NotFoundException(NO_COMPANY_ACCESS_FOUND_MESSAGE);
    }

    const promoCodes = [
      ...new Set(
        accesses
          .map((a) => a.company.planSeat?.checkoutPromoCode?.trim())
          .filter((code): code is string => Boolean(code)),
      ),
    ];

    const promoLookup: PromoDiscountLookup = new Map();
    if (promoCodes.length > 0) {
      const promos = await this.prisma.promoCode.findMany({
        where: {
          deletedAt: null,
          stripePromotionActive: true,
          code: { in: promoCodes },
        },
        select: {
          code: true,
          discountType: true,
          percentOff: true,
          amountOffMinor: true,
          currency: true,
        },
      });
      for (const promo of promos) {
        promoLookup.set(promo.code.toLowerCase(), promo);
      }
    }

    const companies = accesses.map((a) =>
      this.mapCompanyToItem(a.company, promoLookup),
    );

    return { companies };
  }

  async createCheckoutSessionForUser(
    cognitoSub: string,
    companyId?: string,
    requestedOnsiteTrainingOption?: string,
    requestedAssessmentQuantity?: number,
  ) {
    const accesses = await this.prisma.userCompanyAccess.findMany({
      where: { userId: cognitoSub },
      select: { companyId: true },
    });
    const allowedIds = new Set(accesses.map((a) => a.companyId));

    if (allowedIds.size === 0) {
      throw new NotFoundException(NO_COMPANY_ACCESS_FOUND_MESSAGE);
    }

    let targetId = companyId?.trim();
    if (!targetId) {
      if (allowedIds.size !== 1) {
        throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
      }
      targetId = [...allowedIds][0];
    } else if (!allowedIds.has(targetId)) {
      throw new ForbiddenException(NO_ACCESS_TO_COMPANY_MESSAGE);
    }

    const access = await this.prisma.userCompanyAccess.findFirst({
      where: { userId: cognitoSub, companyId: targetId },
      select: {
        company: {
          select: {
            id: true,
            corporationId: true,
            planId: true,
            plan: { select: { id: true, planTypeId: true } },
            planSeat: {
              select: {
                checkoutPromoCode: true,
                onsiteTrainingOption: true,
              },
            },
          },
        },
      },
    });

    if (!access?.company) {
      throw new NotFoundException(COMPANY_NOT_FOUND_MESSAGE);
    }

    const { company } = access;
    if (!company.planId || !company.plan) {
      throw new BadRequestException(
        NO_SUBSCRIPTION_PLAN_ASSIGNED_TO_COMPANY_MESSAGE,
      );
    }

    /** Only the code saved during Super Admin Plan & Seats (step 3); no URL/body override or auto “best” promo. */
    const fromSeat = tryNormalizePromoCodeForCheckout(
      company.planSeat?.checkoutPromoCode,
    );
    const storedOnsiteTrainingOption = (company.planSeat
      ?.onsiteTrainingOption ?? 'off') as OnsiteTrainingOption;
    const requestedNormalized = requestedOnsiteTrainingOption?.trim();
    const requestedIsValid =
      requestedNormalized == null ||
      ONSITE_TRAINING_OPTIONS.has(requestedNormalized as OnsiteTrainingOption);
    if (!requestedIsValid) {
      throw new BadRequestException(
        `Invalid onsiteTrainingOption. Allowed values: ${ONSITE_TRAINING_OPTIONS_LIST}`,
      );
    }
    const requestedOption = requestedNormalized as
      | OnsiteTrainingOption
      | undefined;
    if (
      requestedOption &&
      storedOnsiteTrainingOption !== 'off' &&
      requestedOption !== storedOnsiteTrainingOption
    ) {
      throw new BadRequestException(
        ONSITE_TRAINING_OPTION_LOCKED_FOR_COMPANY_MSG,
      );
    }
    const effectiveOnsiteTrainingOption =
      storedOnsiteTrainingOption === 'off'
        ? (requestedOption ?? storedOnsiteTrainingOption)
        : storedOnsiteTrainingOption;

    const isOneTimeCheckoutPlan = company.plan?.planTypeId === 'one_time';
    const onsiteForStripe = isOneTimeCheckoutPlan
      ? ('off' as OnsiteTrainingOption)
      : effectiveOnsiteTrainingOption;

    let assessmentQuantity: number | undefined;
    if (isOneTimeCheckoutPlan) {
      if (requestedAssessmentQuantity == null) {
        throw new BadRequestException(
          ONE_TIME_ASSESSMENT_QUANTITY_REQUIRED_MSG,
        );
      }
      if (
        !Number.isInteger(requestedAssessmentQuantity) ||
        requestedAssessmentQuantity < MIN_ONE_TIME_ASSESSMENT_QUANTITY ||
        requestedAssessmentQuantity > MAX_ONE_TIME_ASSESSMENT_QUANTITY
      ) {
        throw new BadRequestException(ONE_TIME_ASSESSMENT_QUANTITY_INVALID_MSG);
      }
      assessmentQuantity = requestedAssessmentQuantity;
    }

    const checkoutResult = await this.stripeService.createCheckoutSession({
      corporationId: company.corporationId,
      companyId: company.id,
      pricingPlanId: company.planId,
      promoCode: fromSeat,
      onsiteTrainingOption: onsiteForStripe,
      autoSendInvoiceEmailAfterCheckout: true,
      skipAutoPromoWhenNoExplicitCode: true,
      assessmentQuantity,
    });

    if (checkoutResult.data?.checkoutSessionId) {
      await this.prisma.corporationCompany.update({
        where: { id: company.id },
        data: {
          lastCheckoutSessionId: checkoutResult.data.checkoutSessionId,
        },
      });
    }

    return {
      success: checkoutResult.success,
      message: checkoutResult.message,
      data: checkoutResult.data ? { url: checkoutResult.data.url } : undefined,
    };
  }

  /** Resolves target company for company-admin billing (same rules as checkout). */
  async resolveTargetCompanyIdForUser(
    cognitoSub: string,
    companyId?: string,
  ): Promise<string> {
    const accesses = await this.prisma.userCompanyAccess.findMany({
      where: { userId: cognitoSub },
      select: { companyId: true },
    });
    const allowedIds = new Set(accesses.map((a) => a.companyId));

    if (allowedIds.size === 0) {
      throw new NotFoundException(NO_COMPANY_ACCESS_FOUND_MESSAGE);
    }

    let targetId = companyId?.trim();
    if (!targetId) {
      if (allowedIds.size !== 1) {
        throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
      }
      targetId = [...allowedIds][0];
    } else if (!allowedIds.has(targetId)) {
      throw new ForbiddenException(NO_ACCESS_TO_COMPANY_MESSAGE);
    }

    return targetId;
  }

  /** Returns billing record for the target company. */
  async getBillingForUser(
    cognitoSub: string,
    companyId?: string,
  ): Promise<BillingAdminListItem> {
    const targetId = await this.resolveTargetCompanyIdForUser(
      cognitoSub,
      companyId,
    );
    const row = await this.stripeService.getBillingRecordForAdmin(targetId);
    if (!row) {
      throw new NotFoundException(FINANCE_BILLING_RECORD_NOT_FOUND_MSG);
    }
    return {
      ...row,
      canEdit: false,
    };
  }

  /** Returns billing history for the target company. */
  async listBillingHistoryForUser(
    cognitoSub: string,
    companyId: string | undefined,
    query: ListBillingHistoryQueryDto,
  ): Promise<BillingHistoryListResult> {
    const targetId = await this.resolveTargetCompanyIdForUser(
      cognitoSub,
      companyId,
    );
    return this.stripeService.listBillingHistoryForAdmin(targetId, query);
  }

  /** Cancels the subscription for the target company. */
  async cancelSubscriptionForUser(
    cognitoSub: string,
    companyId: string | undefined,
    dto: CancelBillingSubscriptionDto,
    groups: string[],
  ): Promise<void> {
    const targetId = await this.resolveTargetCompanyIdForUser(
      cognitoSub,
      companyId,
    );
    const actor = await this.stripeService.resolveBillingSubscriptionActor(
      cognitoSub,
      groups,
    );
    await this.stripeService.cancelCompanySubscriptionForAdmin(
      targetId,
      dto,
      actor,
    );
  }

  /** Retries the payment for the target company. */
  async retryPaymentForUser(
    cognitoSub: string,
    companyId: string | undefined,
  ): Promise<void> {
    const targetId = await this.resolveTargetCompanyIdForUser(
      cognitoSub,
      companyId,
    );
    await this.stripeService.retryCompanyPaymentForAdmin(targetId);
  }

  /** Clears scheduled cancellation at period end for the target company. */
  async reinstateSubscriptionForUser(
    cognitoSub: string,
    companyId: string | undefined,
    groups: string[],
  ): Promise<void> {
    const targetId = await this.resolveTargetCompanyIdForUser(
      cognitoSub,
      companyId,
    );
    const actor = await this.stripeService.resolveBillingSubscriptionActor(
      cognitoSub,
      groups,
    );
    await this.stripeService.reinstateCompanySubscriptionForAdmin(
      targetId,
      actor,
    );
  }

  /** Submits a support request when the company admin asks to change their plan. */
  async requestPlanChangeForUser(
    cognitoSub: string,
    companyId?: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const targetId = await this.resolveTargetCompanyIdForUser(
      cognitoSub,
      companyId,
    );
    const billingRow =
      await this.stripeService.getBillingRecordForAdmin(targetId);
    if (!billingRow) {
      throw new NotFoundException(FINANCE_BILLING_RECORD_NOT_FOUND_MSG);
    }

    const appUser = await this.prisma.appUser.findFirst({
      where: { cognitoSub, deletedAt: null },
      select: { firstName: true, lastName: true, email: true },
    });

    const email = appUser?.email?.trim();
    if (!email) {
      throw new BadRequestException(
        'Company admin email is required to submit a plan change request.',
      );
    }

    const nameParts = [appUser?.firstName, appUser?.lastName].filter(Boolean);
    const adminName = nameParts.length > 0 ? nameParts.join(' ').trim() : email;

    const currentPlan = `${billingRow.planLabel?.trim()} ${billingRow.planLevel?.trim()}`;
    return this.supportRequestService.submitPlanChangeRequest({
      adminEmail: email,
      adminName,
      companyName: billingRow.companyName,
      currentPlan,
    });
  }

  /** Returns the PDF invoice for the target company. */
  async getInvoicePdfForUser(
    cognitoSub: string,
    companyId: string | undefined,
    invoiceId: string,
  ): Promise<Buffer> {
    const targetId = await this.resolveTargetCompanyIdForUser(
      cognitoSub,
      companyId,
    );
    return this.stripeService.getInvoicePdfBufferForCompanyAdmin(
      invoiceId,
      targetId,
    );
  }
}
