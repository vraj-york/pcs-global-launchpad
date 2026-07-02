import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompanyAdminPortalService } from './company-admin-portal.service';
import { PrismaService } from '../prisma';
import { StripeService } from '../stripe';
import { SupportRequestService } from '../support-request';

type CompanyRow = Parameters<CompanyAdminPortalService['mapCompanyToItem']>[0];

function makeCompany(
  overrides: Partial<CompanyRow> & {
    id?: string;
    corporationId?: string;
  } = {},
): CompanyRow {
  const id = overrides.id ?? 'company-1';
  const corporationId = overrides.corporationId ?? 'corp-1';

  const corporation = {
    legalName: 'Parent Corp',
    ownershipType: 'PRIVATE',
    dataResidencyRegion: 'US',
    ...(overrides.corporation ?? {}),
  };

  const defaultPlan = {
    id: 'plan-row-1',
    planTypeId: 'monthly',
    customerType: 'Standard',
    employeeRangeMin: 1,
    employeeRangeMax: 50,
    price: { toString: () => '99.00' },
    stripePriceId: 'price_123',
    planType: { name: 'BSP Blueprint (Monthly)' },
  };
  const plan = Object.hasOwn(overrides, 'plan') ? overrides.plan : defaultPlan;

  const defaultSeat = {
    zeroTrial: false,
    trialLengthDuration: 14,
    trialStartDate: new Date('2025-01-01'),
    trialEndDate: new Date('2025-01-15'),
    autoConvertTrial: true,
    planPrice: { toString: () => '99.00' },
    discount: { toString: () => '0' },
    onsiteTrainingOption: 'off',
    invoiceAmount: { toString: () => '99.00' },
    billingCurrency: 'USD ($)',
    checkoutPromoCode: null as string | null,
  };
  const planSeat = Object.hasOwn(overrides, 'planSeat')
    ? overrides.planSeat
    : defaultSeat;

  return {
    id,
    corporationId,
    legalName: overrides.legalName ?? 'Acme LLC',
    dbaName: overrides.dbaName ?? null,
    website: overrides.website ?? null,
    companyType: overrides.companyType ?? 'LLC',
    officeType: overrides.officeType ?? 'HQ',
    industry: overrides.industry ?? 'Tech',
    phoneNo: overrides.phoneNo ?? '+1',
    addressLine: overrides.addressLine ?? '1 Main St',
    city: overrides.city ?? 'Austin',
    state: overrides.state ?? 'TX',
    zip: overrides.zip ?? '78701',
    country: overrides.country ?? 'US',
    planId: overrides.planId ?? 'plan-row-1',
    subscriptionStatus: overrides.subscriptionStatus ?? null,
    corporation,
    plan,
    planSeat,
  } as CompanyRow;
}

