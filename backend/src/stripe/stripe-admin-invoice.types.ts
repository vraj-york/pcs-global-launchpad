export type InvoiceAdminUiStatus = 'paid' | 'pending' | 'failed';

export type InvoiceAdminPaymentType = 'ACH' | 'CC' | 'Offline';

export type InvoiceAdminListItem = {
  id: string;
  displayId: string;
  amountCents: number;
  currency: string;
  stripeStatus: string;
  uiStatus: InvoiceAdminUiStatus;
  created: number;
  paymentType: InvoiceAdminPaymentType | null;
  companyId: string | null;
  companyOfficeName: string | null;
  companyRegion: string | null;
  /** Primary line item label for subscription/plan (from Stripe line descriptions or price). */
  planLabel: string | null;
  /** `plan_types.id` resolved from the invoice line Stripe price id. */
  planTypeId: string | null;
  /** Hosted invoice PDF URL when Stripe has generated it (finalized invoices). */
  invoicePdf: string | null;
};

export type InvoiceAdminListResult = {
  items: InvoiceAdminListItem[];
  hasMore: boolean;
  /** Last returned invoice id for `startingAfter` when using list mode. */
  nextStartingAfter: string | null;
  /** Stripe Search `page` token when using search mode. */
  nextSearchPage: string | null;
  /** Offset within the current search page when paginating mid-page. */
  nextSearchOffset: number | null;
  usedSearch: boolean;
};
