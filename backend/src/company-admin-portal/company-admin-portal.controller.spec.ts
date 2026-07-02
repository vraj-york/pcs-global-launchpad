import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompanyAdminPortalController } from './company-admin-portal.controller';
import { CompanyAdminPortalService } from './company-admin-portal.service';
import { AuthorizationGuard, CognitoAuthGuard } from '../auth';

describe('CompanyAdminPortalController', () => {
  let controller: CompanyAdminPortalController;
  let portalService: {
    getOnboardingReview: jest.Mock;
    createCheckoutSessionForUser: jest.Mock;
    getBillingForUser: jest.Mock;
    listBillingHistoryForUser: jest.Mock;
    cancelSubscriptionForUser: jest.Mock;
    retryPaymentForUser: jest.Mock;
    reinstateSubscriptionForUser: jest.Mock;
    getInvoicePdfForUser: jest.Mock;
    requestPlanChangeForUser: jest.Mock;
  };

  beforeEach(async () => {
    portalService = {
      getOnboardingReview: jest.fn(),
      createCheckoutSessionForUser: jest.fn(),
      getBillingForUser: jest.fn(),
      listBillingHistoryForUser: jest.fn(),
      cancelSubscriptionForUser: jest.fn(),
      retryPaymentForUser: jest.fn(),
      reinstateSubscriptionForUser: jest.fn(),
      getInvoicePdfForUser: jest.fn(),
      requestPlanChangeForUser: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [CompanyAdminPortalController],
      providers: [
        { provide: CompanyAdminPortalService, useValue: portalService },
      ],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(CompanyAdminPortalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOnboardingReview', () => {
    it('returns success envelope with companies', async () => {
      const payload = {
        companies: [
          {
            companyId: 'c1',
            corporationId: 'corp-1',
            hasActiveSubscription: false,
            subscriptionStatus: null,
            corporation: {
              legalName: 'P',
              ownershipType: 'PRIVATE',
              dataResidencyRegion: 'US',
            },
            company: {
              legalName: 'Co',
              dbaName: null,
              website: null,
              companyType: 'LLC',
              officeType: 'HQ',
              industry: 'Tech',
              phoneNo: null,
              addressFormatted: 'Addr',
            },
            planSummary: null,
            canCheckout: false,
          },
        ],
      };
      portalService.getOnboardingReview.mockResolvedValue(payload);

      const result = await controller.getOnboardingReview({
        sub: 'user-sub-1',
      });

      expect(portalService.getOnboardingReview).toHaveBeenCalledWith(
        'user-sub-1',
      );
      expect(result).toEqual({
        success: true,
        message: 'Onboarding review loaded',
        data: payload,
      });
    });

    it('rethrows NotFoundException from service', async () => {
      portalService.getOnboardingReview.mockRejectedValue(
        new NotFoundException('No company access'),
      );
      await expect(
        controller.getOnboardingReview({ sub: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCheckoutSession', () => {
    it('passes sub and body companyId to service', async () => {
      const stripePayload = {
        success: true,
        message: 'Checkout created',
        data: { url: 'https://checkout.test/session' },
      };
      portalService.createCheckoutSessionForUser.mockResolvedValue(
        stripePayload,
      );

      const result = await controller.createCheckoutSession(
        { sub: 'sub-a' },
        { companyId: 'company-b' },
      );

      expect(portalService.createCheckoutSessionForUser).toHaveBeenCalledWith(
        'sub-a',
        'company-b',
        undefined,
        undefined,
      );
      expect(result).toEqual(stripePayload);
    });

    it('allows omitting companyId', async () => {
      const stripePayload = {
        success: true,
        message: 'ok',
        data: { url: 'https://u' },
      };
      portalService.createCheckoutSessionForUser.mockResolvedValue(
        stripePayload,
      );

      const result = await controller.createCheckoutSession(
        { sub: 'sub-only' },
        {},
      );

      expect(portalService.createCheckoutSessionForUser).toHaveBeenCalledWith(
        'sub-only',
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(stripePayload);
    });
  });

  describe('getBilling', () => {
    it('returns billing row for company admin', async () => {
      const row = {
        companyId: 'c1',
        companyName: 'Co',
        subscriptionStatus: 'active',
      };
      portalService.getBillingForUser.mockResolvedValue(row);

      const result = await controller.getBilling(
        { sub: 'sub-a' },
        { companyId: 'c1' },
      );

      expect(portalService.getBillingForUser).toHaveBeenCalledWith(
        'sub-a',
        'c1',
      );
      expect(result).toEqual({
        success: true,
        message: 'Billing record fetched successfully',
        data: row,
      });
    });
  });

  describe('listBillingHistory', () => {
    it('passes companyId and history query to service', async () => {
      const history = {
        items: [{ eventId: 'evt_1' }],
        page: 1,
        limit: 20,
        totalCount: 1,
        hasNextPage: false,
      };
      portalService.listBillingHistoryForUser.mockResolvedValue(history);

      const result = await controller.listBillingHistory(
        { sub: 'sub-a' },
        {
          companyId: 'c1',
          page: 1,
          limit: 20,
          eventType: 'all',
          actorKind: 'all',
        },
      );

      expect(portalService.listBillingHistoryForUser).toHaveBeenCalledWith(
        'sub-a',
        'c1',
        { page: 1, limit: 20, eventType: 'all', actorKind: 'all' },
      );
      expect(result).toEqual({
        success: true,
        message: 'Billing history fetched successfully',
        data: history,
      });
    });
  });

  describe('cancelSubscription', () => {
    it('schedules cancellation and returns ok envelope', async () => {
      portalService.cancelSubscriptionForUser.mockResolvedValue(undefined);

      const result = await controller.cancelSubscription(
        { sub: 'sub-a', groups: ['CompanyAdmin'] },
        { companyId: 'c1' },
        { reason: 'Administrative' },
      );

      expect(portalService.cancelSubscriptionForUser).toHaveBeenCalledWith(
        'sub-a',
        'c1',
        { reason: 'Administrative' },
        ['CompanyAdmin'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Subscription set to cancel at period end',
        data: { ok: true },
      });
    });
  });

  describe('retryPayment', () => {
    it('retries payment and returns ok envelope', async () => {
      portalService.retryPaymentForUser.mockResolvedValue(undefined);

      const result = await controller.retryPayment(
        { sub: 'sub-a' },
        { companyId: 'c1' },
      );

      expect(portalService.retryPaymentForUser).toHaveBeenCalledWith(
        'sub-a',
        'c1',
      );
      expect(result).toEqual({
        success: true,
        message: 'Payment retry attempted',
        data: { ok: true },
      });
    });
  });

  describe('reinstateSubscription', () => {
    it('reinstates subscription and returns ok envelope', async () => {
      portalService.reinstateSubscriptionForUser.mockResolvedValue(undefined);

      const result = await controller.reinstateSubscription(
        { sub: 'sub-a', groups: ['CompanyAdmin'] },
        { companyId: 'c1' },
      );

      expect(portalService.reinstateSubscriptionForUser).toHaveBeenCalledWith(
        'sub-a',
        'c1',
        ['CompanyAdmin'],
      );
      expect(result).toEqual({
        success: true,
        message: 'Scheduled subscription cancellation removed',
        data: { ok: true },
      });
    });
  });

  describe('requestPlanChange', () => {
    it('submits plan change request and returns success envelope', async () => {
      portalService.requestPlanChangeForUser.mockResolvedValue({
        success: true,
        message:
          'Your request has been submitted. Our team will contact you shortly to discuss your subscription options.',
        data: { id: 'req-1' },
      });

      const result = await controller.requestPlanChange(
        { sub: 'sub-a' },
        { companyId: 'c1' },
      );

      expect(portalService.requestPlanChangeForUser).toHaveBeenCalledWith(
        'sub-a',
        'c1',
      );
      expect(result).toEqual({
        success: true,
        message:
          'Your request has been submitted. Our team will contact you shortly to discuss your subscription options.',
        data: { id: 'req-1' },
      });
    });
  });

  describe('getInvoicePdf', () => {
    it('returns StreamableFile for invoice PDF', async () => {
      const buffer = Buffer.from('%PDF');
      portalService.getInvoicePdfForUser.mockResolvedValue(buffer);

      const file = await controller.getInvoicePdf(
        { sub: 'sub-a' },
        { companyId: 'c1' },
        'in_abc',
      );

      expect(portalService.getInvoicePdfForUser).toHaveBeenCalledWith(
        'sub-a',
        'c1',
        'in_abc',
      );
      expect(file.getHeaders().type).toBe('application/pdf');
    });
  });
});
