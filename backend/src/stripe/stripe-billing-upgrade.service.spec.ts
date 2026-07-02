import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CompanyService } from '../company/company.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma';
import { StripeService } from './stripe.service';
import {
  FINANCE_BILLING_UPGRADE_INACTIVE_SUBSCRIPTION_MSG,
  FINANCE_BILLING_UPGRADE_NO_CURRENT_PLAN_MSG,
  FINANCE_BILLING_UPGRADE_NO_PAYMENT_METHOD_MSG,
  FINANCE_BILLING_UPGRADE_SUBSCRIPTION_CANCELED_MSG,
} from './stripe-billing-upgrade.constants';
import {
  mockCustomersCreateBalanceTransaction,
  mockCustomersRetrieve,
  mockInvoicesCreatePreview,
  mockInvoicesPay,
  mockInvoicesRetrieve,
  mockInvoicesList,
  mockPaymentMethodsList,
  mockPricesRetrieve,
  mockSubscriptionsCreate,
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

const annualPlan = {
  id: 'plan-annual-25',
  planTypeId: 'annual',
  customerType: 'company',
  employeeRangeMin: 1,
  employeeRangeMax: 25,
  price: { toString: () => '1200' },
  stripePriceId: 'price_annual_25',
  isCustomPricing: false,
  planType: { id: 'annual', name: 'Annual' },
};

const monthlyPlan = {
  id: 'plan-monthly-100',
  planTypeId: 'monthly',
  customerType: 'company',
  employeeRangeMin: 76,
  employeeRangeMax: 100,
  price: { toString: () => '500' },
  stripePriceId: 'price_monthly_100',
  isCustomPricing: false,
  planType: { id: 'monthly', name: 'Monthly' },
};

const oneTimeIndividualPlan = {
  id: 'plan-one-time-individual',
  planTypeId: 'one_time',
  customerType: 'individual',
  employeeRangeMin: null,
  employeeRangeMax: null,
  price: { toString: () => '195' },
  stripePriceId: 'price_one_time',
  isCustomPricing: false,
  planType: { id: 'one_time', name: 'BSP Assessment (Individual)' },
};

describe('StripeService billing upgrade edge cases', () => {
  let service: StripeService;
  let prisma: {
    corporationCompany: { findFirst: jest.Mock; update: jest.Mock };
    pricingPlan: { findFirst: jest.Mock; findMany: jest.Mock };
    assessment: { count: jest.Mock };
    billingSubscriptionAction: { create: jest.Mock };
    companyPlanSeat: { update: jest.Mock };
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPricesRetrieve.mockResolvedValue({ unit_amount: 500, currency: 'usd' });
    mockPaymentMethodsList.mockResolvedValue({ data: [] });
    mockSubscriptionsList.mockResolvedValue({ data: [] });
    mockInvoicesList.mockResolvedValue({ data: [] });

    prisma = {
      corporationCompany: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      pricingPlan: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([monthlyPlan]),
      },
      assessment: { count: jest.fn().mockResolvedValue(0) },
      billingSubscriptionAction: { create: jest.fn().mockResolvedValue({}) },
      companyPlanSeat: { update: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'STRIPE_SECRET_KEY' ? 'sk_test_abcdef123456' : undefined,
          },
        },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: CompanyService,
          useValue: { syncEndUserAccessForSubscription: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(StripeService);

    jest.spyOn(service, 'getBillingRecordForAdmin').mockResolvedValue({
      companyId: 'comp-1',
      companyName: 'Acme',
      subscriptionStatus: 'active',
      planLabel: 'Annual',
      planTypeId: 'annual',
      currentPeriodStart: '2026-01-01',
      currentPeriodEnd: '2027-01-01',
    } as never);
    jest
      .spyOn(service as never, 'sendPlanUpgradeNotificationEmail')
      .mockResolvedValue(undefined);
  });

  it('throws NotFound when company does not exist', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue(null);

    await expect(
      service.getBillingUpgradeOptionsForAdmin('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when company has no current plan', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      subscriptionStatus: 'active',
      plan: null,
    });

    await expect(
      service.getBillingUpgradeOptionsForAdmin('comp-1'),
    ).rejects.toThrow(FINANCE_BILLING_UPGRADE_NO_CURRENT_PLAN_MSG);
  });

  it('throws when recurring subscription status is canceled in DB', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      subscriptionStatus: 'canceled',
      plan: annualPlan,
    });

    await expect(
      service.getBillingUpgradeOptionsForAdmin('comp-1'),
    ).rejects.toThrow(FINANCE_BILLING_UPGRADE_INACTIVE_SUBSCRIPTION_MSG);
  });

  it('returns upgrade options for one-time individual source plan', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: null,
      plan: oneTimeIndividualPlan,
    });
    prisma.pricingPlan.findMany.mockResolvedValue([annualPlan, monthlyPlan]);

    const options = await service.getBillingUpgradeOptionsForAdmin('comp-1');

    expect(options.current.pricingPlanId).toBe(oneTimeIndividualPlan.id);
    expect(
      options.allowedTargets.map((target) => target.pricingPlanId),
    ).toEqual([annualPlan.id, monthlyPlan.id]);
    expect(options.oneTimeCreditEligible).toBe(true);
    expect(options.oneTimePaymentCents).toBe(19500);
  });

  it('preview includes next billing amount from target plan price', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      legalName: 'Acme',
      dbaName: null,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: annualPlan,
      planSeat: null,
    });
    prisma.pricingPlan.findFirst.mockResolvedValue(monthlyPlan);
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      currency: 'usd',
      items: { data: [{ id: 'si_1' }] },
    });
    mockInvoicesCreatePreview.mockResolvedValue({
      amount_due: 50000,
      currency: 'usd',
      lines: { data: [] },
    });

    const preview = await service.previewBillingUpgradeForAdmin(
      'comp-1',
      monthlyPlan.id,
    );

    expect(preview.nextBillingAmountCents).toBe(50000);
  });

  it('preview falls back to plan list price when Stripe price has no unit_amount', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      legalName: 'Acme',
      dbaName: null,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: annualPlan,
      planSeat: null,
    });
    prisma.pricingPlan.findFirst.mockResolvedValue(monthlyPlan);
    mockPricesRetrieve.mockResolvedValue({
      unit_amount: null,
      currency: 'usd',
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      currency: 'usd',
      items: { data: [{ id: 'si_1' }] },
    });
    mockInvoicesCreatePreview.mockResolvedValue({
      amount_due: 50000,
      currency: 'usd',
      lines: { data: [] },
    });

    const preview = await service.previewBillingUpgradeForAdmin(
      'comp-1',
      monthlyPlan.id,
    );

    expect(preview.nextBillingAmountCents).toBe(50000);
  });

  it('preview rejects canceled Stripe subscription', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      legalName: 'Acme',
      dbaName: null,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: annualPlan,
      planSeat: null,
    });
    prisma.pricingPlan.findFirst.mockResolvedValue(monthlyPlan);
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_1',
      status: 'canceled',
      currency: 'usd',
      items: { data: [{ id: 'si_1' }] },
    });

    await expect(
      service.previewBillingUpgradeForAdmin('comp-1', monthlyPlan.id),
    ).rejects.toThrow(FINANCE_BILLING_UPGRADE_SUBSCRIPTION_CANCELED_MSG);
  });

  it('reverses one-time credit when Stripe subscription create fails', async () => {
    const companyRow = {
      id: 'comp-1',
      legalName: 'Acme',
      dbaName: null,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: oneTimeIndividualPlan,
      planSeat: null,
    };
    prisma.corporationCompany.findFirst.mockResolvedValue(companyRow);
    prisma.pricingPlan.findFirst.mockResolvedValue(monthlyPlan);
    mockInvoicesCreatePreview.mockResolvedValue({
      amount_due: 50000,
      currency: 'usd',
      lines: { data: [] },
    });
    mockCustomersRetrieve.mockResolvedValue({
      deleted: false,
      invoice_settings: { default_payment_method: 'pm_1' },
    });
    mockCustomersCreateBalanceTransaction.mockResolvedValue({});
    mockSubscriptionsCreate.mockRejectedValue(new Error('card declined'));

    await expect(
      service.applyBillingUpgradeForAdmin('comp-1', monthlyPlan.id, {
        actorKind: 'super_admin',
        actorCognitoSub: 'sub-1',
        actorName: 'Admin',
        actorRole: 'Super Admin',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockCustomersCreateBalanceTransaction).toHaveBeenCalledTimes(2);
    expect(mockCustomersCreateBalanceTransaction).toHaveBeenNthCalledWith(
      2,
      'cus_1',
      expect.objectContaining({
        amount: expect.any(Number) as number,
        description: 'Reversal: plan upgrade could not be completed',
      }),
    );
    expect(prisma.corporationCompany.update).not.toHaveBeenCalled();
  });

  it('apply upgrade uses subscription default payment method when customer invoice default is missing', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      legalName: 'Acme',
      dbaName: null,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: annualPlan,
      planSeat: null,
    });
    prisma.pricingPlan.findFirst.mockResolvedValue(monthlyPlan);
    mockSubscriptionsRetrieve
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        items: { data: [{ id: 'si_1' }] },
      })
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        default_payment_method: 'pm_sub',
        items: { data: [{ id: 'si_1' }] },
      })
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        items: { data: [{ id: 'si_1' }] },
      });
    mockInvoicesCreatePreview.mockResolvedValue({
      amount_due: 50000,
      currency: 'usd',
      lines: { data: [] },
    });
    mockCustomersRetrieve.mockResolvedValue({
      deleted: false,
      invoice_settings: { default_payment_method: null },
    });
    mockSubscriptionsUpdate.mockResolvedValue({
      id: 'sub_1',
      current_period_end: 1_800_000_000,
      latest_invoice: 'inv_1',
    });
    mockInvoicesRetrieve.mockResolvedValue({
      status: 'paid',
      amount_due: 0,
    });
    mockInvoicesPay.mockResolvedValue({});

    const result = await service.applyBillingUpgradeForAdmin(
      'comp-1',
      monthlyPlan.id,
      {
        actorKind: 'super_admin',
        actorCognitoSub: 'sub-1',
        actorName: 'Admin',
        actorRole: 'Super Admin',
      },
    );

    expect(result.ok).toBe(true);
    expect(mockPaymentMethodsList).not.toHaveBeenCalled();
    expect(prisma.corporationCompany.update).toHaveBeenCalled();
  });

  it('apply upgrade uses subscription from Stripe list when DB subscription id is missing', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      legalName: 'Acme',
      dbaName: null,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: null,
      plan: annualPlan,
      planSeat: null,
    });
    prisma.pricingPlan.findFirst.mockResolvedValue(monthlyPlan);
    mockSubscriptionsList
      .mockResolvedValueOnce({ data: [{ id: 'sub_1' }] })
      .mockResolvedValueOnce({
        data: [{ id: 'sub_1', default_payment_method: 'pm_sub' }],
      });
    mockSubscriptionsRetrieve
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        items: { data: [{ id: 'si_1' }] },
      })
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        default_payment_method: 'pm_sub',
        items: { data: [{ id: 'si_1' }] },
      })
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        items: { data: [{ id: 'si_1' }] },
      });
    mockInvoicesCreatePreview.mockResolvedValue({
      amount_due: 50000,
      currency: 'usd',
      lines: { data: [] },
    });
    mockCustomersRetrieve.mockResolvedValue({
      deleted: false,
      invoice_settings: { default_payment_method: null },
    });
    mockSubscriptionsUpdate.mockResolvedValue({
      id: 'sub_1',
      current_period_end: 1_800_000_000,
      latest_invoice: 'inv_1',
    });
    mockInvoicesRetrieve.mockResolvedValue({
      status: 'paid',
      amount_due: 0,
    });

    const result = await service.applyBillingUpgradeForAdmin(
      'comp-1',
      monthlyPlan.id,
      {
        actorKind: 'super_admin',
        actorCognitoSub: 'sub-1',
        actorName: 'Admin',
        actorRole: 'Super Admin',
      },
    );

    expect(result.ok).toBe(true);
    expect(mockSubscriptionsList).toHaveBeenCalled();
    expect(prisma.corporationCompany.update).toHaveBeenCalled();
  });

  it('apply upgrade uses recent invoice payment method when no defaults are set', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      legalName: 'Acme',
      dbaName: null,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: annualPlan,
      planSeat: null,
    });
    prisma.pricingPlan.findFirst.mockResolvedValue(monthlyPlan);
    mockSubscriptionsRetrieve
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        items: { data: [{ id: 'si_1' }] },
      })
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        default_payment_method: null,
        items: { data: [{ id: 'si_1' }] },
      })
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        items: { data: [{ id: 'si_1' }] },
      });
    mockSubscriptionsList.mockResolvedValue({
      data: [{ id: 'sub_1', default_payment_method: null }],
    });
    mockInvoicesCreatePreview.mockResolvedValue({
      amount_due: 50000,
      currency: 'usd',
      lines: { data: [] },
    });
    mockCustomersRetrieve.mockResolvedValue({
      deleted: false,
      invoice_settings: { default_payment_method: null },
    });
    mockInvoicesList.mockResolvedValue({
      data: [
        {
          payment_intent: { payment_method: 'pm_invoice' },
        },
      ],
    });
    mockSubscriptionsUpdate.mockResolvedValue({
      id: 'sub_1',
      current_period_end: 1_800_000_000,
      latest_invoice: 'inv_1',
    });
    mockInvoicesRetrieve.mockResolvedValue({
      status: 'paid',
      amount_due: 0,
    });

    const result = await service.applyBillingUpgradeForAdmin(
      'comp-1',
      monthlyPlan.id,
      {
        actorKind: 'super_admin',
        actorCognitoSub: 'sub-1',
        actorName: 'Admin',
        actorRole: 'Super Admin',
      },
    );

    expect(result.ok).toBe(true);
    expect(mockInvoicesList).toHaveBeenCalled();
    expect(prisma.corporationCompany.update).toHaveBeenCalled();
  });

  it('apply upgrade uses attached customer payment method when no defaults are set', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      legalName: 'Acme',
      dbaName: null,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: annualPlan,
      planSeat: null,
    });
    prisma.pricingPlan.findFirst.mockResolvedValue(monthlyPlan);
    mockSubscriptionsRetrieve
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        items: { data: [{ id: 'si_1' }] },
      })
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        default_payment_method: null,
        items: { data: [{ id: 'si_1' }] },
      })
      .mockResolvedValueOnce({
        id: 'sub_1',
        status: 'active',
        currency: 'usd',
        items: { data: [{ id: 'si_1' }] },
      });
    mockInvoicesCreatePreview.mockResolvedValue({
      amount_due: 50000,
      currency: 'usd',
      lines: { data: [] },
    });
    mockCustomersRetrieve.mockResolvedValue({
      deleted: false,
      invoice_settings: { default_payment_method: null },
    });
    mockPaymentMethodsList.mockResolvedValue({ data: [{ id: 'pm_attached' }] });
    mockSubscriptionsUpdate.mockResolvedValue({
      id: 'sub_1',
      current_period_end: 1_800_000_000,
      latest_invoice: 'inv_1',
    });
    mockInvoicesRetrieve.mockResolvedValue({
      status: 'paid',
      amount_due: 0,
    });
    mockInvoicesPay.mockResolvedValue({});

    const result = await service.applyBillingUpgradeForAdmin(
      'comp-1',
      monthlyPlan.id,
      {
        actorKind: 'super_admin',
        actorCognitoSub: 'sub-1',
        actorName: 'Admin',
        actorRole: 'Super Admin',
      },
    );

    expect(result.ok).toBe(true);
    expect(mockPaymentMethodsList).toHaveBeenCalledWith({
      customer: 'cus_1',
      limit: 1,
    });
    expect(prisma.corporationCompany.update).toHaveBeenCalled();
  });

  it('apply upgrade rejects when no payment method can be resolved', async () => {
    prisma.corporationCompany.findFirst.mockResolvedValue({
      id: 'comp-1',
      legalName: 'Acme',
      dbaName: null,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      plan: annualPlan,
      planSeat: null,
    });
    prisma.pricingPlan.findFirst.mockResolvedValue(monthlyPlan);
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      currency: 'usd',
      default_payment_method: null,
      items: { data: [{ id: 'si_1' }] },
    });
    mockSubscriptionsList.mockResolvedValue({
      data: [{ id: 'sub_1', default_payment_method: null }],
    });
    mockInvoicesCreatePreview.mockResolvedValue({
      amount_due: 50000,
      currency: 'usd',
      lines: { data: [] },
    });
    mockCustomersRetrieve.mockResolvedValue({
      deleted: false,
      invoice_settings: { default_payment_method: null },
    });
    mockPaymentMethodsList.mockResolvedValue({ data: [] });

    await expect(
      service.applyBillingUpgradeForAdmin('comp-1', monthlyPlan.id, {
        actorKind: 'super_admin',
        actorCognitoSub: 'sub-1',
        actorName: 'Admin',
        actorRole: 'Super Admin',
      }),
    ).rejects.toThrow(FINANCE_BILLING_UPGRADE_NO_PAYMENT_METHOD_MSG);

    expect(prisma.corporationCompany.update).not.toHaveBeenCalled();
  });
});
