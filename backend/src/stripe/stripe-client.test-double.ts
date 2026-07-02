/** Test double for the `stripe` package default export (used by stripe.service.spec.ts). */
export const mockCheckoutSessionsCreate = jest.fn();
export const mockCheckoutSessionsRetrieve = jest.fn();
export const mockPaymentIntentsRetrieve = jest.fn();
export const mockInvoiceItemsCreate = jest.fn();
export const mockCustomersCreate = jest.fn();
export const mockCustomersRetrieve = jest.fn();
export const mockCustomersCreateBalanceTransaction = jest.fn();
export const mockConstructEvent = jest.fn();
export const mockSubscriptionsRetrieve = jest.fn();
export const mockSubscriptionsList = jest.fn();
export const mockSubscriptionsUpdate = jest.fn();
export const mockSubscriptionsCreate = jest.fn();
export const mockSubscriptionsCancel = jest.fn();
export const mockInvoicesList = jest.fn();
export const mockInvoicesCreatePreview = jest.fn();
export const mockInvoicesRetrieveUpcoming = jest.fn();
export const mockInvoicesRetrieve = jest.fn();
export const mockInvoicesPay = jest.fn();
export const mockInvoicesSendInvoice = jest.fn();
export const mockInvoicesUpdate = jest.fn();
export const mockPromotionCodesRetrieve = jest.fn();
export const mockPricesRetrieve = jest.fn();
export const mockPaymentMethodsList = jest.fn();
export const mockEventsList = jest.fn();

export class MockStripe {
  static errors = {
    StripeInvalidRequestError: class StripeInvalidRequestError extends Error {
      code?: string;
      constructor(raw: { code?: string; message?: string }) {
        super(raw.message ?? 'Stripe error');
        this.code = raw.code;
      }
    },
  };

  static webhooks = {
    constructEvent: mockConstructEvent,
  };

  checkout = {
    sessions: {
      create: mockCheckoutSessionsCreate,
      retrieve: mockCheckoutSessionsRetrieve,
    },
  };
  paymentIntents = {
    retrieve: mockPaymentIntentsRetrieve,
  };
  customers = {
    create: mockCustomersCreate,
    retrieve: mockCustomersRetrieve,
    createBalanceTransaction: mockCustomersCreateBalanceTransaction,
  };
  subscriptions = {
    retrieve: mockSubscriptionsRetrieve,
    list: mockSubscriptionsList,
    update: mockSubscriptionsUpdate,
    create: mockSubscriptionsCreate,
    cancel: mockSubscriptionsCancel,
  };
  invoices = {
    list: mockInvoicesList,
    createPreview: mockInvoicesCreatePreview,
    retrieve: mockInvoicesRetrieve,
    retrieveUpcoming: mockInvoicesRetrieveUpcoming,
    sendInvoice: mockInvoicesSendInvoice,
    update: mockInvoicesUpdate,
    pay: mockInvoicesPay,
  };
  invoiceItems = {
    create: mockInvoiceItemsCreate,
  };
  promotionCodes = {
    retrieve: mockPromotionCodesRetrieve,
  };
  prices = {
    retrieve: mockPricesRetrieve,
  };
  paymentMethods = {
    list: mockPaymentMethodsList,
  };
  events = {
    list: mockEventsList,
  };
}
