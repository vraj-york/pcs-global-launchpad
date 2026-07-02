export type BillingSubscriptionUiStatus =
	| "active"
	| "trialing"
	| "past_due"
	| "canceled"
	| "incomplete"
	| "unpaid"
	| "none";

export type BillingPaymentUiStatus = "paid" | "failed" | "pending";

export type BillingPaymentMethodType = "ach" | "cc" | "offline" | null;
export type BillingCycleFilterId = "monthly" | "annual" | "one_time";
export type BillingTimePeriodId = "1h" | "7d" | "30d" | "3m" | "6m" | "1y";
export type BillingSortBy =
	| "billingId"
	| "companyName"
	| "planLabel"
	| "billingCycle"
	| "subscriptionStatus"
	| "renewalDate"
	| "paymentStatus"
	| "nextBillingAmount"
	| "paymentType";

export type BillingManagementRow = {
	id: string;
	companyId: string;
	billingId: string | null;
	companyName: string;
	companyRegion: string | null;
	planLabel: string | null;
	planLevel: string | null;
	planTypeId: string | null;
	pricingPlanId: string | null;
	billingCycle: string | null;
	subscriptionStatus: BillingSubscriptionUiStatus;
	paymentStatus: BillingPaymentUiStatus;
	currentPeriodStart: string | null;
	currentPeriodEnd: string | null;
	oneTimePaymentCents: number | null;
	renewalDate: string | null;
	nextBillingAmountCents: number | null;
	nextBillingCurrency: string | null;
	paymentType: BillingPaymentMethodType;
	inconsistentBillingState: boolean;
	cancelAtPeriodEnd: boolean;
	canEdit: boolean;
	canRetryPayment: boolean;
	canCancelSubscription: boolean;
	canReinstateSubscription: boolean;
	stripeSubscriptionId: string | null;
};

export type BillingApiItem = Omit<BillingManagementRow, "id">;

export type BillingListApiData = {
	items: BillingApiItem[];
	page: number;
	limit: number;
	totalCount: number;
	totalTruncated: boolean;
	hasNextPage: boolean;
};

export type BillingPlanOption = { value: string; label: string };

/** Backend `{ success, message, data }` wrapper (wire format only). */
export type BillingApiEnvelope<T> = {
	success: boolean;
	message: string;
	data: T;
};

/** Ok/error result from billing API module functions. */
export type BillingApiResult<T> =
	| { ok: true; data: T; status: number }
	| { ok: false; message: string; status: number };

/** Mutation endpoints that return only `{ ok: true }` on success. */
export type BillingMutationResult =
	| { ok: true; status: number }
	| { ok: false; message: string; status: number };

export type ListBillingRecordsParams = {
	page: number;
	limit: number;
	planTypeId?: string;
	subscriptionStatus?: string;
	paymentStatus?: string;
	billingCycles?: BillingCycleFilterId[];
	paymentTypes?: Array<Exclude<BillingPaymentMethodType, null>>;
	timePeriod?: BillingTimePeriodId | null;
	sortBy?: BillingSortBy;
	sortOrder?: "asc" | "desc";
	search?: string;
};

export type BillingListRecordsData = BillingListApiData & {
	items: BillingManagementRow[];
};

export type BillingPlanOptionsResult = BillingApiResult<BillingPlanOption[]>;
export type BillingListRecordsResult = BillingApiResult<BillingListRecordsData>;
export type BillingRecordResult = BillingApiResult<BillingManagementRow>;

export type BillingHistoryEventType =
	| "subscription_created"
	| "invoice_generated"
	| "payment_successful"
	| "payment_failed"
	| "plan_upgraded"
	| "subscription_canceled"
	| "subscription_reinstated";

export type BillingHistoryActorKind =
	| "system"
	| "super_admin"
	| "company_admin";

export type BillingHistoryRow = {
	eventId: string;
	eventType: BillingHistoryEventType;
	planLabel: string | null;
	planTypeId: string | null;
	amountCents: number | null;
	currency: string | null;
	actorName: string;
	actorRole: string;
	actorKind: BillingHistoryActorKind;
	stripeInvoiceId?: string | null;
	occurredAt: number;
};

export type BillingHistoryTableRow = BillingHistoryRow & { id: string };

export type BillingHistorySortBy =
	| "eventId"
	| "eventType"
	| "planLabel"
	| "amount"
	| "actorName"
	| "occurredAt";

export type ListBillingHistoryParams = {
	page: number;
	limit: number;
	eventType?: string;
	planTypeId?: string;
	actorKind?: string;
	sortBy?: BillingHistorySortBy;
	sortOrder?: "asc" | "desc";
};

export type BillingHistoryListApiData = {
	items: BillingHistoryRow[];
	page: number;
	limit: number;
	totalCount: number;
	hasNextPage: boolean;
};

