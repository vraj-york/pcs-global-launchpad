import { Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';
import { ListBillingRecordsQueryDto } from './dto/list-billing-records-query.dto';
import {
  FINANCE_BILLING_CANCEL_SCHEDULED_MSG,
  FINANCE_BILLING_PLAN_OPTIONS_FETCHED_MSG,
  FINANCE_BILLING_HISTORY_FETCHED_MSG,
  FINANCE_BILLING_RECORD_FETCHED_MSG,
  FINANCE_BILLING_RECORDS_FETCHED_MSG,
  FINANCE_BILLING_REINSTATE_SUCCESS_MSG,
  FINANCE_BILLING_RETRY_ATTEMPTED_MSG,
  FINANCE_BILLING_UPGRADE_APPLIED_MSG,
  FINANCE_BILLING_UPGRADE_OPTIONS_FETCHED_MSG,
  FINANCE_BILLING_UPGRADE_PREVIEW_FETCHED_MSG,
  FINANCE_COMPANIES_FETCHED_MSG,
  FINANCE_INVOICES_FETCHED_MSG,
  FINANCE_INVOICES_SENT_MSG,
} from './stripe.constants';
import { StripeFinanceController } from './stripe-finance.controller';
import { StripeService } from './stripe.service';
import type { BillingAdminListItem } from './stripe-billing-admin.types';
import type { InvoiceAdminListResult } from './stripe-admin-invoice.types';

const mockFinanceUser = { sub: 'user-sub', groups: ['SuperAdmin'] };

describe('StripeFinanceController', () => {
  let controller: StripeFinanceController;
  let stripeService: {
    getCompaniesWithStripeCustomerForRequester: jest.Mock;
    listInvoicesForRequester: jest.Mock;
    getInvoicePdfBufferForRequester: jest.Mock;
    getInvoicesZipBufferForRequester: jest.Mock;
    sendInvoiceForRequester: jest.Mock;
    bulkSendInvoicesForRequester: jest.Mock;
    getBillingPlanFilterOptions: jest.Mock;
    listBillingRecordsForAdmin: jest.Mock;
    listBillingHistoryForAdmin: jest.Mock;
    getBillingRecordForAdmin: jest.Mock;
    cancelCompanySubscriptionForAdmin: jest.Mock;
    resolveBillingSubscriptionActor: jest.Mock;
    retryCompanyPaymentForAdmin: jest.Mock;
    reinstateCompanySubscriptionForAdmin: jest.Mock;
    getBillingUpgradeOptionsForAdmin: jest.Mock;
    previewBillingUpgradeForAdmin: jest.Mock;
    applyBillingUpgradeForAdmin: jest.Mock;
  };

  beforeEach(async () => {
    stripeService = {
      getCompaniesWithStripeCustomerForRequester: jest.fn(),
      listInvoicesForRequester: jest.fn(),
      getInvoicePdfBufferForRequester: jest.fn(),
      getInvoicesZipBufferForRequester: jest.fn(),
      sendInvoiceForRequester: jest.fn(),
      bulkSendInvoicesForRequester: jest.fn(),
      getBillingPlanFilterOptions: jest.fn(),
      listBillingRecordsForAdmin: jest.fn(),
      listBillingHistoryForAdmin: jest.fn(),
      getBillingRecordForAdmin: jest.fn(),
      cancelCompanySubscriptionForAdmin: jest.fn(),
      resolveBillingSubscriptionActor: jest.fn(),
      retryCompanyPaymentForAdmin: jest.fn(),
      reinstateCompanySubscriptionForAdmin: jest.fn(),
      getBillingUpgradeOptionsForAdmin: jest.fn(),
      previewBillingUpgradeForAdmin: jest.fn(),
      applyBillingUpgradeForAdmin: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [StripeFinanceController],
      providers: [{ provide: StripeService, useValue: stripeService }],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SuperAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(StripeFinanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getInvoiceCompanyOptions', () => {
    it('returns success envelope with company options', async () => {
      const rows = [{ value: 'c1', label: 'Acme' }];
      stripeService.getCompaniesWithStripeCustomerForRequester.mockResolvedValue(
        rows,
      );

      const result = await controller.getInvoiceCompanyOptions(mockFinanceUser);

      expect(
        stripeService.getCompaniesWithStripeCustomerForRequester,
      ).toHaveBeenCalledWith(mockFinanceUser.sub, mockFinanceUser.groups);
      expect(result).toEqual({
        success: true,
        message: FINANCE_COMPANIES_FETCHED_MSG,
        data: rows,
      });
    });
  });

  describe('listInvoices', () => {
    it('delegates to service and returns success envelope', async () => {
      const payload: InvoiceAdminListResult = {
        items: [],
        hasMore: false,
        nextStartingAfter: null,
        nextSearchPage: null,
        nextSearchOffset: null,
        usedSearch: false,
      };
      stripeService.listInvoicesForRequester.mockResolvedValue(payload);

      const query = { limit: 10, status: 'all' as const };
      const result = await controller.listInvoices(query, mockFinanceUser);

      expect(stripeService.listInvoicesForRequester).toHaveBeenCalledWith(
        mockFinanceUser.sub,
        mockFinanceUser.groups,
        query,
      );
      expect(result).toEqual({
        success: true,
        message: FINANCE_INVOICES_FETCHED_MSG,
        data: payload,
      });
    });
  });

  describe('getInvoicePdf', () => {
    it('returns a StreamableFile with PDF buffer and headers', async () => {
      const buf = Buffer.from('%PDF-1.4');
      stripeService.getInvoicePdfBufferForRequester.mockResolvedValue(buf);

      const result = await controller.getInvoicePdf('in_abc', mockFinanceUser);

      expect(
        stripeService.getInvoicePdfBufferForRequester,
      ).toHaveBeenCalledWith(
        mockFinanceUser.sub,
        mockFinanceUser.groups,
        'in_abc',
      );
      expect(result).toBeInstanceOf(StreamableFile);
      expect(result.options.type).toBe('application/pdf');
      expect(result.options.disposition).toBe(
        `inline; filename="${encodeURIComponent('in_abc')}.pdf"`,
      );
    });

    it('logs and rethrows when the service fails', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      stripeService.getInvoicePdfBufferForRequester.mockRejectedValue(
        new NotFoundException('Invoice PDF is not available yet.'),
      );

      await expect(
        controller.getInvoicePdf('in_missing', mockFinanceUser),
      ).rejects.toThrow(NotFoundException);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('getInvoicePdf(in_missing)'),
        expect.anything(),
      );
      errorSpy.mockRestore();
    });
  });

  describe('sendInvoice', () => {
    it('delegates to service and returns success envelope', async () => {
      stripeService.sendInvoiceForRequester.mockResolvedValue(undefined);

      const result = await controller.sendInvoice('in_send', mockFinanceUser);

      expect(stripeService.sendInvoiceForRequester).toHaveBeenCalledWith(
        mockFinanceUser.sub,
        mockFinanceUser.groups,
        'in_send',
      );
      expect(result).toEqual({
        success: true,
        message: 'Invoice sent successfully',
        data: { sent: true },
      });
    });
  });

  describe('bulkDownloadInvoices', () => {
    it('returns a ZIP StreamableFile', async () => {
      const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      stripeService.getInvoicesZipBufferForRequester.mockResolvedValue(zip);

      const result = await controller.bulkDownloadInvoices(
        { invoiceIds: ['in_1', 'in_2'] },
        mockFinanceUser,
      );

      expect(
        stripeService.getInvoicesZipBufferForRequester,
      ).toHaveBeenCalledWith(mockFinanceUser.sub, mockFinanceUser.groups, [
        'in_1',
        'in_2',
      ]);
      expect(result).toBeInstanceOf(StreamableFile);
      expect(result.options.type).toBe('application/zip');
    });
  });

  describe('bulkSendInvoices', () => {
    it('delegates to service and returns success envelope', async () => {
      stripeService.bulkSendInvoicesForRequester.mockResolvedValue(undefined);

      const result = await controller.bulkSendInvoices(
        {
          invoiceIds: ['in_a'],
          additionalEmails: ['a@example.com'],
        },
        mockFinanceUser,
      );

      expect(stripeService.bulkSendInvoicesForRequester).toHaveBeenCalledWith(
        mockFinanceUser.sub,
        mockFinanceUser.groups,
        ['in_a'],
        ['a@example.com'],
      );
      expect(result).toEqual({
        success: true,
        message: FINANCE_INVOICES_SENT_MSG,
        data: { sent: true },
      });
    });
  });

  describe('getBillingPlanOptions', () => {
    it('returns success envelope with plan options', async () => {
      const rows = [{ value: 'monthly', label: 'Monthly' }];
      stripeService.getBillingPlanFilterOptions.mockResolvedValue(rows);

      const result = await controller.getBillingPlanOptions();

      expect(stripeService.getBillingPlanFilterOptions).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: FINANCE_BILLING_PLAN_OPTIONS_FETCHED_MSG,
        data: rows,
      });
    });
  });

  describe('listBillingRecords', () => {
    it('delegates to service and returns success envelope', async () => {
      const payload = {
        items: [],
        page: 1,
        limit: 20,
        totalCount: 0,
        totalTruncated: false,
        hasNextPage: false,
      };
      stripeService.listBillingRecordsForAdmin.mockResolvedValue(payload);

      const query: ListBillingRecordsQueryDto = {
        page: 1,
        limit: 20,
        subscriptionStatus: 'all',
        paymentStatus: 'all',
        sortOrder: 'asc',
      };
      const result = await controller.listBillingRecords(query);

      expect(stripeService.listBillingRecordsForAdmin).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual({
        success: true,
        message: FINANCE_BILLING_RECORDS_FETCHED_MSG,
        data: payload,
      });
    });
  });

  describe('listBillingHistory', () => {
    it('delegates to service and returns success envelope', async () => {
      const payload = {
        items: [],
        page: 1,
        limit: 20,
        totalCount: 0,
        hasNextPage: false,
      };
      stripeService.listBillingHistoryForAdmin.mockResolvedValue(payload);

      const result = await controller.listBillingHistory('comp-1', {
        page: 1,
        limit: 20,
        eventType: 'all',
        actorKind: 'all',
      });

      expect(stripeService.listBillingHistoryForAdmin).toHaveBeenCalledWith(
        'comp-1',
        expect.objectContaining({ page: 1, limit: 20 }),
      );
      expect(result).toEqual({
        success: true,
        message: FINANCE_BILLING_HISTORY_FETCHED_MSG,
        data: payload,
      });
    });
  });

  describe('getBillingRecord', () => {
    it('returns success envelope when record exists', async () => {
      const row = {
        companyId: 'comp-1',
        billingId: 'cus_1',
      } as BillingAdminListItem;
      stripeService.getBillingRecordForAdmin.mockResolvedValue(row);

      const result = await controller.getBillingRecord('comp-1');

      expect(stripeService.getBillingRecordForAdmin).toHaveBeenCalledWith(
        'comp-1',
      );
      expect(result).toEqual({
        success: true,
        message: FINANCE_BILLING_RECORD_FETCHED_MSG,
        data: row,
      });
    });

    it('throws NotFoundException when record is missing', async () => {
      stripeService.getBillingRecordForAdmin.mockResolvedValue(null);

      await expect(controller.getBillingRecord('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelBillingSubscription', () => {
    it('delegates to service and returns success envelope', async () => {
      const actor = {
        actorKind: 'super_admin' as const,
        actorCognitoSub: 'sub-1',
        actorName: 'Admin User',
        actorRole: 'Super Admin',
      };
      stripeService.resolveBillingSubscriptionActor.mockResolvedValue(actor);
      stripeService.cancelCompanySubscriptionForAdmin.mockResolvedValue(
        undefined,
      );

      const body = { reason: 'Budget / economic pressures' };
      const user = { sub: 'sub-1', groups: ['SuperAdmin'] };
      const result = await controller.cancelBillingSubscription(
        'comp-1',
        body,
        user,
      );

      expect(
        stripeService.resolveBillingSubscriptionActor,
      ).toHaveBeenCalledWith('sub-1', ['SuperAdmin']);
      expect(
        stripeService.cancelCompanySubscriptionForAdmin,
      ).toHaveBeenCalledWith('comp-1', body, actor);
      expect(result).toEqual({
        success: true,
        message: FINANCE_BILLING_CANCEL_SCHEDULED_MSG,
        data: { ok: true },
      });
    });
  });

  describe('retryBillingPayment', () => {
    it('delegates to service and returns success envelope', async () => {
      stripeService.retryCompanyPaymentForAdmin.mockResolvedValue(undefined);

      const result = await controller.retryBillingPayment('comp-1');

      expect(stripeService.retryCompanyPaymentForAdmin).toHaveBeenCalledWith(
        'comp-1',
      );
      expect(result).toEqual({
        success: true,
        message: FINANCE_BILLING_RETRY_ATTEMPTED_MSG,
        data: { ok: true },
      });
    });
  });

  describe('reinstateBillingSubscription', () => {
    it('delegates to service and returns success envelope', async () => {
      const actor = {
        actorKind: 'super_admin' as const,
        actorCognitoSub: 'sub-1',
        actorName: 'Admin User',
        actorRole: 'Super Admin',
      };
      stripeService.resolveBillingSubscriptionActor.mockResolvedValue(actor);
      stripeService.reinstateCompanySubscriptionForAdmin.mockResolvedValue(
        undefined,
      );

      const user = { sub: 'sub-1', groups: ['SuperAdmin'] };
      const result = await controller.reinstateBillingSubscription(
        'comp-1',
        user,
      );

      expect(
        stripeService.reinstateCompanySubscriptionForAdmin,
      ).toHaveBeenCalledWith('comp-1', actor);
      expect(result).toEqual({
        success: true,
        message: FINANCE_BILLING_REINSTATE_SUCCESS_MSG,
        data: { ok: true },
      });
    });

    it('logs and rethrows when the service fails', async () => {
      const errorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      stripeService.resolveBillingSubscriptionActor.mockResolvedValue({
        actorKind: 'super_admin',
        actorCognitoSub: 'sub-1',
        actorName: 'Admin',
        actorRole: 'Super Admin',
      });
      stripeService.reinstateCompanySubscriptionForAdmin.mockRejectedValue(
        new Error('Stripe API error'),
      );

      await expect(
        controller.reinstateBillingSubscription('comp-1', {
          sub: 'sub-1',
          groups: ['SuperAdmin'],
        }),
      ).rejects.toThrow('Stripe API error');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('reinstateBillingSubscription(comp-1)'),
        expect.anything(),
      );
      errorSpy.mockRestore();
    });
  });

  describe('billing upgrade endpoints', () => {
    it('getBillingUpgradeOptions returns upgrade options envelope', async () => {
      const payload = {
        current: {
          pricingPlanId: 'p1',
          planTypeId: 'annual',
          planLabel: 'Annual',
          planLevel: '1-25 employees',
          periodStart: null,
          periodEnd: null,
        },
        allowedTargets: [],
        oneTimeCreditEligible: false,
        oneTimePaymentCents: null,
      };
      stripeService.getBillingUpgradeOptionsForAdmin.mockResolvedValue(payload);

      const result = await controller.getBillingUpgradeOptions('comp-1');

      expect(
        stripeService.getBillingUpgradeOptionsForAdmin,
      ).toHaveBeenCalledWith('comp-1');
      expect(result).toEqual({
        success: true,
        message: FINANCE_BILLING_UPGRADE_OPTIONS_FETCHED_MSG,
        data: payload,
      });
    });

    it('previewBillingUpgrade returns preview envelope', async () => {
      const payload = {
        current: {
          pricingPlanId: 'p1',
          planTypeId: 'annual',
          planLabel: 'Annual',
          planLevel: '1-25 employees',
          periodStart: '2025-01-01',
          periodEnd: '2026-01-01',
        },
        target: {
          pricingPlanId: 'p2',
          planTypeId: 'monthly',
          planLabel: 'Monthly',
          planLevel: '1-25 employees',
          periodStart: null,
          periodEnd: null,
        },
        creditCents: 0,
        prorationCreditCents: 1000,
        amountDueCents: 5000,
        currency: 'usd',
        renewalDate: '2025-07-01',
        nextBillingAmountCents: 9900,
      };
      stripeService.previewBillingUpgradeForAdmin.mockResolvedValue(payload);

      const result = await controller.previewBillingUpgrade('comp-1', {
        targetPricingPlanId: 'p2',
      });

      expect(stripeService.previewBillingUpgradeForAdmin).toHaveBeenCalledWith(
        'comp-1',
        'p2',
      );
      expect(result.message).toBe(FINANCE_BILLING_UPGRADE_PREVIEW_FETCHED_MSG);
    });

    it('applyBillingUpgrade resolves actor and applies upgrade', async () => {
      const actor = {
        actorKind: 'super_admin' as const,
        actorCognitoSub: 'sub-1',
        actorName: 'Admin',
        actorRole: 'Super Admin',
      };
      const payload = {
        ok: true as const,
        pricingPlanId: 'p2',
        amountDueCents: 5000,
        currency: 'usd',
        renewalDate: '2025-07-01',
      };
      stripeService.resolveBillingSubscriptionActor.mockResolvedValue(actor);
      stripeService.applyBillingUpgradeForAdmin.mockResolvedValue(payload);

      const result = await controller.applyBillingUpgrade(
        'comp-1',
        { targetPricingPlanId: 'p2' },
        { sub: 'sub-1', groups: ['SuperAdmin'] },
      );

      expect(stripeService.applyBillingUpgradeForAdmin).toHaveBeenCalledWith(
        'comp-1',
        'p2',
        actor,
      );
      expect(result).toEqual({
        success: true,
        message: FINANCE_BILLING_UPGRADE_APPLIED_MSG,
        data: payload,
      });
    });
  });
});
