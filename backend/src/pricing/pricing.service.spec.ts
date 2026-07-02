/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma';
import { StripeService } from '../stripe';
import {
  PRICING_PLANS_LIST_FETCHED_SUCCESS_MSG,
  PRICING_PLANS_LIST_FORBIDDEN_MSG,
  PRICING_ONBOARDING_FEES_FETCHED_SUCCESS_MSG,
} from './constants';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';

describe('PricingService', () => {
  let service: PricingService;
  let prisma: jest.Mocked<PrismaService>;
  let stripeService: { retrieveConfiguredPrice: jest.Mock };

  const mockPlanTypes = [
    {
      id: 'monthly',
      name: 'Monthly',
      pricingPlans: [
        {
          id: 'plan-uuid-1',
          planTypeId: 'monthly',
          customerType: 'company',
          employeeRangeMin: 1,
          employeeRangeMax: 100,
          price: 99.99,
          isCustomPricing: false,
          stripePriceId: null,
        },
      ],
    },
  ];

  beforeEach(async () => {
    const mockPrisma = {
      planType: {
        findMany: jest.fn(),
      },
    };
    const mockStripe = {
      retrieveConfiguredPrice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: StripeService,
          useValue: mockStripe,
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    prisma = module.get(PrismaService);
    stripeService = module.get(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listAllPlanTypesWithPlansForRequester', () => {
    it('should forbid callers who are not SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      await expect(
        service.listAllPlanTypesWithPlansForRequester(['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.listAllPlanTypesWithPlansForRequester(['User']),
      ).rejects.toThrow(PRICING_PLANS_LIST_FORBIDDEN_MSG);
      expect(prisma.planType.findMany).not.toHaveBeenCalled();
    });

    it('should delegate to listAllPlanTypesWithPlans for CompanyAdmin', async () => {
      (prisma.planType.findMany as jest.Mock).mockResolvedValue(mockPlanTypes);

      const result = await service.listAllPlanTypesWithPlansForRequester([
        COGNITO_GROUP_NAMES.COMPANY_ADMIN,
      ]);

      expect(prisma.planType.findMany).toHaveBeenCalled();
      expect(result.message).toBe(PRICING_PLANS_LIST_FETCHED_SUCCESS_MSG);
    });
  });

  describe('listAllPlanTypesWithPlans', () => {
    it('should return plan types with pricing plans and success message', async () => {
      (prisma.planType.findMany as jest.Mock).mockResolvedValue(mockPlanTypes);

      const result = await service.listAllPlanTypesWithPlans();

      expect(prisma.planType.findMany).toHaveBeenCalledWith({
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
      expect(result.success).toBe(true);
      expect(result.message).toBe(PRICING_PLANS_LIST_FETCHED_SUCCESS_MSG);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual({
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
            stripePriceId: null,
          },
        ],
      });
    });

    it('should return multiple plan types with correct structure', async () => {
      const multipleTypes = [
        ...mockPlanTypes,
        {
          id: 'yearly',
          name: 'Yearly',
          pricingPlans: [
            {
              id: 'plan-uuid-2',
              planTypeId: 'yearly',
              customerType: 'corporation',
              employeeRangeMin: null,
              employeeRangeMax: null,
              price: 199.5,
              isCustomPricing: true,
              stripePriceId: null,
            },
          ],
        },
      ];
      (prisma.planType.findMany as jest.Mock).mockResolvedValue(multipleTypes);

      const result = await service.listAllPlanTypesWithPlans();

      expect(result.data).toHaveLength(2);
      expect(result.data?.[1].plans[0].price).toBe(199.5);
      expect(result.data?.[1].plans[0].isCustomPricing).toBe(true);
    });

    it('should return empty array when no plan types exist', async () => {
      (prisma.planType.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.listAllPlanTypesWithPlans();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should rethrow error when prisma findMany fails', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.planType.findMany as jest.Mock).mockRejectedValue(dbError);

      await expect(service.listAllPlanTypesWithPlans()).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('getOnboardingFees', () => {
    it('returns implementation fee and per-day-multiplied onsite training amounts from configured Stripe Prices', async () => {
      stripeService.retrieveConfiguredPrice.mockImplementation(
        (envName: string) => {
          if (envName === 'STRIPE_IMPLEMENTATION_FEE_PRICE_ID') {
            return Promise.resolve({
              id: 'price_impl',
              unit_amount: 249900,
              currency: 'USD',
            });
          }
          if (envName === 'STRIPE_ONSITE_TRAINING_PRICE_ID') {
            return Promise.resolve({
              id: 'price_onsite_per_day',
              unit_amount: 800000,
              currency: 'usd',
            });
          }
          throw new Error(`Unexpected env name: ${envName}`);
        },
      );

      const result = await service.getOnboardingFees();

      expect(result.success).toBe(true);
      expect(result.message).toBe(PRICING_ONBOARDING_FEES_FETCHED_SUCCESS_MSG);
      expect(result.data).toEqual({
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
      });
      expect(stripeService.retrieveConfiguredPrice).toHaveBeenCalledTimes(2);
    });

    it('passes through ServiceUnavailableException when a price id is not configured', async () => {
      stripeService.retrieveConfiguredPrice.mockRejectedValueOnce(
        new ServiceUnavailableException(
          'STRIPE_IMPLEMENTATION_FEE_PRICE_ID is not configured',
        ),
      );
      stripeService.retrieveConfiguredPrice.mockResolvedValue({
        id: 'price_x',
        unit_amount: 0,
        currency: 'usd',
      });

      await expect(service.getOnboardingFees()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('returns null amount when Stripe Price has no unit_amount', async () => {
      stripeService.retrieveConfiguredPrice.mockResolvedValue({
        id: 'price_x',
        unit_amount: null,
        currency: 'usd',
      });

      const result = await service.getOnboardingFees();
      expect(result.data?.implementationFee.amount).toBeNull();
      expect(result.data?.onsiteTraining['1_day'].amount).toBeNull();
      expect(result.data?.onsiteTraining['2_days'].amount).toBeNull();
    });
  });
});
