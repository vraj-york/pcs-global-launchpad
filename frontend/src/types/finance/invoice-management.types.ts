export type InvoiceUiStatus = "paid" | "pending" | "failed";

export type InvoicePaymentType = "ACH" | "CC" | "Offline";

export type InvoiceManagementRow = {
	id: string;
	displayId: string;
	amountCents: number;
	currency: string;
	uiStatus: InvoiceUiStatus;
	created: number;
	paymentType: InvoicePaymentType | null;
	companyOfficeName: string | null;
	companyRegion: string | null;
	planLabel: string | null;
	planTypeId: string | null;
	invoicePdf: string | null;
};

export type InvoiceColumnSelection = {
	pageRowIds: string[];
	selectedIds: Set<string>;
	onToggleRow: (id: string, checked: boolean) => void;
	onToggleAll: (checked: boolean) => void;
};

export type InvoiceRowActions = {
	onView: (row: InvoiceManagementRow) => void;
	onSend: (row: InvoiceManagementRow) => void;
	onDownload: (row: InvoiceManagementRow) => void;
	permissions?: {
		canSendIndividual: boolean;
		canDownload: boolean;
	};
};

export type InvoiceListApiData = {
	items: InvoiceManagementRow[];
	hasMore: boolean;
	nextStartingAfter: string | null;
	nextSearchPage: string | null;
	nextSearchOffset: number | null;
	usedSearch: boolean;
};

export type InvoiceCompanyOption = {
	value: string;
	label: string;
};

export type InvoiceManagementFiltersGroupProps = {
	statusFilter: string;
	onStatusChange: (value: string) => void;
	companyId: string | undefined;
	onCompanyChange: (companyId: string | undefined) => void;
	companyOptions: InvoiceCompanyOption[];
	optionsLoading: boolean;
	onOpenMoreFilters: () => void;
	moreFiltersAppliedCount: number;
	showCompanyFilter?: boolean;
	className?: string;
};

/** One failed step when sending to a recipient email or company admin for an invoice. */
export type BulkSendFailure = {
	target: string;
	message: string;
};

export type InvoiceMoreFiltersDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Applied values when the dialog opens (synced into draft). */
	appliedTimePeriodId: string | null;
	appliedPaymentTypes: InvoicePaymentType[];
	onApply: (
		timePeriodId: string | null,
		paymentTypes: InvoicePaymentType[],
	) => void;
};

/** Cursor for Stripe invoice list pagination (`startingAfter` or search page + offset). */
export type PageCursor = {
	startingAfter?: string;
	searchPage?: string;
	searchOffset?: number;
};

/** Radix checkbox tri-state (includes indeterminate). */
export type CheckedState = boolean | "indeterminate";

export type BulkSendInvoiceModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSend: (additionalEmails: string[]) => Promise<void>;
	isSending: boolean;
	/** When non-empty, modal shows failure details only (form and note hidden). */
	sendFailures: BulkSendFailure[] | null;
};

export type InvoiceDetailsModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	invoice: InvoiceManagementRow | null;
	onSend: () => void | Promise<void>;
	sendPending?: boolean;
	permissions?: {
		canSendIndividual: boolean;
		canDownload: boolean;
	};
};