describe('CompanyAdminPortalService', () => {
  let service: CompanyAdminPortalService;
  let prisma: {
    userCompanyAccess: { findMany: jest.Mock; findFirst: jest.Mock };
    promoCode: { findMany: jest.Mock };
    appUser: { findFirst: jest.Mock };
    corporationCompany: { update: jest.Mock };
  };
  let supportRequestService: {
    submitPlanChangeRequest: jest.Mock;
  };
  let stripeService: {
    createCheckoutSession: jest.Mock;
    getBillingRecordForAdmin: jest.Mock;
    listBillingHistoryForAdmin: jest.Mock;
    resolveBillingSubscriptionActor: jest.Mock;
    cancelCompanySubscriptionForAdmin: jest.Mock;
    retryCompanyPaymentForAdmin: jest.Mock;
    reinstateCompanySubscriptionForAdmin: jest.Mock;
    getInvoicePdfBufferForCompanyAdmin: jest.Mock;
  };

  beforeEach(async () => {
    const mockPrisma = {
      userCompanyAccess: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      promoCode: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      appUser: {
        findFirst: jest.fn(),
      },
      corporationCompany: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const mockSupportRequestService = {
      submitPlanChangeRequest: jest.fn(),
    };
    const mockStripe = {
      createCheckoutSession: jest.fn(),
      getBillingRecordForAdmin: jest.fn(),
      listBillingHistoryForAdmin: jest.fn(),
      resolveBillingSubscriptionActor: jest.fn(),
      cancelCompanySubscriptionForAdmin: jest.fn(),
      retryCompanyPaymentForAdmin: jest.fn(),
      reinstateCompanySubscriptionForAdmin: jest.fn(),
      getInvoicePdfBufferForCompanyAdmin: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyAdminPortalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
        {
          provide: SupportRequestService,
          useValue: mockSupportRequestService,
        },
      ],
    }).compile();

    service = moduleRef.get(CompanyAdminPortalService);
    prisma = moduleRef.get(PrismaService);
    supportRequestService = moduleRef.get(SupportRequestService);
    stripeService = moduleRef.get(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapCompanyToItem', () => {
    it('sets hasActiveSubscription for active and trialing (case-insensitive)', () => {
      const active = service.mapCompanyToItem(
        makeCompany({ subscriptionStatus: 'ACTIVE' }),
      );
      expect(active.hasActiveSubscription).toBe(true);
      expect(active.canCheckout).toBe(false);

      const trialing = service.mapCompanyToItem(
        makeCompany({ subscriptionStatus: 'trialing' }),
      );
      expect(trialing.hasActiveSubscription).toBe(true);
      expect(trialing.canCheckout).toBe(false);
    });

    it('canCheckout when subscription inactive, plan and Stripe price present', () => {
      const item = service.mapCompanyToItem(
        makeCompany({
          subscriptionStatus: null,
          plan: {
            id: 'plan-row-1',
            planTypeId: 'monthly',
            customerType: 'Standard',
            employeeRangeMin: 1,
            employeeRangeMax: 50,
            price: { toString: () => '99' },
            stripePriceId: 'price_abc',
            planType: { name: 'Monthly' },
          },
        }),
      );
      expect(item.hasActiveSubscription).toBe(false);
      expect(item.canCheckout).toBe(true);
    });

    it('canCheckout false when stripe price missing', () => {
      const item = service.mapCompanyToItem(
        makeCompany({
          subscriptionStatus: null,
          plan: {
            id: 'plan-row-1',
            planTypeId: 'monthly',
            customerType: 'Standard',
            employeeRangeMin: 1,
            employeeRangeMax: 50,
            price: { toString: () => '99' },
            stripePriceId: '  ',
            planType: { name: 'Monthly' },
          },
        }),
      );
      expect(item.canCheckout).toBe(false);
    });

    it('omits trial for annual plans even when planSeat exists', () => {
      const item = service.mapCompanyToItem(
        makeCompany({
          plan: {
            id: 'plan-a',
            planTypeId: 'annual',
            customerType: 'Annual',
            employeeRangeMin: 1,
            employeeRangeMax: 10,
            price: { toString: () => '1000' },
            stripePriceId: 'price_ann',
            planType: { name: 'BSP Assessment (Annual)' },
          },
          planSeat: {
            zeroTrial: false,
            trialLengthDuration: 14,
            trialStartDate: null,
            trialEndDate: null,
            autoConvertTrial: false,
            planPrice: { toString: () => '1000' },
            discount: { toString: () => '0' },
            onsiteTrainingOption: 'off',
            invoiceAmount: { toString: () => '1000' },
            billingCurrency: 'USD ($)',
            checkoutPromoCode: null,
          },
        }),
      );
      expect(item.planSummary?.planTypeId).toBe('annual');
      expect(item.planSummary?.trial).toBeNull();
    });

    it('omits trial for one_time plans even when planSeat exists', () => {
      const item = service.mapCompanyToItem(
        makeCompany({
          plan: {
            id: 'plan-ot',
            planTypeId: 'one_time',
            customerType: 'individual',
            employeeRangeMin: 1,
            employeeRangeMax: 1,
            price: { toString: () => '499' },
            stripePriceId: 'price_ot',
            planType: { name: 'BSP Assessment (Individual)' },
          },
          planSeat: {
            zeroTrial: false,
            trialLengthDuration: 14,
            trialStartDate: new Date('2025-01-01'),
            trialEndDate: new Date('2025-01-15'),
            autoConvertTrial: true,
            planPrice: { toString: () => '499' },
            discount: { toString: () => '0' },
            onsiteTrainingOption: 'off',
            invoiceAmount: { toString: () => '499' },
            billingCurrency: 'USD ($)',
            checkoutPromoCode: null,
          },
        }),
      );
      expect(item.planSummary?.planTypeId).toBe('one_time');
      expect(item.planSummary?.trial).toBeNull();
    });

    it('for one_time maps pricing as plan minus discount and onsite off', () => {
      const item = service.mapCompanyToItem(
        makeCompany({
          plan: {
            id: 'plan-ot',
            planTypeId: 'one_time',
            customerType: 'individual',
            employeeRangeMin: 1,
            employeeRangeMax: 1,
            price: { toString: () => '499' },
            stripePriceId: 'price_ot',
            planType: { name: 'BSP Assessment (Individual)' },
          },
          planSeat: {
            zeroTrial: false,
            trialLengthDuration: 14,
            trialStartDate: null,
            trialEndDate: null,
            autoConvertTrial: false,
            planPrice: { toString: () => '499' },
            discount: { toString: () => '50' },
            onsiteTrainingOption: '1_day',
            invoiceAmount: { toString: () => '2000' },
            billingCurrency: 'USD ($)',
            checkoutPromoCode: null,
          },
        }),
      );
      expect(item.planSummary?.pricing).toMatchObject({
        planPrice: '499',
        discount: '50',
        pricePerAssessment: '499',
        promoDiscountType: 'fixed_amount',
        promoDiscountValue: '50',
        onsiteTrainingOption: 'off',
        invoiceAmount: '449',
        minAssessmentQuantity: 1,
      });
    });

    it('includes trial for monthly when planSeat exists', () => {
      const item = service.mapCompanyToItem(makeCompany());
      expect(item.planSummary?.trial).toMatchObject({
        zeroTrial: false,
        trialLengthDays: 14,
        autoConvertTrial: true,
      });
    });

    it('exposes checkoutPromoCode on planSummary.pricing.promoCode', () => {
      const item = service.mapCompanyToItem(
        makeCompany({
          planSeat: {
            zeroTrial: false,
            trialLengthDuration: 14,
            trialStartDate: new Date('2025-01-01'),
            trialEndDate: new Date('2025-01-15'),
            autoConvertTrial: true,
            planPrice: { toString: () => '99.00' },
            discount: { toString: () => '0' },
            onsiteTrainingOption: 'off',
            invoiceAmount: { toString: () => '99.00' },
            billingCurrency: 'USD ($)',
            checkoutPromoCode: '  BSP100  ',
          },
        }),
      );
      expect(item.planSummary?.pricing.promoCode).toBe('BSP100');
    });

    it('resolves discount from checkout promo when stored discount is zero', () => {
      const promoLookup = new Map([
        [
          'save10',
          {
            discountType: 'percent' as const,
            percentOff: new Prisma.Decimal(10),
            amountOffMinor: null,
            currency: null,
          },
        ],
      ]);
      const item = service.mapCompanyToItem(
        makeCompany({
          plan: {
            id: 'plan-ot',
            planTypeId: 'one_time',
            customerType: 'individual',
            employeeRangeMin: 1,
            employeeRangeMax: 1,
            price: { toString: () => '499' },
            stripePriceId: 'price_ot',
            planType: { name: 'BSP Assessment (Individual)' },
          },
          planSeat: {
            zeroTrial: false,
            trialLengthDuration: 14,
            trialStartDate: null,
            trialEndDate: null,
            autoConvertTrial: false,
            planPrice: { toString: () => '499' },
            discount: { toString: () => '0' },
            onsiteTrainingOption: '1_day',
            invoiceAmount: { toString: () => '499' },
            billingCurrency: 'USD ($)',
            checkoutPromoCode: 'SAVE10',
          },
        }),
        promoLookup,
      );
      expect(item.planSummary?.pricing).toMatchObject({
        planPrice: '499',
        discount: '49.9',
        invoiceAmount: '449.1',
        promoCode: 'SAVE10',
      });
    });

    it('formats address from parts', () => {
      const item = service.mapCompanyToItem(
        makeCompany({
          addressLine: '10 Oak',
          city: 'Boston',
          state: 'MA',
          zip: '02101',
          country: 'USA',
        }),
      );
      expect(item.company.addressFormatted).toBe(
        '10 Oak, Boston, MA, 02101, USA',
      );
    });

    it('planSummary null when plan relation missing', () => {
      const item = service.mapCompanyToItem(
        makeCompany({ plan: null, planId: null, planSeat: null }),
      );
      expect(item.planSummary).toBeNull();
    });
  });

  describe('getOnboardingReview', () => {
    it('throws NotFoundException when user has no company access', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([]);
      await expect(
        service.getOnboardingReview('cognito-sub-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns companies in access order', async () => {
      const c1 = makeCompany({ id: 'c1', corporationId: 'corp-a' });
      const c2 = makeCompany({
        id: 'c2',
        corporationId: 'corp-b',
        legalName: 'Other Co',
      });
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { company: c1 },
        { company: c2 },
      ]);
      prisma.promoCode.findMany.mockResolvedValue([]);

      const result = await service.getOnboardingReview('user-1');
      expect(result.companies).toHaveLength(2);
      expect(result.companies[0].companyId).toBe('c1');
      expect(result.companies[1].companyId).toBe('c2');
      expect(prisma.promoCode.findMany).not.toHaveBeenCalled();
      expect(prisma.userCompanyAccess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('loads promo terms and resolves discount for checkout promo codes', async () => {
      const company = makeCompany({
        plan: {
          id: 'plan-ot',
          planTypeId: 'one_time',
          customerType: 'individual',
          employeeRangeMin: 1,
          employeeRangeMax: 1,
          price: { toString: () => '499' },
          stripePriceId: 'price_ot',
          planType: { name: 'BSP Assessment (Individual)' },
        },
        planSeat: {
          zeroTrial: false,
          trialLengthDuration: 14,
          trialStartDate: null,
          trialEndDate: null,
          autoConvertTrial: false,
          planPrice: { toString: () => '499' },
          discount: { toString: () => '0' },
          onsiteTrainingOption: 'off',
          invoiceAmount: { toString: () => '499' },
          billingCurrency: 'USD ($)',
          checkoutPromoCode: 'SAVE10',
        },
      });
      prisma.userCompanyAccess.findMany.mockResolvedValue([{ company }]);
      prisma.promoCode.findMany.mockResolvedValue([
        {
          code: 'SAVE10',
          discountType: 'percent',
          percentOff: new Prisma.Decimal(10),
          amountOffMinor: null,
          currency: null,
        },
      ]);

      const result = await service.getOnboardingReview('user-1');

      expect(prisma.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            code: { in: ['SAVE10'] },
          }) as Record<string, unknown>,
        }),
      );
      expect(result.companies[0].planSummary?.pricing).toMatchObject({
        discount: '49.9',
        invoiceAmount: '449.1',
      });
    });
  });

  describe('createCheckoutSessionForUser', () => {
    it('throws NotFoundException when no accesses', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([]);
      await expect(service.createCheckoutSessionForUser('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when multiple companies and companyId omitted', async () => {
      prisma.userCompanyAccess.findMany
        .mockResolvedValueOnce([{ companyId: 'a' }, { companyId: 'b' }])
        .mockResolvedValueOnce([]); // not reached
      await expect(
        service.createCheckoutSessionForUser('u1', undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when companyId not allowed', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'allowed-only' },
      ]);
      await expect(
        service.createCheckoutSessionForUser('u1', 'other-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('trims companyId and creates checkout for explicit company', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'target-co' },
      ]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        company: {
          id: 'target-co',
          corporationId: 'corp-x',
          planId: 'plan-1',
          plan: { id: 'plan-1', planTypeId: 'monthly' },
          planSeat: { checkoutPromoCode: null },
        },
      });
      stripeService.createCheckoutSession.mockResolvedValue({
        success: true,
        message: 'ok',
        data: { url: 'https://checkout.stripe.com/...' },
      });

      const res = await service.createCheckoutSessionForUser(
        'u1',
        '  target-co  ',
      );

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith({
        corporationId: 'corp-x',
        companyId: 'target-co',
        pricingPlanId: 'plan-1',
        promoCode: undefined,
        onsiteTrainingOption: 'off',
        autoSendInvoiceEmailAfterCheckout: true,
        skipAutoPromoWhenNoExplicitCode: true,
      });
      expect(res.success).toBe(true);
    });

    it('resolves single company when companyId omitted', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'only-one' },
      ]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        company: {
          id: 'only-one',
          corporationId: 'corp-y',
          planId: 'plan-z',
          plan: { id: 'plan-z', planTypeId: 'monthly' },
          planSeat: { checkoutPromoCode: null },
        },
      });
      stripeService.createCheckoutSession.mockResolvedValue({
        success: true,
        message: 'ok',
        data: { url: 'https://x' },
      });

      await service.createCheckoutSessionForUser('u1');

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith({
        corporationId: 'corp-y',
        companyId: 'only-one',
        pricingPlanId: 'plan-z',
        promoCode: undefined,
        onsiteTrainingOption: 'off',
        autoSendInvoiceEmailAfterCheckout: true,
        skipAutoPromoWhenNoExplicitCode: true,
      });
    });

    it('throws NotFoundException when company row missing', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([{ companyId: 'x' }]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue(null);
      await expect(
        service.createCheckoutSessionForUser('u1', 'x'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when plan not assigned', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([{ companyId: 'x' }]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        company: {
          id: 'x',
          corporationId: 'c',
          planId: null,
          plan: null,
          planSeat: null,
        },
      });
      await expect(
        service.createCheckoutSessionForUser('u1', 'x'),
      ).rejects.toThrow(BadRequestException);
    });

    it('ignores legacy request promo and uses only plan seat for Stripe', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([{ companyId: 'x' }]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        company: {
          id: 'x',
          corporationId: 'c',
          planId: 'plan-z',
          plan: { id: 'plan-z', planTypeId: 'monthly' },
          planSeat: { checkoutPromoCode: 'OTHER' },
        },
      });
      stripeService.createCheckoutSession.mockResolvedValue({
        success: true,
        message: 'ok',
        data: { url: 'https://x' },
      });

      await service.createCheckoutSessionForUser('u1', 'x');

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          promoCode: 'OTHER',
          autoSendInvoiceEmailAfterCheckout: true,
          skipAutoPromoWhenNoExplicitCode: true,
        }),
      );
    });

    it('applies normalized checkout promo from plan seat only', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([{ companyId: 'x' }]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        company: {
          id: 'x',
          corporationId: 'c',
          planId: 'plan-z',
          plan: { id: 'plan-z', planTypeId: 'monthly' },
          planSeat: { checkoutPromoCode: '  bsp-10  ' },
        },
      });
      stripeService.createCheckoutSession.mockResolvedValue({
        success: true,
        message: 'ok',
        data: { url: 'https://x' },
      });

      await service.createCheckoutSessionForUser('u1', 'x');

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          promoCode: 'BSP-10',
          onsiteTrainingOption: 'off',
          autoSendInvoiceEmailAfterCheckout: true,
          skipAutoPromoWhenNoExplicitCode: true,
        }),
      );
    });

    it('allows onsite training override when stored option is off', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([{ companyId: 'x' }]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        company: {
          id: 'x',
          corporationId: 'c',
          planId: 'plan-z',
          plan: { id: 'plan-z', planTypeId: 'monthly' },
          planSeat: { checkoutPromoCode: null, onsiteTrainingOption: 'off' },
        },
      });
      stripeService.createCheckoutSession.mockResolvedValue({
        success: true,
        message: 'ok',
        data: { url: 'https://x' },
      });

      await service.createCheckoutSessionForUser('u1', 'x', '2_days');

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          onsiteTrainingOption: '2_days',
        }),
      );
    });

    it('forces onsite off for one_time plan at checkout even when request asks training', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([{ companyId: 'x' }]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        company: {
          id: 'x',
          corporationId: 'c',
          planId: 'plan-ot',
          plan: { id: 'plan-ot', planTypeId: 'one_time' },
          planSeat: { checkoutPromoCode: null, onsiteTrainingOption: 'off' },
        },
      });
      stripeService.createCheckoutSession.mockResolvedValue({
        success: true,
        message: 'ok',
        data: { url: 'https://x', checkoutSessionId: 'cs_one_time' },
      });

      await service.createCheckoutSessionForUser('u1', 'x', '2_days', 3);

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          onsiteTrainingOption: 'off',
          assessmentQuantity: 3,
        }),
      );
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'x' },
        data: { lastCheckoutSessionId: 'cs_one_time' },
      });
    });

    it('requires assessment quantity for one_time checkout', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([{ companyId: 'x' }]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        company: {
          id: 'x',
          corporationId: 'c',
          planId: 'plan-ot',
          plan: { id: 'plan-ot', planTypeId: 'one_time' },
          planSeat: { checkoutPromoCode: null, onsiteTrainingOption: 'off' },
        },
      });

      await expect(
        service.createCheckoutSessionForUser('u1', 'x'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects onsite training override when stored option is already set', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([{ companyId: 'x' }]);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        company: {
          id: 'x',
          corporationId: 'c',
          planId: 'plan-z',
          plan: { id: 'plan-z', planTypeId: 'monthly' },
          planSeat: { checkoutPromoCode: null, onsiteTrainingOption: '1_day' },
        },
      });

      await expect(
        service.createCheckoutSessionForUser('u1', 'x', '2_days'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('company admin billing', () => {
    const billingRow = {
      companyId: 'target-co',
      companyName: 'Acme',
      canEdit: true,
      canCancelSubscription: true,
      canRetryPayment: false,
      canReinstateSubscription: false,
      subscriptionStatus: 'active',
    };

    beforeEach(() => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'target-co' },
      ]);
    });

    describe('resolveTargetCompanyIdForUser', () => {
      it('throws NotFoundException when user has no company access', async () => {
        prisma.userCompanyAccess.findMany.mockResolvedValue([]);
        await expect(
          service.resolveTargetCompanyIdForUser('u1'),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws BadRequestException when multiple companies and companyId omitted', async () => {
        prisma.userCompanyAccess.findMany.mockResolvedValue([
          { companyId: 'a' },
          { companyId: 'b' },
        ]);
        await expect(
          service.resolveTargetCompanyIdForUser('u1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws ForbiddenException when companyId is not allowed', async () => {
        await expect(
          service.resolveTargetCompanyIdForUser('u1', 'other-co'),
        ).rejects.toThrow(ForbiddenException);
      });

      it('resolves single company when companyId omitted', async () => {
        const id = await service.resolveTargetCompanyIdForUser('u1');
        expect(id).toBe('target-co');
      });

      it('trims and returns explicit allowed companyId', async () => {
        const id = await service.resolveTargetCompanyIdForUser(
          'u1',
          '  target-co  ',
        );
        expect(id).toBe('target-co');
      });
    });

    describe('getBillingForUser', () => {
      it('returns billing row with canEdit false', async () => {
        stripeService.getBillingRecordForAdmin.mockResolvedValue(billingRow);

        const row = await service.getBillingForUser('u1', 'target-co');

        expect(stripeService.getBillingRecordForAdmin).toHaveBeenCalledWith(
          'target-co',
        );
        expect(row).toMatchObject({
          companyId: 'target-co',
          canEdit: false,
          canCancelSubscription: true,
        });
      });

      it('throws NotFoundException when billing record missing', async () => {
        stripeService.getBillingRecordForAdmin.mockResolvedValue(null);
        await expect(
          service.getBillingForUser('u1', 'target-co'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('listBillingHistoryForUser', () => {
      it('delegates to stripe listBillingHistoryForAdmin', async () => {
        const history = {
          items: [],
          page: 1,
          limit: 20,
          totalCount: 0,
          hasNextPage: false,
        };
        stripeService.listBillingHistoryForAdmin.mockResolvedValue(history);

        const result = await service.listBillingHistoryForUser(
          'u1',
          'target-co',
          {
            page: 1,
            limit: 20,
            eventType: 'all',
            actorKind: 'all',
          },
        );

        expect(stripeService.listBillingHistoryForAdmin).toHaveBeenCalledWith(
          'target-co',
          { page: 1, limit: 20, eventType: 'all', actorKind: 'all' },
        );
        expect(result).toEqual(history);
      });
    });

    describe('cancelSubscriptionForUser', () => {
      it('resolves actor and cancels subscription for target company', async () => {
        const actor = {
          actorKind: 'company_admin' as const,
          actorCognitoSub: 'u1',
          actorName: 'Admin User',
          actorRole: 'Company Admin',
        };
        stripeService.resolveBillingSubscriptionActor.mockResolvedValue(actor);

        await service.cancelSubscriptionForUser(
          'u1',
          'target-co',
          { reason: 'Budget / economic pressures' },
          ['CompanyAdmin'],
        );

        expect(
          stripeService.resolveBillingSubscriptionActor,
        ).toHaveBeenCalledWith('u1', ['CompanyAdmin']);
        expect(
          stripeService.cancelCompanySubscriptionForAdmin,
        ).toHaveBeenCalledWith(
          'target-co',
          { reason: 'Budget / economic pressures' },
          actor,
        );
      });
    });

    describe('retryPaymentForUser', () => {
      it('retries payment for target company', async () => {
        await service.retryPaymentForUser('u1', 'target-co');

        expect(stripeService.retryCompanyPaymentForAdmin).toHaveBeenCalledWith(
          'target-co',
        );
      });
    });

    describe('reinstateSubscriptionForUser', () => {
      it('resolves actor and reinstates subscription for target company', async () => {
        const actor = {
          actorKind: 'company_admin' as const,
          actorCognitoSub: 'u1',
          actorName: 'Admin User',
          actorRole: 'Company Admin',
        };
        stripeService.resolveBillingSubscriptionActor.mockResolvedValue(actor);

        await service.reinstateSubscriptionForUser('u1', 'target-co', [
          'CompanyAdmin',
        ]);

        expect(
          stripeService.resolveBillingSubscriptionActor,
        ).toHaveBeenCalledWith('u1', ['CompanyAdmin']);
        expect(
          stripeService.reinstateCompanySubscriptionForAdmin,
        ).toHaveBeenCalledWith('target-co', actor);
      });
    });

    describe('requestPlanChangeForUser', () => {
      it('submits plan change support request with admin and billing context', async () => {
        stripeService.getBillingRecordForAdmin.mockResolvedValue({
          ...billingRow,
          planLabel: 'Growth Monthly',
          planLevel: '1-25 employees',
        });
        prisma.appUser.findFirst.mockResolvedValue({
          firstName: 'Jane',
          lastName: 'Admin',
          email: 'jane@example.com',
        });
        supportRequestService.submitPlanChangeRequest.mockResolvedValue({
          success: true,
          message: 'ok',
          data: { id: 'req-1' },
        });

        const result = await service.requestPlanChangeForUser(
          'u1',
          'target-co',
        );

        expect(
          supportRequestService.submitPlanChangeRequest,
        ).toHaveBeenCalledWith({
          adminEmail: 'jane@example.com',
          adminName: 'Jane Admin',
          companyName: 'Acme',
          currentPlan: 'Growth Monthly 1-25 employees',
        });
        expect(result.data).toEqual({ id: 'req-1' });
      });

      it('throws BadRequestException when admin email is missing', async () => {
        stripeService.getBillingRecordForAdmin.mockResolvedValue(billingRow);
        prisma.appUser.findFirst.mockResolvedValue({
          firstName: 'Jane',
          lastName: 'Admin',
          email: null,
        });

        await expect(
          service.requestPlanChangeForUser('u1', 'target-co'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('getInvoicePdfForUser', () => {
      it('returns PDF buffer for target company invoice', async () => {
        const pdf = Buffer.from('%PDF-1.4');
        stripeService.getInvoicePdfBufferForCompanyAdmin.mockResolvedValue(pdf);

        const result = await service.getInvoicePdfForUser(
          'u1',
          'target-co',
          'in_123',
        );

        expect(
          stripeService.getInvoicePdfBufferForCompanyAdmin,
        ).toHaveBeenCalledWith('in_123', 'target-co');
        expect(result).toBe(pdf);
      });
    });
  });
});
