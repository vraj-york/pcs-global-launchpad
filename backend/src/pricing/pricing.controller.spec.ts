/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { AuthorizationGuard, CognitoAuthGuard } from '../auth';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import {
  PRICING_PLANS_LIST_FETCHED_SUCCESS_MSG,
  PRICING_ONBOARDING_FEES_FETCHED_SUCCESS_MSG,
} from './constants';

describe('PricingController', () => {
  let controller: PricingController;
  let pricingService: jest.Mocked<PricingService>;

  const mockPlanTypesResponse = {
    success: true,
    message: PRICING_PLANS_LIST_FETCHED_SUCCESS_MSG,
    data: [
      {
        id: 'monthly',
        name: 'Monthly',
        plans: [
          {
            id: 'plan-uuid-1',
            planTypeId: 'monthly',
            customerType: 'company',
            employeeRangeMin: 1,
            employeeRangeMax: 100,
            price: 99.99,
            isCustomPricing: false,
          },
        ],
      },
    ],
  };

  const mockOnboardingFeesResponse = {
    success: true,
    message: PRICING_ONBOARDING_FEES_FETCHED_SUCCESS_MSG,
    data: {
      implementationFee: {
        stripePriceId: 'price_impl',
        amount: 2499,
        currency: 'usd',
      },
      onsiteTraining: {
        '1_day': {
          stripePriceId: 'price_onsite_per_day',
          amount: 8000,
          currency: 'usd',
        },
        '2_days': {
          stripePriceId: 'price_onsite_per_day',
          amount: 16000,
          currency: 'usd',
        },
      },
    },
  };

  beforeEach(async () => {
    const mockPricingService = {
      listAllPlanTypesWithPlansForRequester: jest.fn(),
      getOnboardingFees: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricingController],
      providers: [
        {
          provide: PricingService,
          useValue: mockPricingService,
        },
      ],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PricingController>(PricingController);
    pricingService = module.get(PricingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listPlans', () => {
    it('should return plan types with pricing plans', async () => {
      (
        pricingService.listAllPlanTypesWithPlansForRequester as jest.Mock
      ).mockResolvedValue(mockPlanTypesResponse);

      const result = await controller.listPlans({
        sub: 'user-1',
        groups: [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      });

      expect(
        pricingService.listAllPlanTypesWithPlansForRequester,
      ).toHaveBeenCalledWith([COGNITO_GROUP_NAMES.COMPANY_ADMIN]);
      expect(result).toEqual(mockPlanTypesResponse);
      expect(result.success).toBe(true);
      expect(result.message).toBe(PRICING_PLANS_LIST_FETCHED_SUCCESS_MSG);
      expect(result.data).toHaveLength(1);
      const data = result.data as typeof mockPlanTypesResponse.data;
      expect(data[0].plans[0].price).toBe(99.99);
    });

    it('should rethrow error when service throws', async () => {
      const error = new Error('Database error');
      (
        pricingService.listAllPlanTypesWithPlansForRequester as jest.Mock
      ).mockRejectedValue(error);

      await expect(
        controller.listPlans({
          sub: 'user-1',
          groups: [COGNITO_GROUP_NAMES.SUPER_ADMIN],
        }),
      ).rejects.toThrow('Database error');
    });
  });

  describe('listOnboardingFees', () => {
    it('returns implementation + onsite training fees from Stripe', async () => {
      (pricingService.getOnboardingFees as jest.Mock).mockResolvedValue(
        mockOnboardingFeesResponse,
      );

      const result = await controller.listOnboardingFees();

      expect(pricingService.getOnboardingFees).toHaveBeenCalled();
      expect(result).toEqual(mockOnboardingFeesResponse);
    });

    it('rethrows when service throws (e.g. ServiceUnavailableException)', async () => {
      const error = new Error(
        'STRIPE_IMPLEMENTATION_FEE_PRICE_ID is not configured',
      );
      (pricingService.getOnboardingFees as jest.Mock).mockRejectedValue(error);

      await expect(controller.listOnboardingFees()).rejects.toThrow(
        'STRIPE_IMPLEMENTATION_FEE_PRICE_ID is not configured',
      );
    });
  });
});
