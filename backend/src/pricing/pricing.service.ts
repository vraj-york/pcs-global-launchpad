import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { ResponseHelper, ApiResponse } from '../common';
import {
  PRICING_PLANS_LIST_FETCHED_SUCCESS_MSG,
  PRICING_PLANS_LIST_FORBIDDEN_MSG,
  PRICING_ONBOARDING_FEES_FETCHED_SUCCESS_MSG,
} from './constants';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import { StripeService } from '../stripe';
import {
  ONSITE_TRAINING_QUANTITY_BY_OPTION,
  STRIPE_IMPLEMENTATION_FEE_PRICE_ID_NOT_CONFIGURED_MSG,
  STRIPE_ONSITE_TRAINING_PRICE_ID_NOT_CONFIGURED_MSG,
} from '../stripe/stripe.constants';

export interface PricingPlanListItem {
  id: string;
  planTypeId: string;
  customerType: string;
  employeeRangeMin: number | null;
  employeeRangeMax: number | null;
  price: number;
  isCustomPricing: boolean;
  stripePriceId: string | null;
}

export interface PlanTypeWithPlans {
  id: string;
  name: string;
  plans: PricingPlanListItem[];
}

/** Single onboarding fee resolved from a configured Stripe Price ID. */
export interface OnboardingFeeItem {
  /** Stripe Price id used at checkout (`price` line item). */
  stripePriceId: string;
  /** Major-unit amount (e.g. 2499.00 for $2,499). Null when the Stripe Price has no `unit_amount` (rare). */
  amount: number | null;
  /** ISO 4217 lowercase currency code (e.g. `usd`). */
  currency: string;
}

/**
 * Onboarding fees response shape: implementation + per-option onsite training.
 *
 * `onsiteTraining['1_day']` and `onsiteTraining['2_days']` share the same
 * `stripePriceId` (cost per day). The `2_days` `amount` is the unit amount × 2
 * so the SPA can render the breakdown without re-multiplying.
 */
export interface OnboardingFees {
  implementationFee: OnboardingFeeItem;
  onsiteTraining: {
    '1_day': OnboardingFeeItem;
    '2_days': OnboardingFeeItem;
  };
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Ensures the caller is SuperAdmin, CorporationAdmin, or CompanyAdmin for GET /pricing/plans.
   */
  private assertPlansListRequesterAllowed(groups: string[]): void {
    const groupSet = new Set(groups ?? []);
    const isAllowed =
      groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN) ||
      groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN) ||
      groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN);
    if (!isAllowed) {
      throw new ForbiddenException(PRICING_PLANS_LIST_FORBIDDEN_MSG);
    }
  }

  /**
   * Authorizes GET /pricing/plans then delegates to {@link listAllPlanTypesWithPlans}.
   * **SuperAdmin**, **CorporationAdmin**, and **CompanyAdmin** only; others receive
   * {@link ForbiddenException}.
   */
  async listAllPlanTypesWithPlansForRequester(
    groups: string[],
  ): Promise<ApiResponse<PlanTypeWithPlans[]>> {
    this.assertPlansListRequesterAllowed(groups);
    return this.listAllPlanTypesWithPlans();
  }

  /**
   * Fetches all plan types with their related pricing plans (no pagination, no filters).
   */
  async listAllPlanTypesWithPlans(): Promise<ApiResponse<PlanTypeWithPlans[]>> {
    try {
      const planTypes = await this.prisma.planType.findMany({
        select: {
          id: true,
          name: true,
          pricingPlans: {
            select: {
              id: true,
              planTypeId: true,
              customerType: true,
              employeeRangeMin: true,
              employeeRangeMax: true,
              price: true,
              isCustomPricing: true,
              stripePriceId: true,
            },
            orderBy: [
              { customerType: 'asc' },
              { employeeRangeMin: 'asc' },
              { employeeRangeMax: 'asc' },
            ],
          },
        },
      });
      const items: PlanTypeWithPlans[] = planTypes.map((pt) => ({
        id: pt.id,
        name: pt.name,
        plans: pt.pricingPlans.map((p) => ({
          id: p.id,
          planTypeId: p.planTypeId,
          customerType: p.customerType,
          employeeRangeMin: p.employeeRangeMin,
          employeeRangeMax: p.employeeRangeMax,
          price: Number(p.price),
          isCustomPricing: p.isCustomPricing,
          stripePriceId: p.stripePriceId,
        })),
      }));
      this.logger.debug(
        `Fetched ${planTypes.length} plan types with related pricing plans`,
      );
      return ResponseHelper.success(
        PRICING_PLANS_LIST_FETCHED_SUCCESS_MSG,
        items,
      );
    } catch (error) {
      this.logger.error('Error fetching plan types with pricing plans', error);
      throw error;
    }
  }

  /**
   * Resolves the configured Stripe Price IDs for the onboarding fees and
   * returns their amounts so the SPA can render the price breakdown without
   * hardcoding values. Stripe is the single source of truth for these amounts.
   *
   * Onsite training uses a single per-day Price; the `2_days` amount is the
   * `1_day` unit amount multiplied by 2 to mirror what Stripe Checkout will
   * charge (quantity 1 vs 2 on the same Price).
   *
   * @throws ServiceUnavailableException when any required env var is missing.
   */
  async getOnboardingFees(): Promise<ApiResponse<OnboardingFees>> {
    const [implementationPrice, onsiteTrainingPrice] = await Promise.all([
      this.stripeService.retrieveConfiguredPrice(
        'STRIPE_IMPLEMENTATION_FEE_PRICE_ID',
        STRIPE_IMPLEMENTATION_FEE_PRICE_ID_NOT_CONFIGURED_MSG,
      ),
      this.stripeService.retrieveConfiguredPrice(
        'STRIPE_ONSITE_TRAINING_PRICE_ID',
        STRIPE_ONSITE_TRAINING_PRICE_ID_NOT_CONFIGURED_MSG,
      ),
    ]);

    const data: OnboardingFees = {
      implementationFee: this.toOnboardingFeeItem(implementationPrice),
      onsiteTraining: {
        '1_day': this.toOnboardingFeeItem(
          onsiteTrainingPrice,
          ONSITE_TRAINING_QUANTITY_BY_OPTION['1_day'],
        ),
        '2_days': this.toOnboardingFeeItem(
          onsiteTrainingPrice,
          ONSITE_TRAINING_QUANTITY_BY_OPTION['2_days'],
        ),
      },
    };

    return ResponseHelper.success(
      PRICING_ONBOARDING_FEES_FETCHED_SUCCESS_MSG,
      data,
    );
  }

  /**
   * Converts a Stripe Price into the SPA-facing onboarding fee shape.
   * `unit_amount` is in minor units (cents); divides by 100 for major units
   * and multiplies by `quantity` to mirror Stripe Checkout for multi-day items.
   */
  private toOnboardingFeeItem(
    price: { id: string; unit_amount: number | null; currency: string },
    quantity = 1,
  ): OnboardingFeeItem {
    const unitMajor =
      price.unit_amount != null ? Math.round(price.unit_amount) / 100 : null;
    return {
      stripePriceId: price.id,
      amount: unitMajor != null ? unitMajor * quantity : null,
      currency: (price.currency ?? 'usd').toLowerCase(),
    };
  }
}
