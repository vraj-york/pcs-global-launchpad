import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decimalToString } from '../common';
import { computePromoDiscountAmountFromPlanPrice } from '../promo/promo-money.util';
import { PromoService } from '../promo';
import { StripeService } from '../stripe/stripe.service';
import { STRIPE_ONE_TIME_PRICE_ID_NOT_CONFIGURED_MSG } from '../stripe/stripe.constants';
import { PrismaService } from '../prisma';
import { ApiResponse, ResponseHelper } from '../common';
import {
  APP_USER_INVITE_TYPE,
  APP_USER_STATUS,
  INDIVIDUAL_APP_USER_TYPE,
} from './constants/app-user.constants';
import {
  INDIVIDUAL_PAYMENT_ACTIVATED_MSG,
  INDIVIDUAL_PAYMENT_ALREADY_PAID_MSG,
  INDIVIDUAL_PAYMENT_CHECKOUT_CREATED_MSG,
  INDIVIDUAL_PAYMENT_NOT_REQUIRED_MSG,
  INDIVIDUAL_PAYMENT_PLAN_NOT_CONFIGURED_MSG,
  INDIVIDUAL_PAYMENT_PROMO_INVALID_MSG,
  INDIVIDUAL_PAYMENT_REVIEW_FETCHED_MSG,
  INDIVIDUAL_PAYMENT_STATUS,
  INDIVIDUAL_PAYMENT_USER_NOT_FOUND_MSG,
} from './constants/individual-payment.constants';

export type IndividualPaymentReviewData = {
  title: string;
  subtitle: string;
  hasPaid: boolean;
  canCheckout: boolean;
  planSummary: {
    planTypeId: string;
    planTypeName: string;
    pricing: {
      planPrice: string;
      discount: string;
      invoiceAmount: string;
      billingCurrency: string;
      promoCode: string | null;
    };
  } | null;
};

@Injectable()
export class IndividualPaymentService {
  private readonly logger = new Logger(IndividualPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
    @Inject(forwardRef(() => PromoService))
    private readonly promoService: PromoService,
  ) {}

  /**
   * Gets the payment review for an individual user.
   * @param cognitoSub - The Cognito sub of the individual user.
   * @returns The payment review data.
   */
  async getPaymentReview(
    cognitoSub: string,
  ): Promise<ApiResponse<IndividualPaymentReviewData>> {
    const user = await this.loadIndividualUser(cognitoSub);
    const hasPaid = this.isPaymentComplete(user.paymentStatus);
    const planSummary = await this.buildPlanSummary(user);

    return ResponseHelper.success(INDIVIDUAL_PAYMENT_REVIEW_FETCHED_MSG, {
      title: 'BSP Assessment (Individual)',
      subtitle:
        'An individual subscription plan allowing you to take BSP assessment.',
      hasPaid,
      canCheckout: !hasPaid && planSummary != null,
      planSummary,
    });
  }

  /**
   * Creates a checkout session for an individual user.
   * @param cognitoSub - The Cognito sub of the individual user.
   * @returns The checkout session data.
   */
  async createCheckoutSession(
    cognitoSub: string,
  ): Promise<ApiResponse<{ url: string }>> {
    const user = await this.loadIndividualUser(cognitoSub);

    if (this.isPaymentComplete(user.paymentStatus)) {
      throw new BadRequestException(INDIVIDUAL_PAYMENT_ALREADY_PAID_MSG);
    }

    const pricingPlan = await this.resolveIndividualPricingPlan();
    await this.assertStoredPromoStillValid(user, pricingPlan.stripePriceId!);

    const planSummary = await this.buildPlanSummary(user);
    const invoiceAmount = Number(planSummary?.pricing.invoiceAmount ?? 0);

    if (invoiceAmount <= 0) {
      await this.activateAfterPayment({
        cognitoSub: user.cognitoSub,
        pricingPlanId: pricingPlan.id,
        stripeCustomerId: user.stripeCustomerId,
        checkoutSessionId: null,
        sendInvoiceEmail: false,
      });
      const successUrl =
        this.stripeService.getCheckoutSuccessUrlWithSessionPlaceholder();
      return ResponseHelper.success(INDIVIDUAL_PAYMENT_ACTIVATED_MSG, {
        url: successUrl.replace('{CHECKOUT_SESSION_ID}', 'promo-activated'),
      });
    }

    const result =
      await this.stripeService.createIndividualAppUserCheckoutSession({
        cognitoSub: user.cognitoSub,
        email: user.email ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        pricingPlanId: pricingPlan.id,
        stripePriceId: pricingPlan.stripePriceId!,
        promoCode: user.promoCode?.code ?? null,
        existingStripeCustomerId: user.stripeCustomerId,
      });

    if (result.data?.checkoutSessionId) {
      await this.prisma.appUser.update({
        where: { cognitoSub: user.cognitoSub },
        data: { lastCheckoutSessionId: result.data.checkoutSessionId },
      });
    }

    return ResponseHelper.success(INDIVIDUAL_PAYMENT_CHECKOUT_CREATED_MSG, {
      url: result.data!.url,
    });
  }

