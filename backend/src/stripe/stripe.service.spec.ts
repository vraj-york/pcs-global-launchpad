import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { CompanyService } from '../company/company.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma';
import { PROMO_CODE_INVALID_CHARSET_MSG } from '../promo/promo.constants';
import { StripeService } from './stripe.service';
import {
  CHECKOUT_SESSION_CREATED_MSG,
  STRIPE_CHECKOUT_MONTHLY_TRIAL_END_IN_PAST_MSG,
  STRIPE_CHECKOUT_MONTHLY_TRIAL_END_MISSING_MSG,
} from './stripe.constants';
import type { ListBillingRecordsQueryDto } from './dto/list-billing-records-query.dto';
import {
  mockCheckoutSessionsCreate,
  mockCustomersCreate,
  mockCustomersRetrieve,
  mockConstructEvent,
  mockInvoiceItemsCreate,
  mockInvoicesList,
  mockInvoicesRetrieve,
  mockInvoicesSendInvoice,
  mockInvoicesUpdate,
  mockInvoicesRetrieveUpcoming,
  mockPromotionCodesRetrieve,
  mockPricesRetrieve,
  mockEventsList,
  mockSubscriptionsList,
  mockSubscriptionsRetrieve,
  mockSubscriptionsUpdate,
} from './stripe-client.test-double';

jest.mock('stripe', () => {
  const { MockStripe } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory runs before ESM bindings; require loads MockStripe safely
    require('./stripe-client.test-double') as typeof import('./stripe-client.test-double');
  return { __esModule: true, default: MockStripe };
});

