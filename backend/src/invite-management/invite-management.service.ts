import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiResponse, ResponseHelper } from '../common';
import { PromoService } from '../promo';
import { StripeService } from '../stripe/stripe.service';
import {
  STRIPE_ONE_TIME_PRICE_ID_NOT_CONFIGURED_MSG,
  STRIPE_ONE_TIME_PRICE_UNIT_AMOUNT_MISSING_MSG,
} from '../stripe/stripe.constants';
import { AppUserService } from '../user/app-user.service';
import { IndividualPaymentService } from '../user/individual-payment.service';
import {
  APP_USER_INVITE_TYPE,
  INDIVIDUAL_APP_USER_TYPE,
} from '../user/constants/app-user.constants';
import { SendAssessmentInviteDto } from './dto/send-assessment-invite.dto';
import {
  ASSESSMENT_INVITE_OPTIONS_FETCHED_MSG,
  ASSESSMENT_INVITE_PROMO_INVALID_MSG,
  ASSESSMENT_INVITE_PROMO_REJECTED_LOG_MSG,
  ASSESSMENT_INVITE_PROMO_REQUIRED_LOG_MSG,
  ASSESSMENT_INVITE_PROMO_REQUIRED_MSG,
  ASSESSMENT_INVITE_SENT_MSG,
  ASSESSMENT_INVITE_TYPE_LABEL,
} from './invite-management.constants';

export type AssessmentInviteOptionsData = {
  assessmentType: string;
  invoiceAmount: number;
  promoCodes: Array<{
    id: string;
    code: string;
    planTypeId: string;
    discountType: 'percent' | 'fixed_amount';
    discountValue: number;
    currency: string | null;
  }>;
};

@Injectable()
export class InviteManagementService {
  private readonly logger = new Logger(InviteManagementService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly promoService: PromoService,
    private readonly appUserService: AppUserService,
    private readonly individualPaymentService: IndividualPaymentService,
  ) {}

  /**
   * Super Admin only. Returns fixed assessment metadata, Stripe one-time price amount,
   * and eligible promos for the Individual Assessment product.
   */
  async getAssessmentInviteOptions(): Promise<
    ApiResponse<AssessmentInviteOptionsData>
  > {
    const stripePrice = await this.resolveIndividualAssessmentStripePrice();
    const promoResult =
      await this.promoService.listAvailablePromoCodesForIndividualAssessment(
        stripePrice.id,
      );

    const promoCodes = promoResult.data?.items ?? [];
    const invoiceAmount = this.invoiceAmountMajorFromStripePrice(stripePrice);

    this.logger.debug(
      `Assessment invite options loaded: stripePriceId=${stripePrice.id}, invoiceAmount=${invoiceAmount}, promoCount=${promoCodes.length}`,
    );

    return ResponseHelper.success(ASSESSMENT_INVITE_OPTIONS_FETCHED_MSG, {
      assessmentType: ASSESSMENT_INVITE_TYPE_LABEL,
      invoiceAmount,
      promoCodes,
    });
  }

  /**
   * Super Admin only. Creates an individual Assessment Only user and sends invitation email.
   */
  async sendAssessmentInvite(
    dto: SendAssessmentInviteDto,
  ): Promise<ApiResponse> {
    const stripePrice = await this.resolveIndividualAssessmentStripePrice();

    if (dto.hasPromoCode) {
      const promoId = dto.promoCodeId?.trim();
      if (!promoId) {
        this.logger.warn(ASSESSMENT_INVITE_PROMO_REQUIRED_LOG_MSG);
        throw new BadRequestException(ASSESSMENT_INVITE_PROMO_REQUIRED_MSG);
      }
      await this.assertPromoEligibleForAssessmentInvite(
        promoId,
        stripePrice.id,
      );
    }

    const pricingPlanId =
      await this.individualPaymentService.resolveIndividualPricingPlanIdForInvite();

    const inviteDto = {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: dto.email.trim(),
      workPhone: dto.workPhone.trim(),
      timezone: dto.timezone.trim(),
      nickname: dto.nickname?.trim() || undefined,
      cellPhone: dto.cellPhone?.trim() || undefined,
      inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
      userType: INDIVIDUAL_APP_USER_TYPE,
      pricingPlanId,
      promoCodeId: dto.hasPromoCode ? dto.promoCodeId?.trim() : undefined,
    };

    this.logger.log(
      `Sending assessment invite to ${inviteDto.email} (hasPromoCode=${dto.hasPromoCode})`,
    );

    const result = await this.appUserService.inviteAppUser(inviteDto);
    const message =
      typeof result.message === 'string'
        ? result.message
        : ASSESSMENT_INVITE_SENT_MSG;

    this.logger.log(`Assessment invite sent to ${inviteDto.email}`);

    return ResponseHelper.success(message, result.data);
  }

  /**
   * Resolves the Individual Assessment Stripe Price from the environment variable.
   * Throws a 503 with a clear setup message when the env var is not set.
   */
  private async resolveIndividualAssessmentStripePrice() {
    return this.stripeService.retrieveConfiguredPrice(
      'STRIPE_ONE_TIME_PRICE_ID',
      STRIPE_ONE_TIME_PRICE_ID_NOT_CONFIGURED_MSG,
    );
  }

  /**
   * Converts the Stripe Price unit amount to a major currency amount.
   */
  private invoiceAmountMajorFromStripePrice(price: {
    unit_amount: number | null;
  }): number {
    if (price.unit_amount == null) {
      throw new NotFoundException(
        STRIPE_ONE_TIME_PRICE_UNIT_AMOUNT_MISSING_MSG,
      );
    }
    return price.unit_amount / 100;
  }

  /**
   * Asserts that the promo code is eligible for the assessment invite.
   * Throws a 400 with a clear setup message when the promo code is not eligible.
   */
  private async assertPromoEligibleForAssessmentInvite(
    promoCodeId: string,
    stripePriceId: string,
  ): Promise<void> {
    const promoResult =
      await this.promoService.listAvailablePromoCodesForIndividualAssessment(
        stripePriceId,
      );
    const eligible = promoResult.data?.items.some((p) => p.id === promoCodeId);
    if (!eligible) {
      this.logger.warn(
        `${ASSESSMENT_INVITE_PROMO_REJECTED_LOG_MSG}: promoCodeId=${promoCodeId}, stripePriceId=${stripePriceId}`,
      );
      throw new BadRequestException(ASSESSMENT_INVITE_PROMO_INVALID_MSG);
    }
  }
}