  /**
   * Idempotent activation after Stripe Checkout or 100% promo (zero invoice).
   */
  async activateAfterPayment(params: {
    cognitoSub: string;
    pricingPlanId: string;
    stripeCustomerId?: string | null;
    checkoutSessionId?: string | null;
    invoiceId?: string | null;
    sendInvoiceEmail?: boolean;
  }): Promise<void> {
    const trimmedSub = params.cognitoSub?.trim();
    if (!trimmedSub) {
      return;
    }

    const existing = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedSub, deletedAt: null },
      select: {
        paymentStatus: true,
        lastCheckoutSessionId: true,
      },
    });
    if (!existing) {
      return;
    }

    if (this.isPaymentComplete(existing.paymentStatus)) {
      if (
        params.checkoutSessionId &&
        existing.lastCheckoutSessionId === params.checkoutSessionId
      ) {
        return;
      }
      if (!params.checkoutSessionId) {
        return;
      }
    }

    await this.prisma.appUser.update({
      where: { cognitoSub: trimmedSub },
      data: {
        paymentStatus: INDIVIDUAL_PAYMENT_STATUS.PAID,
        status: APP_USER_STATUS.ACTIVE,
        paidAt: new Date(),
        pricingPlanId: params.pricingPlanId,
        stripeCustomerId: params.stripeCustomerId ?? undefined,
        lastCheckoutSessionId: params.checkoutSessionId ?? undefined,
      },
    });

    this.logger.log(`Individual user payment completed for ${trimmedSub}`);

    if (params.sendInvoiceEmail && params.invoiceId) {
      const user = await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: { email: true },
      });
      const recipientEmail = user?.email?.trim();
      if (recipientEmail) {
        try {
          await this.stripeService.sendIndividualPaymentInvoiceEmail(
            params.invoiceId,
            recipientEmail,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to send individual payment invoice ${params.invoiceId}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }
  }

  /**
   * Loads an individual user from the database.
   * @param cognitoSub - The Cognito sub of the individual user.
   * @returns The individual user data.
   */
  private async loadIndividualUser(cognitoSub: string) {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(INDIVIDUAL_PAYMENT_USER_NOT_FOUND_MSG);
    }

    const user = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedSub, deletedAt: null },
      select: {
        cognitoSub: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true,
        inviteType: true,
        paymentStatus: true,
        stripeCustomerId: true,
        pricingPlanId: true,
        promoCodeId: true,
        promoCode: {
          select: {
            id: true,
            code: true,
            discountType: true,
            percentOff: true,
            amountOffMinor: true,
            currency: true,
            stripePromotionCodeId: true,
          },
        },
        pricingPlan: {
          select: {
            id: true,
            planTypeId: true,
            stripePriceId: true,
            price: true,
            planType: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(INDIVIDUAL_PAYMENT_USER_NOT_FOUND_MSG);
    }

    if (user.userType !== INDIVIDUAL_APP_USER_TYPE) {
      throw new ForbiddenException(INDIVIDUAL_PAYMENT_NOT_REQUIRED_MSG);
    }

    if (
      user.inviteType?.trim().toLowerCase() !==
      APP_USER_INVITE_TYPE.ASSESSMENT_ONLY.toLowerCase()
    ) {
      throw new ForbiddenException(INDIVIDUAL_PAYMENT_NOT_REQUIRED_MSG);
    }

    return user;
  }

  /**
   * Checks if the payment is complete.
   * @param paymentStatus - The payment status of the individual user.
   * @returns True if the payment is complete, false otherwise.
   */
  private isPaymentComplete(paymentStatus: string | null | undefined): boolean {
    return (
      paymentStatus?.trim().toLowerCase() === INDIVIDUAL_PAYMENT_STATUS.PAID
    );
  }

  /**
   * Resolves the individual pricing plan.
   * @returns The individual pricing plan data.
   */
  private async resolveIndividualPricingPlan() {
    const stripePrice = await this.stripeService.retrieveConfiguredPrice(
      'STRIPE_ONE_TIME_PRICE_ID',
      STRIPE_ONE_TIME_PRICE_ID_NOT_CONFIGURED_MSG,
    );

    const pricingPlan = await this.prisma.pricingPlan.findFirst({
      where: {
        stripePriceId: stripePrice.id,
        planTypeId: 'one_time',
        customerType: 'individual',
      },
      select: {
        id: true,
        planTypeId: true,
        stripePriceId: true,
        price: true,
        planType: { select: { name: true } },
      },
    });

    if (!pricingPlan?.stripePriceId) {
      throw new NotFoundException(INDIVIDUAL_PAYMENT_PLAN_NOT_CONFIGURED_MSG);
    }

    return pricingPlan;
  }

  /**
   * Builds the plan summary for an individual user.
   * @param user - The individual user data.
   * @returns The plan summary data.
   */
  private async buildPlanSummary(
    user: Awaited<ReturnType<IndividualPaymentService['loadIndividualUser']>>,
  ): Promise<IndividualPaymentReviewData['planSummary']> {
    const pricingPlan =
      user.pricingPlan ?? (await this.resolveIndividualPricingPlan());

    const planPrice = new Prisma.Decimal(pricingPlan.price.toString());
    let discount = new Prisma.Decimal(0);
    let promoCode: string | null = null;

    if (user.promoCode) {
      promoCode = user.promoCode.code;
      discount = computePromoDiscountAmountFromPlanPrice(planPrice, {
        discountType: user.promoCode.discountType,
        percentOff: user.promoCode.percentOff,
        amountOffMinor: user.promoCode.amountOffMinor,
        currency: user.promoCode.currency,
      });
    }

    const net = planPrice.minus(discount);
    const invoiceDec = net.lessThan(0) ? new Prisma.Decimal(0) : net;

    return {
      planTypeId: pricingPlan.planTypeId,
      planTypeName: pricingPlan.planType.name,
      pricing: {
        planPrice: decimalToString(planPrice),
        discount: decimalToString(discount),
        invoiceAmount: decimalToString(invoiceDec),
        billingCurrency: 'USD ($)',
        promoCode,
      },
    };
  }

  /**
   * Asserts that the stored promo is still valid.
   * @param user - The individual user data.
   * @param stripePriceId - The stripe price id of the individual user.
   * @returns True if the promo is valid, false otherwise.
   */
  private async assertStoredPromoStillValid(
    user: Awaited<ReturnType<IndividualPaymentService['loadIndividualUser']>>,
    stripePriceId: string,
  ): Promise<void> {
    if (!user.promoCodeId) {
      return;
    }

    const promoResult =
      await this.promoService.listAvailablePromoCodesForIndividualAssessment(
        stripePriceId,
      );
    const eligible = promoResult.data?.items.some(
      (p) => p.id === user.promoCodeId,
    );
    if (!eligible) {
      throw new BadRequestException(INDIVIDUAL_PAYMENT_PROMO_INVALID_MSG);
    }
  }

  /** Resolves the individual `one_time` pricing plan id for new invites. */
  async resolveIndividualPricingPlanIdForInvite(): Promise<string> {
    const plan = await this.resolveIndividualPricingPlan();
    return plan.id;
  }
}