describe('StripeService', () => {
  let service: StripeService;
  let prisma: {
    corporation: { findUnique: jest.Mock };
    corporationCompany: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    userCompanyAccess: { findFirst: jest.Mock };
    pricingPlan: { findUnique: jest.Mock; findMany: jest.Mock };
    promoCode: { findFirst: jest.Mock; findMany: jest.Mock };
    planType: { findMany: jest.Mock };
    billingSubscriptionAction: { findMany: jest.Mock; create: jest.Mock };
    appUser: { findFirst: jest.Mock; update: jest.Mock };
  };
  let configGet: jest.Mock;
  let sendEmailWithPdfAttachments: jest.Mock;
  let syncEndUserAccessForSubscription: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    sendEmailWithPdfAttachments = jest.fn().mockResolvedValue(true);
    syncEndUserAccessForSubscription = jest.fn().mockResolvedValue(undefined);

    prisma = {
      corporation: { findUnique: jest.fn() },
      corporationCompany: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      userCompanyAccess: { findFirst: jest.fn() },
      pricingPlan: { findUnique: jest.fn(), findMany: jest.fn() },
      promoCode: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      planType: { findMany: jest.fn() },
      billingSubscriptionAction: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      appUser: { findFirst: jest.fn(), update: jest.fn() },
    };
    mockPromotionCodesRetrieve.mockResolvedValue({
      active: true,
      timesRedeemed: 0,
      maxRedemptions: null,
    });
    mockPricesRetrieve.mockResolvedValue({ unit_amount: 10000 });
    mockInvoiceItemsCreate.mockResolvedValue({ id: 'ii_test' });

    configGet = jest.fn((key: string) => {
      const env: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_abcdef123456',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
        STRIPE_CHECKOUT_SUCCESS_URL: 'https://app.example/success',
        STRIPE_CHECKOUT_CANCEL_URL: 'https://app.example/cancel',
        STRIPE_IMPLEMENTATION_FEE_PRICE_ID: 'price_implementation',
        STRIPE_ONSITE_TRAINING_PRICE_ID: 'price_onsite_per_day',
      };
      return env[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: configGet } },
        {
          provide: EmailService,
          useValue: { sendEmailWithPdfAttachments },
        },
        {
          provide: CompanyService,
          useValue: { syncEndUserAccessForSubscription },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    const corporationId = 'corp-1';
    const companyId = 'comp-1';
    const pricingPlanId = 'plan-1';

    it('throws ServiceUnavailableException when STRIPE_SECRET_KEY is missing', async () => {
      const configNoSecretKey = jest.fn((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return undefined;
        if (key === 'STRIPE_CHECKOUT_SUCCESS_URL')
          return 'https://app.example/success';
        if (key === 'STRIPE_CHECKOUT_CANCEL_URL')
          return 'https://app.example/cancel';
        return undefined;
      });

      const moduleNoKey: TestingModule = await Test.createTestingModule({
        providers: [
          StripeService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: { get: configNoSecretKey } },
          {
            provide: EmailService,
            useValue: {
              sendEmailWithPdfAttachments: jest.fn().mockResolvedValue(true),
            },
          },
          {
            provide: CompanyService,
            useValue: { syncEndUserAccessForSubscription },
          },
        ],
      }).compile();
      const svc = moduleNoKey.get<StripeService>(StripeService);

      await expect(
        svc.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws when success or cancel URL is missing', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_abcdef123456';
        return undefined;
      });

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when corporation does not exist', async () => {
      prisma.corporation.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when corporation is closed', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'CLOSED',
      });

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when company is missing', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when company already has active subscription', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_1',
        subscriptionStatus: 'active',
        appKeyContacts: [],
      });

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when pricing plan does not exist', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: null,
        subscriptionStatus: null,
        appKeyContacts: [],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates checkout session for one_time (individual) plan', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: null,
        subscriptionStatus: null,
        appKeyContacts: [],
        planSeat: { onsiteTrainingOption: 'off' },
      });
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        user: { email: 'admin@example.com' },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'one_time',
        stripePriceId: 'price_individual',
        employeeRangeMin: 1,
        employeeRangeMax: 1,
      });
      mockCustomersCreate.mockResolvedValue({ id: 'cus_one_time' });
      prisma.corporationCompany.update.mockResolvedValue({});
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_one_time',
      });

      const result = await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
        assessmentQuantity: 4,
      });

      expect(result.success).toBe(true);
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: [{ price: 'price_individual', quantity: 4 }],
          metadata: expect.objectContaining({
            includesImplementationFee: '0',
          }) as Record<string, unknown>,
          invoice_creation: expect.objectContaining({
            enabled: true,
          }) as Record<string, unknown>,
        }),
      );
      const createCalls = mockCheckoutSessionsCreate.mock.calls as Array<
        [Stripe.Checkout.SessionCreateParams]
      >;
      expect(createCalls[0]?.[0].subscription_data).toBeUndefined();
    });

    it('throws BadRequestException when stripe_price_id is missing', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        appKeyContacts: [],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: null,
      });

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates Stripe customer when missing and returns checkout URL', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: null,
        subscriptionStatus: null,
        appKeyContacts: [],
      });
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        user: { email: 'admin@example.com' },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 26,
        employeeRangeMax: 50,
      });
      mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
      prisma.corporationCompany.update.mockResolvedValue({});

      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      const result = await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(mockCustomersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@example.com',
          name: 'Acme',
        }),
      );
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: companyId },
        data: { stripeCustomerId: 'cus_new' },
      });
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            { price: 'price_abc', quantity: 50 },
            { price: 'price_implementation', quantity: 1 },
          ],
          allow_promotion_codes: true,
          metadata: expect.objectContaining({
            includesImplementationFee: '1',
          }) as Record<string, unknown>,
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe(CHECKOUT_SESSION_CREATED_MSG);
      expect(result.data).toEqual({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });
    });

    it('skips auto promo resolution when skipAutoPromoWhenNoExplicitCode and no explicit code', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: null,
        subscriptionStatus: null,
        appKeyContacts: [],
      });
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        user: { email: 'admin@example.com' },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 26,
        employeeRangeMax: 50,
      });
      mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
      prisma.corporationCompany.update.mockResolvedValue({});

      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      const result = await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
        skipAutoPromoWhenNoExplicitCode: true,
      });

      expect(prisma.promoCode.findMany).not.toHaveBeenCalled();
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            { price: 'price_abc', quantity: 50 },
            { price: 'price_implementation', quantity: 1 },
          ],
          allow_promotion_codes: true,
        }),
      );
      expect(result.success).toBe(true);
    });

    it('pre-applies company-scoped promo when auto-resolve finds one', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        appKeyContacts: [],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      prisma.promoCode.findMany.mockResolvedValueOnce([
        {
          id: 'promo-row',
          code: 'BSP10',
          planTypeId: 'monthly',
          limitToAssignment: true,
          corporationId,
          companyId,
          stripePromotionCodeId: 'promo_stripe_1',
          expiresAt: new Date(Date.now() + 86400000),
          discountType: 'percent',
          percentOff: new Prisma.Decimal(10),
          amountOffMinor: null,
          currency: null,
          createdAt: new Date('2025-01-01'),
        },
      ]);
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(mockPromotionCodesRetrieve).toHaveBeenCalledWith('promo_stripe_1');
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          discounts: [{ promotion_code: 'promo_stripe_1' }],
        }),
      );
      const checkoutCreateCalls = mockCheckoutSessionsCreate.mock
        .calls as Array<[Stripe.Checkout.SessionCreateParams]>;
      expect(checkoutCreateCalls[0]?.[0]).not.toHaveProperty(
        'allow_promotion_codes',
      );
    });

    it('pre-applies the company-scoped promo with the highest benefit when several match', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        appKeyContacts: [],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 10,
      });
      mockPricesRetrieve.mockResolvedValueOnce({ unit_amount: 1000 });
      prisma.promoCode.findMany.mockResolvedValueOnce([
        {
          id: 'promo-low',
          code: 'LOW10',
          planTypeId: 'monthly',
          limitToAssignment: true,
          corporationId,
          companyId,
          stripePromotionCodeId: 'promo_stripe_low',
          expiresAt: new Date(Date.now() + 86400000),
          discountType: 'percent',
          percentOff: new Prisma.Decimal(10),
          amountOffMinor: null,
          currency: null,
          createdAt: new Date('2025-01-01'),
        },
        {
          id: 'promo-high',
          code: 'HIGH25',
          planTypeId: 'monthly',
          limitToAssignment: true,
          corporationId,
          companyId,
          stripePromotionCodeId: 'promo_stripe_high',
          expiresAt: new Date(Date.now() + 86400000),
          discountType: 'percent',
          percentOff: new Prisma.Decimal(25),
          amountOffMinor: null,
          currency: null,
          createdAt: new Date('2025-01-02'),
        },
      ]);
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          discounts: [{ promotion_code: 'promo_stripe_high' }],
        }),
      );
    });

    it('throws BadRequestException when explicit promo code is unknown', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: null,
        subscriptionStatus: null,
        appKeyContacts: [],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      prisma.promoCode.findFirst.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
          promoCode: 'MISSING',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockCustomersCreate).not.toHaveBeenCalled();
      expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when explicit promo code has invalid characters', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: null,
        subscriptionStatus: null,
        appKeyContacts: [],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
          promoCode: 'BAD!',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: PROMO_CODE_INVALID_CHARSET_MSG,
        }) as Record<string, unknown>,
      });
      expect(prisma.promoCode.findFirst).not.toHaveBeenCalled();
      expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
    });

    it('uses Finance / Billing key contact email for new Stripe customer when present', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: null,
        subscriptionStatus: null,
        appKeyContacts: [{ email: 'finance@example.com' }],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      mockCustomersCreate.mockResolvedValue({ id: 'cus_fin' });
      prisma.corporationCompany.update.mockResolvedValue({});
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(prisma.userCompanyAccess.findFirst).not.toHaveBeenCalled();
      expect(mockCustomersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'finance@example.com',
        }),
      );
    });

    it('throws InternalServerErrorException when Stripe returns no URL', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: new Date(),
        appKeyContacts: [],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'annual',
        stripePriceId: 'price_abc',
      });
      mockCheckoutSessionsCreate.mockResolvedValue({ url: null });

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('skips implementation fee line item when already charged', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: new Date('2025-01-01'),
        appKeyContacts: [],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_abc', quantity: 25 }],
          metadata: expect.objectContaining({
            includesImplementationFee: '0',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('adds onsite training line item with quantity 1 when option is 1_day', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: new Date('2025-01-01'),
        appKeyContacts: [],
        planSeat: { onsiteTrainingOption: '1_day' },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            { price: 'price_abc', quantity: 25 },
            { price: 'price_onsite_per_day', quantity: 1 },
          ],
        }),
      );
    });

    it('submits line items in deterministic order: plan, implementation fee, onsite training (Stripe Checkout may re-sort the visible order by amount)', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: null,
        appKeyContacts: [],
        planSeat: { onsiteTrainingOption: '2_days' },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            { price: 'price_abc', quantity: 25 },
            { price: 'price_implementation', quantity: 1 },
            { price: 'price_onsite_per_day', quantity: 2 },
          ],
        }),
      );
    });

    it('adds onsite training line item with quantity 2 when option is 2_days', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: new Date('2025-01-01'),
        appKeyContacts: [],
        planSeat: { onsiteTrainingOption: '2_days' },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            { price: 'price_abc', quantity: 25 },
            { price: 'price_onsite_per_day', quantity: 2 },
          ],
        }),
      );
    });

    it('throws ServiceUnavailableException when implementation fee Price ID env is missing', async () => {
      configGet.mockImplementation((key: string) => {
        const env: Record<string, string | undefined> = {
          STRIPE_SECRET_KEY: 'sk_test_abcdef123456',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
          STRIPE_CHECKOUT_SUCCESS_URL: 'https://app.example/success',
          STRIPE_CHECKOUT_CANCEL_URL: 'https://app.example/cancel',
        };
        return env[key];
      });
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: null,
        appKeyContacts: [],
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
    });

    it('omits implementation and onsite from checkout for monthly trial; defers via metadata', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: null,
        appKeyContacts: [],
        planSeat: {
          onsiteTrainingOption: '2_days',
          zeroTrial: false,
          trialEndDate: new Date('2035-06-20T00:00:00.000Z'),
        },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_abc', quantity: 25 }],
          metadata: expect.objectContaining({
            includesImplementationFee: '0',
            deferImplementationFeePostTrial: '1',
            deferOnsiteTrainingPostTrial: '2_days',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('sets subscription_data.trial_end for monthly when zeroTrial is false and trial end is in the future', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      const trialEnd = new Date('2035-06-20T00:00:00.000Z');
      const expectedTrialEndUnix = Math.floor(
        Date.UTC(2035, 5, 20, 23, 59, 59) / 1000,
      );
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: new Date('2025-01-01'),
        appKeyContacts: [],
        planSeat: {
          onsiteTrainingOption: 'off',
          zeroTrial: false,
          trialEndDate: trialEnd,
        },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          subscription_data: expect.objectContaining({
            trial_end: expectedTrialEndUnix,
            metadata: expect.objectContaining({
              companyId,
              pricingPlanId,
            }) as Record<string, unknown>,
          }) as Record<string, unknown>,
        }),
      );
    });

    it('throws BadRequestException when monthly zeroTrial is false but trialEndDate is missing', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: new Date('2025-01-01'),
        appKeyContacts: [],
        planSeat: {
          onsiteTrainingOption: 'off',
          zeroTrial: false,
          trialEndDate: null,
        },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: STRIPE_CHECKOUT_MONTHLY_TRIAL_END_MISSING_MSG,
        }) as Record<string, unknown>,
      });
      expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when monthly trial end date is in the past', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: new Date('2025-01-01'),
        appKeyContacts: [],
        planSeat: {
          onsiteTrainingOption: 'off',
          zeroTrial: false,
          trialEndDate: new Date('2019-01-01T00:00:00.000Z'),
        },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });

      await expect(
        service.createCheckoutSession({
          corporationId,
          companyId,
          pricingPlanId,
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: STRIPE_CHECKOUT_MONTHLY_TRIAL_END_IN_PAST_MSG,
        }) as Record<string, unknown>,
      });
      expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
    });

    it('does not set subscription_data.trial_end for monthly when zeroTrial is true', async () => {
      prisma.corporation.findUnique.mockResolvedValue({
        id: corporationId,
        status: 'ACTIVE',
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: companyId,
        corporationId,
        legalName: 'Acme',
        stripeCustomerId: 'cus_x',
        subscriptionStatus: null,
        implementationFeeChargedAt: new Date('2025-01-01'),
        appKeyContacts: [],
        planSeat: {
          onsiteTrainingOption: 'off',
          zeroTrial: true,
          trialEndDate: new Date('2030-01-01T00:00:00.000Z'),
        },
      });
      prisma.pricingPlan.findUnique.mockResolvedValue({
        id: pricingPlanId,
        planTypeId: 'monthly',
        stripePriceId: 'price_abc',
        employeeRangeMin: 1,
        employeeRangeMax: 25,
      });
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
      });

      await service.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId,
      });

      const createCalls = mockCheckoutSessionsCreate.mock.calls as Array<
        [Stripe.Checkout.SessionCreateParams]
      >;
      expect(createCalls[0]?.[0].subscription_data?.trial_end).toBeUndefined();
    });
  });

  describe('createIndividualAppUserCheckoutSession', () => {
    const checkoutParams = {
      cognitoSub: 'sub-individual-1',
      email: 'individual@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      pricingPlanId: 'plan-individual',
      stripePriceId: 'price_individual_one_time',
      existingStripeCustomerId: 'cus_individual',
    };

    beforeEach(() => {
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_individual',
        url: 'https://checkout.stripe.com/pay/cs_individual',
      });
    });

    it('creates one-time payment checkout like company one_time plans', async () => {
      const result =
        await service.createIndividualAppUserCheckoutSession(checkoutParams);

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe(
        'https://checkout.stripe.com/pay/cs_individual',
      );
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          customer: 'cus_individual',
          line_items: [{ price: 'price_individual_one_time', quantity: 1 }],
          metadata: expect.objectContaining({
            checkoutType: 'individualAppUser',
            cognitoSub: 'sub-individual-1',
            pricingPlanId: 'plan-individual',
            autoSendInvoiceEmailAfterCheckout: '1',
          }) as Record<string, unknown>,
          invoice_creation: {
            enabled: true,
            invoice_data: {
              metadata: {
                checkoutType: 'individualAppUser',
                cognitoSub: 'sub-individual-1',
                pricingPlanId: 'plan-individual',
                autoSendInvoiceEmailAfterCheckout: '1',
              },
            },
          },
          allow_promotion_codes: true,
        }),
      );
      const createCalls = mockCheckoutSessionsCreate.mock.calls as Array<
        [Stripe.Checkout.SessionCreateParams]
      >;
      expect(createCalls[0]?.[0].subscription_data).toBeUndefined();
    });

    it('applies an explicit promotion code when provided', async () => {
      prisma.promoCode.findFirst.mockResolvedValue({
        id: 'promo-1',
        code: 'SAVE10',
        planTypeId: 'one_time',
        limitToAssignment: false,
        corporationId: null,
        companyId: null,
        stripePromotionCodeId: 'promo_stripe_1',
        expiresAt: null,
        discountType: 'percent',
        percentOff: 10,
        amountOffMinor: null,
        currency: 'usd',
        createdAt: new Date(),
      });

      await service.createIndividualAppUserCheckoutSession({
        ...checkoutParams,
        promoCode: 'SAVE10',
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          discounts: [{ promotion_code: 'promo_stripe_1' }],
        }),
      );
      const createCalls = mockCheckoutSessionsCreate.mock.calls as Array<
        [Stripe.Checkout.SessionCreateParams]
      >;
      expect(createCalls[0]?.[0].allow_promotion_codes).toBeUndefined();
    });
  });

  describe('handleWebhookEvent', () => {
    const payload = Buffer.from('{}');

    it('throws InternalServerErrorException when webhook secret missing', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'STRIPE_WEBHOOK_SECRET') return undefined;
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_abcdef123456';
        return undefined;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StripeService,
          { provide: PrismaService, useValue: prisma },
          { provide: ConfigService, useValue: { get: configGet } },
          {
            provide: EmailService,
            useValue: {
              sendEmailWithPdfAttachments: jest.fn().mockResolvedValue(true),
            },
          },
          {
            provide: CompanyService,
            useValue: { syncEndUserAccessForSubscription },
          },
        ],
      }).compile();
      const svc = module.get<StripeService>(StripeService);

      await expect(
        svc.handleWebhookEvent(payload, 'sig'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('throws BadRequestException when signature header missing', async () => {
      await expect(
        service.handleWebhookEvent(payload, undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when constructEvent fails', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('bad sig');
      });

      await expect(
        service.handleWebhookEvent(payload, 'sig'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('processes checkout.session.completed and updates company', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'subscription',
            metadata: { companyId: 'c1', pricingPlanId: 'p1' },
            subscription: 'sub_1',
            customer: 'cus_1',
          },
        },
      } as unknown as Stripe.Event);

      mockSubscriptionsRetrieve.mockResolvedValue({ status: 'active' });
      prisma.corporationCompany.update.mockResolvedValue({});

      const result = await service.handleWebhookEvent(payload, 'sig');

      expect(result).toEqual({ received: true });
      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_1');
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: {
          stripeCustomerId: 'cus_1',
          stripeSubscriptionId: 'sub_1',
          subscriptionStatus: 'active',
          planId: 'p1',
        },
      });
    });

    it('does not auto-send invoice email on checkout.session.completed (invoice.paid handles it)', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_1',
            mode: 'subscription',
            payment_status: 'paid',
            invoice: 'in_1',
            metadata: {
              companyId: 'c1',
              pricingPlanId: 'p1',
              autoSendInvoiceEmailAfterCheckout: '1',
            },
            subscription: 'sub_1',
            customer: 'cus_1',
          },
        },
      } as unknown as Stripe.Event);

      mockSubscriptionsRetrieve.mockResolvedValue({ status: 'active' });
      prisma.corporationCompany.update.mockResolvedValue({});
      const sendInvoiceSpy = jest
        .spyOn(
          service as unknown as {
            sendInvoiceForAdmin: (id: string) => Promise<void>;
          },
          'sendInvoiceForAdmin',
        )
        .mockResolvedValue(undefined);

      await service.handleWebhookEvent(payload, 'sig');

      expect(sendInvoiceSpy).not.toHaveBeenCalled();
    });

    it('creates deferred invoice items after subscription checkout when metadata requests defer', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_defer_1',
            mode: 'subscription',
            metadata: {
              companyId: 'c1',
              pricingPlanId: 'p1',
              deferImplementationFeePostTrial: '1',
              deferOnsiteTrainingPostTrial: 'off',
              includesImplementationFee: '0',
            },
            subscription: 'sub_1',
            customer: 'cus_1',
          },
        },
      } as unknown as Stripe.Event);

      mockSubscriptionsRetrieve.mockResolvedValue({ status: 'trialing' });
      prisma.corporationCompany.update.mockResolvedValue({});

      await service.handleWebhookEvent(payload, 'sig');

      expect(mockInvoiceItemsCreate).toHaveBeenCalledTimes(1);
      expect(mockInvoiceItemsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_1',
          subscription: 'sub_1',
          price: 'price_implementation',
          quantity: 1,
          metadata: expect.objectContaining({
            companyId: 'c1',
            bsp_deferred_fee: 'implementation',
          }) as Record<string, unknown>,
        }),
        expect.objectContaining({
          idempotencyKey: 'cs_defer_1:bsp-defer-implementation',
        }),
      );
    });

    it('sets implementationFeeChargedAt on invoice.paid when deferred implementation line is paid', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.paid',
        data: {
          object: { id: 'in_post_trial' },
        },
      } as unknown as Stripe.Event);

      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_post_trial',
        subscription: 'sub_trial_done',
        lines: {
          data: [
            {
              type: 'invoiceitem',
              invoice_item: {
                id: 'ii_impl',
                metadata: {
                  companyId: 'co-defer',
                  bsp_deferred_fee: 'implementation',
                },
              },
            },
          ],
        },
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: 'co-defer',
        implementationFeeChargedAt: null,
      });
      prisma.corporationCompany.update.mockResolvedValue({});

      await service.handleWebhookEvent(payload, 'sig');

      expect(mockInvoicesRetrieve).toHaveBeenCalledWith('in_post_trial', {
        expand: ['lines.data.invoice_item'],
      });
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'co-defer' },
        data: {
          implementationFeeChargedAt: expect.any(Date) as Date,
        },
      });
    });

    it('auto-sends company invoice email on invoice.paid for subscription renewals', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.paid',
        data: {
          object: { id: 'in_recurring' },
        },
      } as unknown as Stripe.Event);

      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_recurring',
        status: 'paid',
        subscription: 'sub_recurring',
        customer: 'cus_recurring',
        invoice_pdf: 'https://stripe.test/pdf',
        metadata: {},
        lines: { data: [] },
      });
      prisma.corporationCompany.findFirst.mockImplementation(
        (args: {
          where?: {
            stripeSubscriptionId?: string;
            id?: string;
            stripeCustomerId?: string;
          };
        }) => {
          if (args.where?.stripeSubscriptionId === 'sub_recurring') {
            return {
              id: 'co-recurring',
              implementationFeeChargedAt: new Date('2025-01-01'),
            };
          }
          if (args.where?.id === 'co-recurring') {
            return { id: 'co-recurring' };
          }
          if (args.where?.stripeCustomerId === 'cus_recurring') {
            return {
              id: 'co-recurring',
              appKeyContacts: [{ email: 'finance@example.com' }],
            };
          }
          return null;
        },
      );
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_recurring',
        status: 'active',
        metadata: { companyId: 'co-recurring' },
      });
      prisma.corporationCompany.updateMany.mockResolvedValue({ count: 1 });
      mockInvoicesUpdate.mockResolvedValue({});
      global.fetch = jest.fn() as unknown as typeof fetch;
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(bytes.buffer),
      });

      await service.handleWebhookEvent(payload, 'sig');

      expect(sendEmailWithPdfAttachments).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'finance@example.com',
        }),
      );
      expect(mockInvoicesUpdate).toHaveBeenCalledWith('in_recurring', {
        metadata: expect.objectContaining({
          companyInvoiceEmailSent: '1',
        }) as Record<string, unknown>,
      });
    });

    it('syncs subscription status on invoice.payment_failed', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_fail',
            subscription: 'sub_fail',
          },
        },
      } as unknown as Stripe.Event);

      mockSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_fail',
        status: 'past_due',
        metadata: { companyId: 'co-fail' },
      });
      prisma.corporationCompany.updateMany.mockResolvedValue({ count: 1 });

      await service.handleWebhookEvent(payload, 'sig');

      expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith('sub_fail');
      expect(prisma.corporationCompany.updateMany).toHaveBeenCalledWith({
        where: { id: 'co-fail' },
        data: {
          subscriptionStatus: 'past_due',
          stripeSubscriptionId: 'sub_fail',
        },
      });
    });

    it('processes checkout.session.completed for payment mode (one-time) without subscription', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            mode: 'payment',
            payment_status: 'paid',
            metadata: { companyId: 'c-ot', pricingPlanId: 'p-ot' },
            customer: 'cus_ot',
          },
        },
      } as unknown as Stripe.Event);

      prisma.corporationCompany.findUnique.mockResolvedValue({
        subscriptionStatus: null,
        lastCheckoutSessionId: null,
      });
      prisma.corporationCompany.update.mockResolvedValue({});

      const result = await service.handleWebhookEvent(payload, 'sig');

      expect(result).toEqual({ received: true });
      expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'c-ot' },
        data: {
          stripeCustomerId: 'cus_ot',
          stripeSubscriptionId: null,
          subscriptionStatus: 'active',
          planId: 'p-ot',
          assessmentQuantity: 1,
          lastCheckoutSessionId: undefined,
        },
      });
    });

    it('sends individual invoice email on invoice.paid for B2C checkout invoices', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.paid',
        data: {
          object: { id: 'in_individual' },
        },
      } as unknown as Stripe.Event);

      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_individual',
        status: 'paid',
        subscription: null,
        metadata: {
          checkoutType: 'individualAppUser',
          cognitoSub: 'sub-individual-1',
          autoSendInvoiceEmailAfterCheckout: '1',
        },
        collection_method: 'charge_automatically',
        invoice_pdf: 'https://stripe.test/pdf',
        number: 'INV-IND-1',
      });
      prisma.appUser.findFirst.mockResolvedValue({
        email: 'individual@example.com',
      });
      mockInvoicesUpdate.mockResolvedValue({});
      global.fetch = jest.fn() as unknown as typeof fetch;
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(bytes.buffer),
      });

      await service.handleWebhookEvent(payload, 'sig');

      expect(sendEmailWithPdfAttachments).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'individual@example.com',
        }),
      );
      expect(mockInvoicesUpdate).toHaveBeenCalledWith('in_individual', {
        metadata: expect.objectContaining({
          individualInvoiceEmailSent: '1',
        }) as Record<string, unknown>,
      });
      expect(prisma.corporationCompany.findFirst).not.toHaveBeenCalled();
    });

    it('sends individual invoice email via customer metadata when invoice metadata is sparse', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'invoice.paid',
        data: {
          object: { id: 'in_individual_meta' },
        },
      } as unknown as Stripe.Event);

      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_individual_meta',
        status: 'paid',
        subscription: null,
        customer: 'cus_individual',
        metadata: {},
        collection_method: 'charge_automatically',
        invoice_pdf: 'https://stripe.test/pdf',
        number: 'INV-IND-2',
      });
      mockCustomersRetrieve.mockResolvedValue({
        id: 'cus_individual',
        deleted: false,
        metadata: {
          checkoutType: 'individualAppUser',
          cognitoSub: 'sub-individual-2',
        },
      });
      prisma.appUser.findFirst.mockResolvedValue({
        email: 'sparse-meta@example.com',
      });
      mockInvoicesUpdate.mockResolvedValue({});
      global.fetch = jest.fn() as unknown as typeof fetch;
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(bytes.buffer),
      });

      await service.handleWebhookEvent(payload, 'sig');

      expect(sendEmailWithPdfAttachments).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'sparse-meta@example.com',
        }),
      );
    });

    it('activates individual user on checkout.session.completed without sending invoice email', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_individual',
            mode: 'payment',
            payment_status: 'paid',
            invoice: 'in_individual',
            customer: 'cus_individual',
            metadata: {
              checkoutType: 'individualAppUser',
              cognitoSub: 'sub-individual-1',
              pricingPlanId: 'plan-individual',
              autoSendInvoiceEmailAfterCheckout: '1',
            },
          },
        },
      } as unknown as Stripe.Event);

      prisma.appUser.findFirst.mockResolvedValue({
        paymentStatus: 'pending',
        email: 'individual@example.com',
        lastCheckoutSessionId: 'cs_individual',
      });
      prisma.appUser.update.mockResolvedValue({});

      await service.handleWebhookEvent(payload, 'sig');

      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-individual-1' },
        data: expect.objectContaining({
          paymentStatus: 'paid',
          status: 'Active',
        }) as Record<string, unknown>,
      });
      expect(sendEmailWithPdfAttachments).not.toHaveBeenCalled();
    });

    it('updates subscription by stripeSubscriptionId when metadata.companyId missing', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_99',
            status: 'past_due',
            metadata: {},
          },
        },
      } as unknown as Stripe.Event);

      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: 'row1',
        corporationId: 'corp',
      });
      prisma.corporationCompany.update.mockResolvedValue({});

      await service.handleWebhookEvent(payload, 'sig');

      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'row1' },
        data: { subscriptionStatus: 'past_due' },
      });
    });

    it('clears subscription on customer.subscription.deleted', async () => {
      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_del',
          },
        },
      } as unknown as Stripe.Event);

      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: 'row1',
        corporationId: 'corp',
      });
      prisma.corporationCompany.update.mockResolvedValue({});

      await service.handleWebhookEvent(payload, 'sig');

      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'row1' },
        data: {
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
        },
      });
      expect(syncEndUserAccessForSubscription).toHaveBeenCalledWith(
        'row1',
        'canceled',
      );
    });
  });

  describe('getInvoicePdfBufferForAdmin', () => {
    beforeEach(() => {
      mockInvoicesRetrieve.mockReset();
      global.fetch = jest.fn() as unknown as typeof fetch;
    });

    it('throws NotFoundException when invoice has no invoice_pdf', async () => {
      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_1',
        invoice_pdf: null,
      });

      await expect(
        service.getInvoicePdfBufferForAdmin('in_1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockInvoicesRetrieve).toHaveBeenCalledWith('in_1');
    });

    it('throws InternalServerErrorException when hosted PDF fetch is not OK', async () => {
      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_1',
        invoice_pdf: 'https://stripe.test/invoice/pdf',
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 502,
      });

      await expect(
        service.getInvoicePdfBufferForAdmin('in_1'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('returns buffer when hosted PDF fetch succeeds', async () => {
      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_1',
        invoice_pdf: 'https://stripe.test/invoice/pdf',
      });
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(bytes.buffer),
      });

      const buf = await service.getInvoicePdfBufferForAdmin('in_1');

      expect(Buffer.from(bytes).equals(buf)).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://stripe.test/invoice/pdf',
      );
    });
  });

  describe('assertInvoiceBelongsToCompany', () => {
    beforeEach(() => {
      mockInvoicesRetrieve.mockReset();
    });

    it('throws NotFoundException when company has no stripe customer', async () => {
      prisma.corporationCompany.findFirst.mockResolvedValue({
        stripeCustomerId: null,
      });

      await expect(
        service.assertInvoiceBelongsToCompany('in_1', 'comp-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockInvoicesRetrieve).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when invoice customer does not match', async () => {
      prisma.corporationCompany.findFirst.mockResolvedValue({
        stripeCustomerId: 'cus_company',
      });
      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_1',
        customer: 'cus_other',
      });

      await expect(
        service.assertInvoiceBelongsToCompany('in_1', 'comp-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('resolves when invoice belongs to company customer', async () => {
      prisma.corporationCompany.findFirst.mockResolvedValue({
        stripeCustomerId: 'cus_company',
      });
      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_1',
        customer: 'cus_company',
      });

      await expect(
        service.assertInvoiceBelongsToCompany('in_1', 'comp-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getInvoicePdfBufferForCompanyAdmin', () => {
    beforeEach(() => {
      mockInvoicesRetrieve.mockReset();
      global.fetch = jest.fn() as unknown as typeof fetch;
    });

    it('asserts ownership then returns PDF buffer', async () => {
      prisma.corporationCompany.findFirst.mockResolvedValue({
        stripeCustomerId: 'cus_company',
      });
      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_1',
        customer: 'cus_company',
        invoice_pdf: 'https://stripe.test/invoice/pdf',
      });
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(bytes.buffer),
      });

      const buf = await service.getInvoicePdfBufferForCompanyAdmin(
        'in_1',
        'comp-1',
      );

      expect(prisma.corporationCompany.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'comp-1',
            deletedAt: null,
            status: { not: 'SUSPENDED' },
          },
        }),
      );
      expect(Buffer.from(bytes).equals(buf)).toBe(true);
    });
  });

  describe('sendInvoiceForAdmin', () => {
    it('calls Stripe invoices.sendInvoice when collection_method is send_invoice and invoice is open', async () => {
      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_xyz',
        collection_method: 'send_invoice',
        status: 'open',
      });
      mockInvoicesSendInvoice.mockResolvedValue({});

      await service.sendInvoiceForAdmin('in_xyz');

      expect(mockInvoicesSendInvoice).toHaveBeenCalledWith('in_xyz');
      expect(sendEmailWithPdfAttachments).not.toHaveBeenCalled();
    });

    it('sends PDF via SES for paid send_invoice invoices (Checkout invoice_creation)', async () => {
      configGet.mockImplementation((key: string) => {
        const env: Record<string, string | undefined> = {
          STRIPE_SECRET_KEY: 'sk_test_abcdef123456',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
          STRIPE_CHECKOUT_SUCCESS_URL: 'https://app.example/success',
          STRIPE_CHECKOUT_CANCEL_URL: 'https://app.example/cancel',
          EMAIL_LOGO_URL: 'https://cdn.example.com/logo-email.png',
        };
        return env[key];
      });

      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_xyz',
        collection_method: 'send_invoice',
        status: 'paid',
        customer: 'cus_x',
        invoice_pdf: 'https://stripe.test/pdf',
        number: 'INV-9',
      });
      mockInvoicesSendInvoice.mockClear();
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(bytes.buffer),
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: 'comp-1',
        appKeyContacts: [{ email: 'finance@example.com' }],
      });

      await service.sendInvoiceForAdmin('in_xyz');

      expect(mockInvoicesSendInvoice).not.toHaveBeenCalled();
      expect(sendEmailWithPdfAttachments).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'finance@example.com',
        }),
      );
    });

    it('sends PDF via SES to Finance / Billing contact when collection_method is not send_invoice', async () => {
      const logoUrl = 'https://cdn.example.com/logo-email.png';
      const previousLogoUrl = process.env.EMAIL_LOGO_URL;
      process.env.EMAIL_LOGO_URL = logoUrl;
      try {
        configGet.mockImplementation((key: string) => {
          const env: Record<string, string | undefined> = {
            STRIPE_SECRET_KEY: 'sk_test_abcdef123456',
            STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
            STRIPE_CHECKOUT_SUCCESS_URL: 'https://app.example/success',
            STRIPE_CHECKOUT_CANCEL_URL: 'https://app.example/cancel',
          };
          return env[key];
        });

        mockInvoicesRetrieve.mockResolvedValue({
          id: 'in_xyz',
          collection_method: 'charge_automatically',
          customer: 'cus_x',
          invoice_pdf: 'https://stripe.test/pdf',
          number: 'INV-9',
        });
        mockInvoicesSendInvoice.mockClear();
        const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(bytes.buffer),
        });
        prisma.corporationCompany.findFirst.mockResolvedValue({
          id: 'comp-1',
          appKeyContacts: [{ email: 'finance@example.com' }],
        });

        await service.sendInvoiceForAdmin('in_xyz');

        expect(prisma.userCompanyAccess.findFirst).not.toHaveBeenCalled();
        expect(mockInvoicesSendInvoice).not.toHaveBeenCalled();
        /* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed loosely */
        expect(sendEmailWithPdfAttachments).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'finance@example.com',
            htmlBody: expect.stringContaining(logoUrl.split('/').pop()!),
            attachments: expect.arrayContaining([
              expect.objectContaining({
                filename: expect.stringContaining('invoice'),
              }),
            ]),
          }),
        );
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      } finally {
        process.env.EMAIL_LOGO_URL = previousLogoUrl;
      }
    });

    it('sends PDF via SES to company admin when no Finance / Billing contact', async () => {
      configGet.mockImplementation((key: string) => {
        const env: Record<string, string | undefined> = {
          STRIPE_SECRET_KEY: 'sk_test_abcdef123456',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
          STRIPE_CHECKOUT_SUCCESS_URL: 'https://app.example/success',
          STRIPE_CHECKOUT_CANCEL_URL: 'https://app.example/cancel',
          EMAIL_LOGO_URL: 'https://cdn.example.com/logo-email.png',
        };
        return env[key];
      });

      mockInvoicesRetrieve.mockResolvedValue({
        id: 'in_xyz',
        collection_method: 'charge_automatically',
        customer: 'cus_x',
        invoice_pdf: 'https://stripe.test/pdf',
        number: 'INV-9',
      });
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(bytes.buffer),
      });
      prisma.corporationCompany.findFirst.mockResolvedValue({
        id: 'comp-1',
        appKeyContacts: [],
      });
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        user: { email: 'admin@example.com' },
      });

      await service.sendInvoiceForAdmin('in_xyz');

      expect(prisma.userCompanyAccess.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: 'comp-1',
          isAdmin: true,
          user: { deletedAt: null },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          user: { select: { email: true } },
        },
      });
      expect(sendEmailWithPdfAttachments).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
        }),
      );
    });
  });

  describe('listInvoicesForAdmin', () => {
    it('sets planLabel from PlanType.name when PricingPlan matches line price id', async () => {
      mockInvoicesList.mockResolvedValue({
        data: [
          {
            id: 'in_1',
            number: 'INV-1',
            total: 100,
            currency: 'usd',
            status: 'paid',
            created: 1700000000,
            customer: 'cus_x',
            charge: { payment_method_details: { card: {} } },
            lines: {
              data: [
                {
                  price: { id: 'price_monthly', object: 'price' },
                },
              ],
            },
            invoice_pdf: null,
          },
        ],
        has_more: false,
      });
      prisma.pricingPlan.findMany.mockResolvedValue([
        {
          stripePriceId: 'price_monthly',
          planType: { id: 'monthly', name: 'BSP Blueprint (Monthly)' },
        },
      ]);
      prisma.corporationCompany.findMany.mockResolvedValue([
        {
          id: 'comp-1',
          stripeCustomerId: 'cus_x',
          legalName: 'Legal HQ',
          corporation: { dataResidencyRegion: 'North America' },
        },
      ]);

      const result = await service.listInvoicesForAdmin({
        limit: 10,
        status: 'all',
      });

      expect(prisma.pricingPlan.findMany).toHaveBeenCalledWith({
        where: { stripePriceId: { in: ['price_monthly'] } },
        select: {
          stripePriceId: true,
          planType: { select: { id: true, name: true } },
        },
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].planLabel).toBe('BSP Blueprint (Monthly)');
      expect(result.items[0].planTypeId).toBe('monthly');
      expect(result.items[0].companyOfficeName).toBe('Legal HQ');
      expect(result.items[0].displayId).toBe('INV-1');
    });

    it('omits invoices whose Stripe customer is not linked to corporationCompany', async () => {
      mockInvoicesList.mockResolvedValue({
        data: [
          {
            id: 'in_orphan',
            number: 'INV-orphan',
            total: 50,
            currency: 'usd',
            status: 'paid',
            created: 1700000000,
            customer: 'cus_not_in_db',
            charge: { payment_method_details: { card: {} } },
            lines: { data: [] },
            invoice_pdf: null,
          },
        ],
        has_more: false,
      });
      prisma.pricingPlan.findMany.mockResolvedValue([]);
      prisma.corporationCompany.findMany.mockResolvedValue([]);

      const result = await service.listInvoicesForAdmin({
        limit: 10,
        status: 'all',
      });

      expect(result.items).toHaveLength(0);
    });

    it('returns no items when company filter has no Stripe customer id', async () => {
      prisma.corporationCompany.findFirst.mockResolvedValue({
        stripeCustomerId: null,
      });

      const result = await service.listInvoicesForAdmin({
        limit: 10,
        status: 'all',
        companyId: 'comp-no-stripe',
      });

      expect(result.items).toEqual([]);
      expect(mockInvoicesList).not.toHaveBeenCalled();
    });

    it('uses last returned invoice id as nextStartingAfter when page fills mid-batch', async () => {
      const makeInvoice = (id: string, number: string) => ({
        id,
        number,
        total: 100,
        currency: 'usd',
        status: 'paid',
        created: 1700000000,
        customer: 'cus_x',
        charge: { payment_method_details: { card: {} } },
        lines: { data: [] },
        invoice_pdf: null,
      });

      mockInvoicesList.mockResolvedValue({
        data: Array.from({ length: 25 }, (_, i) =>
          makeInvoice(`in_${i + 1}`, `INV-${i + 1}`),
        ),
        has_more: false,
      });
      prisma.pricingPlan.findMany.mockResolvedValue([]);
      prisma.corporationCompany.findMany.mockResolvedValue([
        {
          id: 'comp-1',
          stripeCustomerId: 'cus_x',
          legalName: 'Legal HQ',
          corporation: { dataResidencyRegion: 'North America' },
        },
      ]);

      const page1 = await service.listInvoicesForAdmin({
        limit: 20,
        status: 'all',
      });

      expect(page1.items).toHaveLength(20);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextStartingAfter).toBe('in_20');

      mockInvoicesList.mockResolvedValue({
        data: Array.from({ length: 5 }, (_, i) =>
          makeInvoice(`in_${i + 21}`, `INV-${i + 21}`),
        ),
        has_more: false,
      });

      const page2 = await service.listInvoicesForAdmin({
        limit: 20,
        status: 'all',
        startingAfter: page1.nextStartingAfter ?? undefined,
      });

      expect(mockInvoicesList).toHaveBeenLastCalledWith(
        expect.objectContaining({ starting_after: 'in_20' }),
      );
      expect(page2.items).toHaveLength(5);
      expect(page2.items[0]?.id).toBe('in_21');
      expect(page2.hasMore).toBe(false);
    });

    it('filters by search query on invoice number and company legal name', async () => {
      mockInvoicesList.mockResolvedValue({
        data: [
          {
            id: 'in_match',
            number: 'INV-ACME-1',
            total: 100,
            currency: 'usd',
            status: 'paid',
            created: 1700000000,
            customer: 'cus_x',
            charge: { payment_method_details: { card: {} } },
            lines: { data: [] },
            invoice_pdf: null,
          },
          {
            id: 'in_other',
            number: 'INV-OTHER-9',
            total: 200,
            currency: 'usd',
            status: 'paid',
            created: 1699000000,
            customer: 'cus_y',
            charge: { payment_method_details: { card: {} } },
            lines: { data: [] },
            invoice_pdf: null,
          },
        ],
        has_more: false,
      });
      prisma.pricingPlan.findMany.mockResolvedValue([]);
      prisma.corporationCompany.findMany.mockResolvedValue([
        {
          id: 'comp-1',
          stripeCustomerId: 'cus_x',
          legalName: 'Acme Legal',
          corporation: { dataResidencyRegion: 'North America' },
        },
        {
          id: 'comp-2',
          stripeCustomerId: 'cus_y',
          legalName: 'Beta Corp',
          corporation: { dataResidencyRegion: 'Europe' },
        },
      ]);

      const byInvoice = await service.listInvoicesForAdmin({
        limit: 10,
        status: 'all',
        search: 'acme-1',
      });
      expect(byInvoice.items).toHaveLength(1);
      expect(byInvoice.items[0]?.displayId).toBe('INV-ACME-1');

      const byCompany = await service.listInvoicesForAdmin({
        limit: 10,
        status: 'all',
        search: 'beta',
      });
      expect(byCompany.items).toHaveLength(1);
      expect(byCompany.items[0]?.companyOfficeName).toBe('Beta Corp');
    });
  });

  describe('Super Admin billing', () => {
    const billingCompanyRow = () => ({
      id: 'comp-billing-1',
      companyCode: 1,
      legalName: 'Acme Legal' as string | null,
      dbaName: 'Acme DBA' as string | null,
      subscriptionStatus: 'active',
      stripeSubscriptionId: 'sub_billing_1' as string | null,
      stripeCustomerId: 'cus_billing_1' as string | null,
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      assessmentQuantity: null as number | null,
      plan: {
        employeeRangeMin: 1,
        employeeRangeMax: 25,
        price: undefined as Prisma.Decimal | undefined,
        planType: { id: 'monthly', name: 'BSP Blueprint' },
      },
      planSeat: null as {
        planPrice: Prisma.Decimal;
        discount: Prisma.Decimal;
        invoiceAmount: Prisma.Decimal;
      } | null,
      corporation: { dataResidencyRegion: 'North America' },
    });

    const mockSubscriptionPayload = (
      overrides: Record<string, unknown> = {},
    ) => ({
      id: 'sub_billing_1',
      status: 'active',
      cancel_at_period_end: false,
      current_period_end: 1780272000,
      currency: 'usd',
      latest_invoice: {
        status: 'paid',
        payment_intent: null,
      },
      default_payment_method: {
        type: 'card',
      },
      items: {
        data: [
          {
            quantity: 1,
            price: { unit_amount: 9900, currency: 'usd' },
          },
        ],
      },
      ...overrides,
    });

    const mockListBillingCompanies = (
      companies: ReturnType<typeof billingCompanyRow>[],
    ) => {
      prisma.corporationCompany.findMany
        .mockResolvedValueOnce(companies)
        .mockResolvedValueOnce([]);
    };

    beforeEach(() => {
      mockInvoicesList.mockResolvedValue({ data: [] });
      mockSubscriptionsRetrieve.mockReset();
      mockSubscriptionsList.mockReset();
      mockInvoicesRetrieveUpcoming.mockReset();
    });

    describe('getBillingPlanFilterOptions', () => {
      it('returns plan types ordered by name', async () => {
        prisma.planType.findMany.mockResolvedValue([
          { id: 'annual', name: 'Annual' },
          { id: 'monthly', name: 'Monthly' },
        ]);

        const result = await service.getBillingPlanFilterOptions();

        expect(prisma.planType.findMany).toHaveBeenCalledWith({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        });
        expect(result).toEqual([
          { value: 'annual', label: 'Annual' },
          { value: 'monthly', label: 'Monthly' },
        ]);
      });
    });

    describe('listBillingRecordsForAdmin', () => {
      const buildBillingListQuery = (
        overrides: Partial<ListBillingRecordsQueryDto> = {},
      ): ListBillingRecordsQueryDto => ({
        page: 1,
        limit: 10,
        subscriptionStatus: 'all',
        paymentStatus: 'all',
        sortOrder: 'asc',
        ...overrides,
      });

      it('uses null billing id, plan seat amount, and null payment type without Stripe customer', async () => {
        mockListBillingCompanies([
          {
            ...billingCompanyRow(),
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            planSeat: {
              planPrice: new Prisma.Decimal('149.50'),
              discount: new Prisma.Decimal('0'),
              invoiceAmount: new Prisma.Decimal('149.50'),
            },
          },
        ]);

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery(),
        );

        expect(result.items).toHaveLength(1);
        expect(result.items[0].billingId).toBeNull();
        expect(result.items[0].companyName).toBe('Acme DBA');
        expect(result.items[0].planLabel).toBe('BSP Blueprint');
        expect(result.items[0].planTypeId).toBe('monthly');
        expect(result.items[0].billingCycle).toBe('Monthly');
        expect(result.items[0].nextBillingAmountCents).toBe(14950);
        expect(result.items[0].paymentType).toBeNull();
        expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
      });

      it('marks one_time paid checkout as paid without a Stripe subscription', async () => {
        mockInvoicesList.mockResolvedValue({
          data: [{ number: 'INV-OT-1', status: 'paid' }],
        });
        mockSubscriptionsList.mockResolvedValue({ data: [] });
        mockListBillingCompanies([
          {
            ...billingCompanyRow(),
            stripeSubscriptionId: null,
            plan: {
              employeeRangeMin: 1,
              employeeRangeMax: 1,
              price: new Prisma.Decimal('299.00'),
              planType: { id: 'one_time', name: 'BSP Assessment (Individual)' },
            },
          },
        ]);

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery(),
        );

        expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
        expect(mockInvoicesList).toHaveBeenCalledWith({
          customer: 'cus_billing_1',
          limit: 1,
          expand: ['data.payment_intent'],
        });
        expect(result.items[0].planTypeId).toBe('one_time');
        expect(result.items[0].paymentStatus).toBe('paid');
        expect(result.items[0].inconsistentBillingState).toBe(false);
        expect(result.items[0].oneTimePaymentCents).toBe(29900);
      });

      it('computes one_time invoice amount from assessment quantity when no subscription', async () => {
        mockInvoicesList.mockResolvedValue({ data: [] });
        mockSubscriptionsList.mockResolvedValue({ data: [] });
        mockListBillingCompanies([
          {
            ...billingCompanyRow(),
            stripeSubscriptionId: null,
            assessmentQuantity: 10,
            plan: {
              employeeRangeMin: 1,
              employeeRangeMax: 1,
              price: new Prisma.Decimal('195.00'),
              planType: { id: 'one_time', name: 'BSP Assessment (Individual)' },
            },
            planSeat: {
              planPrice: new Prisma.Decimal('195'),
              discount: new Prisma.Decimal('19.5'),
              invoiceAmount: new Prisma.Decimal('175.5'),
            },
          },
        ]);

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery(),
        );

        expect(result.items[0].nextBillingAmountCents).toBe(175500);
      });

      it('prefers latest Stripe invoice amount for one_time checkout', async () => {
        mockInvoicesList.mockResolvedValue({
          data: [
            {
              number: 'INV-OT-2',
              status: 'paid',
              amount_paid: 180000,
              currency: 'usd',
            },
          ],
        });
        mockSubscriptionsList.mockResolvedValue({ data: [] });
        mockListBillingCompanies([
          {
            ...billingCompanyRow(),
            stripeSubscriptionId: null,
            assessmentQuantity: 10,
            plan: {
              employeeRangeMin: 1,
              employeeRangeMax: 1,
              price: new Prisma.Decimal('195.00'),
              planType: { id: 'one_time', name: 'BSP Assessment (Individual)' },
            },
            planSeat: {
              planPrice: new Prisma.Decimal('195'),
              discount: new Prisma.Decimal('19.5'),
              invoiceAmount: new Prisma.Decimal('175.5'),
            },
          },
        ]);

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery(),
        );

        expect(result.items[0].nextBillingAmountCents).toBe(180000);
      });

      it('uses Stripe invoice number and upcoming invoice total when subscription exists', async () => {
        mockInvoicesList.mockResolvedValue({
          data: [{ number: 'INV-2026-42' }],
        });
        mockSubscriptionsRetrieve.mockResolvedValue(
          mockSubscriptionPayload() as never,
        );
        mockInvoicesRetrieveUpcoming.mockResolvedValue({
          total: 12000,
          currency: 'usd',
        });
        mockListBillingCompanies([billingCompanyRow()]);

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery(),
        );

        expect(mockInvoicesList).toHaveBeenCalledWith({
          customer: 'cus_billing_1',
          limit: 1,
        });
        expect(mockInvoicesRetrieveUpcoming).toHaveBeenCalledWith({
          customer: 'cus_billing_1',
          subscription: 'sub_billing_1',
        });
        expect(result.items[0].billingId).toBe('INV-2026-42');
        expect(result.items[0].nextBillingAmountCents).toBe(12000);
        expect(result.items[0].paymentType).toBe('cc');
        expect(result.items[0].renewalDate).toBe('2026-06-01');
      });

      it('falls back to Stripe customer id when invoice has no number', async () => {
        mockInvoicesList.mockResolvedValue({ data: [{ number: '  ' }] });
        mockSubscriptionsRetrieve.mockResolvedValue(
          mockSubscriptionPayload() as never,
        );
        mockInvoicesRetrieveUpcoming.mockRejectedValue(
          new Error('no upcoming'),
        );
        mockListBillingCompanies([billingCompanyRow()]);

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery(),
        );

        expect(result.items[0].billingId).toBe('cus_billing_1');
        expect(result.items[0].nextBillingAmountCents).toBe(9900);
      });

      it('resolves subscription via Stripe list when company row has no subscription id', async () => {
        mockSubscriptionsList.mockResolvedValue({
          data: [{ id: 'sub_from_list' }],
        });
        mockSubscriptionsRetrieve.mockResolvedValue(
          mockSubscriptionPayload({
            id: 'sub_from_list',
            default_payment_method: { type: 'us_bank_account' },
          }) as never,
        );
        mockInvoicesRetrieveUpcoming.mockResolvedValue({
          total: 8000,
          currency: 'usd',
        });
        mockListBillingCompanies([
          {
            ...billingCompanyRow(),
            stripeSubscriptionId: null,
          },
        ]);

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery(),
        );

        expect(mockSubscriptionsList).toHaveBeenCalledWith({
          customer: 'cus_billing_1',
          status: 'all',
          limit: 1,
        });
        expect(result.items[0].paymentType).toBe('ach');
        expect(result.items[0].nextBillingAmountCents).toBe(8000);
      });

      it('applies search filter on company legal name and DBA only', async () => {
        mockListBillingCompanies([]);

        await service.listBillingRecordsForAdmin(
          buildBillingListQuery({ search: 'Acme' }),
        );

        expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              AND: expect.arrayContaining([
                {
                  OR: [
                    { legalName: { contains: 'Acme', mode: 'insensitive' } },
                    { dbaName: { contains: 'Acme', mode: 'insensitive' } },
                  ],
                },
              ]) as Prisma.CorporationCompanyWhereInput['AND'],
            }) as Prisma.CorporationCompanyWhereInput,
          }),
        );
      });

      it('excludes null payment type when filtering for cc only', async () => {
        mockListBillingCompanies([
          {
            ...billingCompanyRow(),
            id: 'comp-no-pm',
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          },
          billingCompanyRow(),
        ]);
        mockSubscriptionsRetrieve.mockResolvedValue(
          mockSubscriptionPayload({
            default_payment_method: { type: 'card' },
          }) as never,
        );
        mockInvoicesRetrieveUpcoming.mockResolvedValue({
          total: 100,
          currency: 'usd',
        });

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery({ paymentTypes: 'cc' }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.items[0].paymentType).toBe('cc');
      });

      it('paginates and sorts enriched rows', async () => {
        mockListBillingCompanies([
          {
            ...billingCompanyRow(),
            companyCode: 2,
            legalName: 'Beta Corp',
            dbaName: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          },
          {
            ...billingCompanyRow(),
            companyCode: 1,
            legalName: 'Alpha Corp',
            dbaName: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          },
        ]);

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery({
            page: 1,
            limit: 1,
            sortBy: 'companyName',
            sortOrder: 'asc',
          }),
        );

        expect(result.items).toHaveLength(1);
        expect(result.items[0].companyName).toBe('Alpha Corp');
        expect(result.totalCount).toBe(2);
        expect(result.hasNextPage).toBe(true);
      });

      it('canceled filter includes ended subscriptions and cancel-at-period-end still active in Stripe', async () => {
        mockListBillingCompanies([
          {
            ...billingCompanyRow(),
            id: 'comp-ended',
            companyCode: 1,
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: 'sub_ended',
          },
          {
            ...billingCompanyRow(),
            id: 'comp-cancel-at-end',
            companyCode: 2,
            subscriptionStatus: 'active',
            stripeSubscriptionId: 'sub_scheduled',
          },
        ]);
        mockSubscriptionsRetrieve.mockImplementation((subId: string) => {
          if (subId === 'sub_ended') {
            return Promise.resolve(
              mockSubscriptionPayload({
                id: 'sub_ended',
                status: 'canceled',
                cancel_at_period_end: false,
                latest_invoice: { status: 'paid', payment_intent: null },
              }),
            );
          }
          if (subId === 'sub_scheduled') {
            return Promise.resolve(
              mockSubscriptionPayload({
                id: 'sub_scheduled',
                status: 'active',
                cancel_at_period_end: true,
                latest_invoice: { status: 'paid', payment_intent: null },
              }),
            );
          }
          return Promise.reject(new Error(`unexpected sub ${subId}`));
        });
        mockInvoicesRetrieveUpcoming.mockRejectedValue(new Error('skip'));

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery({ subscriptionStatus: 'canceled' }),
        );

        expect(result.totalCount).toBe(2);
        expect(result.items.map((r) => r.companyId).sort()).toEqual([
          'comp-cancel-at-end',
          'comp-ended',
        ]);
        const scheduled = result.items.find(
          (r) => r.companyId === 'comp-cancel-at-end',
        );
        expect(scheduled?.subscriptionStatus).toBe('canceled');
        expect(scheduled?.cancelAtPeriodEnd).toBe(true);
      });

      it('active filter excludes cancel-at-period-end subscriptions', async () => {
        mockListBillingCompanies([billingCompanyRow()]);
        mockSubscriptionsRetrieve.mockResolvedValue(
          mockSubscriptionPayload({
            status: 'active',
            cancel_at_period_end: true,
            latest_invoice: { status: 'paid', payment_intent: null },
          }) as never,
        );
        mockInvoicesRetrieveUpcoming.mockRejectedValue(new Error('skip'));

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery({ subscriptionStatus: 'active' }),
        );

        expect(result.totalCount).toBe(0);
        expect(result.items).toHaveLength(0);
      });

      it('trialing filter matches Stripe-enriched status when DB row is stale', async () => {
        mockListBillingCompanies([
          {
            ...billingCompanyRow(),
            id: 'comp-trial',
            companyCode: 2,
            subscriptionStatus: 'active',
            stripeSubscriptionId: 'sub_trial',
          },
        ]);
        mockSubscriptionsRetrieve.mockResolvedValue(
          mockSubscriptionPayload({
            id: 'sub_trial',
            status: 'trialing',
            cancel_at_period_end: false,
            latest_invoice: { status: 'paid', payment_intent: null },
          }) as never,
        );
        mockInvoicesRetrieveUpcoming.mockRejectedValue(new Error('skip'));

        const result = await service.listBillingRecordsForAdmin(
          buildBillingListQuery({ subscriptionStatus: 'trialing' }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].companyId).toBe('comp-trial');
        expect(result.items[0].subscriptionStatus).toBe('trialing');
      });
    });

    describe('listBillingHistoryForAdmin', () => {
      it('returns empty list when company has no Stripe customer', async () => {
        prisma.corporationCompany.findFirst.mockResolvedValue({
          stripeCustomerId: null,
        });

        const result = await service.listBillingHistoryForAdmin('comp-1', {
          page: 1,
          limit: 20,
          eventType: 'all',
          actorKind: 'all',
        });

        expect(result.items).toEqual([]);
        expect(mockEventsList).not.toHaveBeenCalled();
      });

      it('maps Stripe events with Stripe event ids and paginates', async () => {
        prisma.corporationCompany.findFirst.mockResolvedValue({
          stripeCustomerId: 'cus_billing_1',
        });
        prisma.pricingPlan.findMany.mockResolvedValue([
          {
            stripePriceId: 'price_monthly',
            planType: { id: 'monthly', name: 'BSP Blueprint' },
          },
        ]);
        mockEventsList.mockResolvedValue({
          data: [
            {
              id: 'evt_1',
              type: 'customer.subscription.created',
              created: 1735689600,
              data: {
                object: {
                  customer: 'cus_billing_1',
                  currency: 'usd',
                  items: {
                    data: [
                      { price: { id: 'price_monthly', unit_amount: 9900 } },
                    ],
                  },
                },
              },
            },
            {
              id: 'evt_2',
              type: 'invoice.paid',
              created: 1735776000,
              data: {
                object: {
                  customer: 'cus_billing_1',
                  currency: 'usd',
                  amount_paid: 9900,
                  lines: {
                    data: [{ price: { id: 'price_monthly' } }],
                  },
                },
              },
            },
            {
              id: 'evt_other',
              type: 'invoice.paid',
              created: 1735776000,
              data: {
                object: {
                  customer: 'cus_other',
                  currency: 'usd',
                  amount_paid: 100,
                  lines: { data: [] },
                },
              },
            },
          ],
          has_more: false,
        });

        const result = await service.listBillingHistoryForAdmin(
          'comp-billing-1',
          {
            page: 1,
            limit: 20,
            eventType: 'all',
            actorKind: 'all',
          },
        );

        expect(result.totalCount).toBe(2);
        expect(result.items).toHaveLength(2);
        expect(result.items[0]?.eventType).toBe('payment_successful');
        expect(result.items[0]?.eventId).toBe('evt_2');
        expect(result.items[1]?.eventType).toBe('subscription_created');
        expect(result.items[1]?.eventId).toBe('evt_1');
        expect(result.items[0]?.planLabel).toBe('BSP Blueprint');
      });
    });

    describe('getBillingRecordForAdmin', () => {
      it('returns null when company is not found', async () => {
        prisma.corporationCompany.findFirst.mockResolvedValue(null);

        const row = await service.getBillingRecordForAdmin('missing');

        expect(row).toBeNull();
      });

      it('returns enriched billing row for a company', async () => {
        prisma.corporationCompany.findFirst.mockResolvedValue(
          billingCompanyRow(),
        );
        mockSubscriptionsRetrieve.mockResolvedValue(
          mockSubscriptionPayload() as never,
        );
        mockInvoicesRetrieveUpcoming.mockResolvedValue({
          total: 5000,
          currency: 'usd',
        });

        const row = await service.getBillingRecordForAdmin('comp-billing-1');

        expect(row).not.toBeNull();
        expect(row?.companyId).toBe('comp-billing-1');
        expect(row?.nextBillingAmountCents).toBe(5000);
        expect(row?.planLevel).toBe('1-25 employees');
        expect(row?.canCancelSubscription).toBe(true);
      });
    });

    describe('billing row action flags (Figma menus)', () => {
      const loadRowWithSubscription = async (
        subOverrides: Record<string, unknown>,
      ) => {
        prisma.corporationCompany.findFirst.mockResolvedValue(
          billingCompanyRow(),
        );
        mockSubscriptionsRetrieve.mockResolvedValue(
          mockSubscriptionPayload(subOverrides) as never,
        );
        mockInvoicesRetrieveUpcoming.mockRejectedValue(new Error('skip'));
        return service.getBillingRecordForAdmin('comp-billing-1');
      };

      it('active + paid: Edit and Cancel Subscription only', async () => {
        const row = await loadRowWithSubscription({
          status: 'active',
          latest_invoice: { status: 'paid', payment_intent: null },
        });

        expect(row?.subscriptionStatus).toBe('active');
        expect(row?.paymentStatus).toBe('paid');
        expect(row?.canEdit).toBe(true);
        expect(row?.canCancelSubscription).toBe(true);
        expect(row?.canRetryPayment).toBe(false);
        expect(row?.canReinstateSubscription).toBe(false);
      });

      it('active + failed: Edit, Retry Payment, and Cancel Subscription', async () => {
        const row = await loadRowWithSubscription({
          status: 'active',
          latest_invoice: {
            status: 'open',
            payment_intent: { status: 'requires_payment_method' },
          },
        });

        expect(row?.paymentStatus).toBe('failed');
        expect(row?.canEdit).toBe(true);
        expect(row?.canRetryPayment).toBe(true);
        expect(row?.canCancelSubscription).toBe(true);
        expect(row?.canReinstateSubscription).toBe(false);
      });

      it('canceled (ended): no Edit or Reinstate', async () => {
        const row = await loadRowWithSubscription({
          status: 'canceled',
          latest_invoice: { status: 'paid', payment_intent: null },
        });

        expect(row?.subscriptionStatus).toBe('canceled');
        expect(row?.canEdit).toBe(false);
        expect(row?.canReinstateSubscription).toBe(false);
        expect(row?.canCancelSubscription).toBe(false);
        expect(row?.canRetryPayment).toBe(false);
      });

      it('active + cancel at period end: Reinstate, not Cancel', async () => {
        const row = await loadRowWithSubscription({
          status: 'active',
          cancel_at_period_end: true,
          latest_invoice: { status: 'paid', payment_intent: null },
        });

        expect(row?.cancelAtPeriodEnd).toBe(true);
        expect(row?.subscriptionStatus).toBe('canceled');
        expect(row?.canEdit).toBe(true);
        expect(row?.canCancelSubscription).toBe(false);
        expect(row?.canReinstateSubscription).toBe(true);
      });
    });

    describe('cancelCompanySubscriptionForAdmin', () => {
      it('schedules cancel at period end instead of immediate cancel', async () => {
        prisma.corporationCompany.findFirst.mockResolvedValue({
          stripeSubscriptionId: 'sub_billing_1',
        });
        mockSubscriptionsRetrieve.mockResolvedValue({
          id: 'sub_billing_1',
          status: 'active',
          cancel_at_period_end: false,
        });
        mockSubscriptionsUpdate.mockResolvedValue({
          id: 'sub_billing_1',
          cancel_at_period_end: true,
        });

        const actor = {
          actorKind: 'super_admin' as const,
          actorCognitoSub: 'sub-admin',
          actorName: 'Test Admin',
          actorRole: 'Super Admin',
        };
        jest.spyOn(service, 'getBillingRecordForAdmin').mockResolvedValue({
          companyId: 'comp-billing-1',
          planLabel: 'BSP (Monthly)',
          planTypeId: 'monthly',
          nextBillingAmountCents: 1000,
          nextBillingCurrency: 'usd',
        } as never);

        await service.cancelCompanySubscriptionForAdmin(
          'comp-billing-1',
          { reason: 'Other', additionalNotes: 'note' },
          actor,
        );

        expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_billing_1', {
          cancel_at_period_end: true,
        });
        expect(prisma.billingSubscriptionAction.create).toHaveBeenCalled();
      });
    });

    describe('reinstateCompanySubscriptionForAdmin', () => {
      it('clears cancel_at_period_end on the Stripe subscription', async () => {
        prisma.corporationCompany.findFirst.mockResolvedValue({
          stripeSubscriptionId: 'sub_billing_1',
        });
        mockSubscriptionsRetrieve.mockResolvedValue({
          id: 'sub_billing_1',
          status: 'active',
          cancel_at_period_end: true,
        });
        mockSubscriptionsUpdate.mockResolvedValue({
          id: 'sub_billing_1',
          cancel_at_period_end: false,
        });
        jest.spyOn(service, 'getBillingRecordForAdmin').mockResolvedValue({
          companyId: 'comp-billing-1',
          planLabel: 'BSP (Monthly)',
          planTypeId: 'monthly',
          nextBillingAmountCents: 1000,
          nextBillingCurrency: 'usd',
        } as never);

        const actor = {
          actorKind: 'super_admin' as const,
          actorCognitoSub: 'sub-admin',
          actorName: 'Test Admin',
          actorRole: 'Super Admin',
        };
        await service.reinstateCompanySubscriptionForAdmin(
          'comp-billing-1',
          actor,
        );

        expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_billing_1', {
          cancel_at_period_end: false,
        });
        expect(prisma.billingSubscriptionAction.create).toHaveBeenCalled();
      });
    });
  });
});
