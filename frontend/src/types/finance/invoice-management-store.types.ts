import type {
	BulkSendFailure,
	InvoiceCompanyOption,
	InvoiceManagementRow,
	InvoicePaymentType,
	PageCursor,
} from "./invoice-management.types";

export type CachedInvoicePage = {
	rows: InvoiceManagementRow[];
	hasMore: boolean;
	nextStartingAfter: string | null;
	nextSearchPage: string | null;
	nextSearchOffset: number | null;
	usesSearchPagination: boolean;
};

export type InvoiceListFilterKey = {
	statusFilter: string;
	companyId: string | undefined;
	companyFilterEnabled: boolean;
	appliedTimePeriodId: string | null;
	appliedPaymentTypes: InvoicePaymentType[];
	searchQuery: string;
};

export type InvoiceManagementState = {
	rows: InvoiceManagementRow[];
	listLoading: boolean;
	listError: string | null;
	hasMore: boolean;
	nextStartingAfter: string | null;
	nextSearchPage: string | null;
	nextSearchOffset: number | null;
	usesSearchPagination: boolean;
	pageStack: PageCursor[];
	pageCache: Record<string, CachedInvoicePage>;
	searchQuery: string;
	statusFilter: string;
	companyId: string | undefined;
	appliedTimePeriodId: string | null;
	appliedPaymentTypes: InvoicePaymentType[];
	companyOptions: InvoiceCompanyOption[];
	companyOptionsLoading: boolean;
	companyFilterEnabled: boolean;
	sendingInvoiceId: string | null;
	bulkDownloading: boolean;
	bulkSending: boolean;
};

export type InvoiceManagementActions = {
	setCompanyFilterEnabled: (enabled: boolean) => void;
	fetchCompanyOptions: () => Promise<void>;
	fetchInvoices: () => Promise<void>;
	setSearchQuery: (searchQuery: string) => void;
	setStatusFilter: (status: string) => void;
	setCompanyId: (companyId: string | undefined) => void;
	setAppliedMoreFilters: (
		timePeriodId: string | null,
		paymentTypes: InvoicePaymentType[],
	) => void;
	goPrevPage: () => void;
	goNextPage: () => void;
	downloadInvoice: (row: InvoiceManagementRow) => Promise<void>;
	sendInvoice: (invoiceId: string) => Promise<void>;
	bulkDownload: (invoiceIds: string[]) => Promise<void>;
	bulkSend: (
		invoiceIds: string[],
		additionalEmails: string[],
		displayIdById: Map<string, string>,
	) => Promise<BulkSendFailure[]>;
	fetchInvoicePdf: (
		invoiceId: string,
	) => Promise<{ ok: true; blob: Blob } | { ok: false; message: string }>;
	reset: () => void;
};

export type InvoiceManagementStore = InvoiceManagementState &
	InvoiceManagementActions;
