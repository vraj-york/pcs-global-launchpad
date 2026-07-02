import type {
	BillingApiResult,
	BillingHistoryListApiData,
	BillingHistoryRow,
	BillingManagementRow,
	BillingMutationResult,
	CancelBillingSubscriptionPayload,
	ListBillingHistoryParams,
} from "./billing.types";

export type CompanyAdminBillingScope = {
	companyId?: string;
};

export type CompanyAdminBillingRecordResult =
	BillingApiResult<BillingManagementRow>;

export type CompanyAdminBillingHistoryResult =
	BillingApiResult<BillingHistoryListApiData>;

export type CompanyAdminBillingStore = {
	companyId: string | null;
	billingRow: BillingManagementRow | null;
	billingLoading: boolean;
	billingError: string | null;
	historyItems: BillingHistoryRow[];
	historyTotalCount: number;
	historyPageIndex: number;
	historyLoading: boolean;
	historyError: string | null;
	invoiceDownloadBusyEventId: string | null;
	retryBusy: boolean;
	cancelBusy: boolean;
	reinstateBusy: boolean;
	changePlanBusy: boolean;
	setCompanyId: (companyId: string | null) => void;
	setHistoryPageIndex: (pageIndex: number) => void;
	fetchBilling: () => Promise<void>;
	fetchHistory: () => Promise<void>;
	cancelSubscription: (
		payload: CancelBillingSubscriptionPayload,
	) => Promise<BillingMutationResult>;
	retryPayment: () => Promise<BillingMutationResult>;
	reinstateSubscription: () => Promise<BillingMutationResult>;
	requestPlanChange: () => Promise<BillingMutationResult>;
	downloadInvoice: (
		invoiceId: string,
		eventId: string,
	) => Promise<{ ok: boolean }>;
	reset: () => void;
};

export type BillingEventsTimelineProps = {
	events: BillingHistoryRow[];
	loading: boolean;
	error: string | null;
	canRetryPayment: boolean;
	invoiceDownloadBusyEventId: string | null;
	retryBusy: boolean;
	onDownloadInvoice: (invoiceId: string, eventId: string) => void;
	onRetryPayment: () => void;
};

export type BillingSummaryCardsProps = {
	row: BillingManagementRow;
};

export type ListCompanyAdminBillingHistoryParams = ListBillingHistoryParams &
	CompanyAdminBillingScope;