export type BillingHistoryListResult =
	BillingApiResult<BillingHistoryListApiData>;

export type BillingHistoryContentProps = {
	companyId: string;
	active: boolean;
};

export type BillingHistoryFiltersGroupProps = {
	eventType: string;
	onEventTypeChange: (value: string) => void;
	planTypeId: string | undefined;
	onPlanTypeChange: (planTypeId: string | undefined) => void;
	actorKind: string;
	onActorKindChange: (value: string) => void;
	planOptions: BillingPlanOption[];
	optionsLoading: boolean;
	className?: string;
};

export type CancelBillingSubscriptionPayload = {
	reason: string;
	additionalNotes?: string;
};

export type CancelSubscriptionModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: BillingManagementRow;
	onConfirm: (payload: CancelBillingSubscriptionPayload) => Promise<void>;
	isConfirming?: boolean;
};

export type BillingRowActions = {
	onView: (row: BillingManagementRow) => void;
	onEdit: (row: BillingManagementRow) => void;
	onRetryPayment: (row: BillingManagementRow) => void;
	onCancelSubscription: (row: BillingManagementRow) => void;
	onReinstateSubscription: (row: BillingManagementRow) => void;
};

export type BillingDetailTab = "info" | "history";

export type BillingDetailContentProps = {
	row: BillingManagementRow;
	onBack: () => void;
};

export type BillingConfirmKind = "cancel" | "retry" | "reinstate" | null;

export type BillingUpgradePlanSnapshot = {
	pricingPlanId: string;
	planTypeId: string;
	planLabel: string;
	planLevel: string;
	employeeRangeMin: number | null;
	employeeRangeMax: number | null;
	periodStart: string | null;
	periodEnd: string | null;
};

export type BillingUpgradeTargetOption = {
	pricingPlanId: string;
	planTypeId: string;
	planLabel: string;
	planLevel: string;
	employeeRangeMin: number | null;
	employeeRangeMax: number | null;
	price: number;
};

export type BillingUpgradeOptionsData = {
	current: BillingUpgradePlanSnapshot;
	allowedTargets: BillingUpgradeTargetOption[];
	oneTimeCreditEligible: boolean;
	oneTimePaymentCents: number | null;
};

export type BillingUpgradePreviewData = {
	current: BillingUpgradePlanSnapshot;
	target: BillingUpgradePlanSnapshot;
	creditCents: number;
	prorationCreditCents: number;
	amountDueCents: number;
	currency: string;
	renewalDate: string | null;
	nextBillingAmountCents: number | null;
};

export type BillingUpgradeApplyData = {
	ok: true;
	pricingPlanId: string;
	amountDueCents: number;
	currency: string;
	renewalDate: string | null;
};

export type BillingUpgradeOptionsResult =
	BillingApiResult<BillingUpgradeOptionsData>;
export type BillingUpgradePreviewResult =
	BillingApiResult<BillingUpgradePreviewData>;
export type BillingUpgradeApplyResult =
	BillingApiResult<BillingUpgradeApplyData>;

export type EditBillingDetailsContentProps = {
	companyId: string;
	onBack: () => void;
};

export type EditBillingUpgradeFormProps = {
	companyId: string;
	upgradeOptions: BillingUpgradeOptionsData;
	detailRow: BillingManagementRow | null;
	onBack: () => void;
};

export type BillingMoreFiltersDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appliedBillingCycles: BillingCycleFilterId[];
	appliedTimePeriod: BillingTimePeriodId | null;
	appliedPaymentTypes: Array<Exclude<BillingPaymentMethodType, null>>;
	onApply: (params: {
		billingCycles: BillingCycleFilterId[];
		timePeriod: BillingTimePeriodId | null;
		paymentTypes: Array<Exclude<BillingPaymentMethodType, null>>;
	}) => void;
};

export type BillingManagementColumnOptions = {
	onViewClick?: (row: BillingManagementRow) => void;
	onEditClick?: (row: BillingManagementRow) => void;
	onRetryPaymentClick?: (row: BillingManagementRow) => void;
	onCancelSubscriptionClick?: (row: BillingManagementRow) => void;
	onReinstateSubscriptionClick?: (row: BillingManagementRow) => void;
	rbac?: {
		canEdit: boolean;
		canCancelReinstate: boolean;
	};
};

export type BillingManagementFiltersGroupProps = {
	planTypeId: string | undefined;
	onPlanTypeChange: (planTypeId: string | undefined) => void;
	subscriptionStatus: string;
	onSubscriptionStatusChange: (value: string) => void;
	paymentStatus: string;
	onPaymentStatusChange: (value: string) => void;
	planOptions: BillingPlanOption[];
	optionsLoading: boolean;
	onOpenMoreFilters: () => void;
	moreFiltersAppliedCount: number;
	className?: string;
};
