import type { SortDirection } from "../common";
import type {
	BillingCycleFilterId,
	BillingHistoryRow,
	BillingManagementRow,
	BillingPaymentMethodType,
	BillingPlanOption,
	BillingTimePeriodId,
	BillingUpgradeOptionsData,
	BillingUpgradePreviewData,
	CancelBillingSubscriptionPayload,
} from "./billing.types";

export type BillingManagementState = {
	listItems: BillingManagementRow[];
	listTotalCount: number;
	listTotalTruncated: boolean;
	listPageIndex: number;
	listLoading: boolean;
	listError: string | null;
	listSortColumnId: string | null;
	listSortDirection: "asc" | "desc" | undefined;
	planTypeId: string | undefined;
	subscriptionStatus: string;
	paymentStatus: string;
	listSearch: string;
	appliedBillingCycles: BillingCycleFilterId[];
	appliedTimePeriod: BillingTimePeriodId | null;
	appliedPaymentTypes: Array<Exclude<BillingPaymentMethodType, null>>;
	planOptions: BillingPlanOption[];
	planOptionsLoading: boolean;
	detailRow: BillingManagementRow | null;
	detailLoading: boolean;
	detailError: string | null;
	editCompanyId: string | null;
	upgradeOptions: BillingUpgradeOptionsData | null;
	upgradeOptionsLoading: boolean;
	upgradeOptionsError: string | null;
	upgradePreview: BillingUpgradePreviewData | null;
	upgradePreviewLoading: boolean;
	upgradePreviewError: string | null;
	upgradeApplyBusy: boolean;
	historyCompanyId: string | null;
	historyEventType: string;
	historyPlanTypeId: string | undefined;
	historyActorKind: string;
	historyPageIndex: number;
	historySortColumnId: string | null;
	historySortDirection: SortDirection;
	historyItems: BillingHistoryRow[];
	historyTotalCount: number;
	historyLoading: boolean;
	historyError: string | null;
};

export type BillingManagementActions = {
	fetchPlanOptions: () => Promise<void>;
	fetchBillingList: () => Promise<void>;
	setListPageIndex: (pageIndex: number) => void;
	setListSort: (columnId: string | null, direction: "asc" | "desc") => void;
	setPlanTypeId: (planTypeId: string | undefined) => void;
	setSubscriptionStatus: (status: string) => void;
	setPaymentStatus: (status: string) => void;
	setListSearch: (search: string) => void;
	setAppliedMoreFilters: (params: {
		billingCycles: BillingCycleFilterId[];
		timePeriod: BillingTimePeriodId | null;
		paymentTypes: Array<Exclude<BillingPaymentMethodType, null>>;
	}) => void;
	fetchBillingDetail: (companyId: string) => Promise<void>;
	clearBillingDetail: () => void;
	initHistoryForCompany: (companyId: string) => void;
	fetchBillingHistory: (companyId: string) => Promise<void>;
	setHistoryEventType: (eventType: string) => void;
	setHistoryPlanTypeId: (planTypeId: string | undefined) => void;
	setHistoryActorKind: (actorKind: string) => void;
	setHistoryPageIndex: (pageIndex: number) => void;
	setHistorySort: (columnId: string) => void;
	cancelSubscription: (
		companyId: string,
		payload: CancelBillingSubscriptionPayload,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	retryPayment: (
		companyId: string,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	reinstateSubscription: (
		companyId: string,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	fetchUpgradeOptions: (companyId: string) => Promise<void>;
	previewUpgrade: (
		companyId: string,
		targetPricingPlanId: string,
	) => Promise<void>;
	applyUpgrade: (
		companyId: string,
		targetPricingPlanId: string,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	clearUpgradePreview: () => void;
	clearUpgradeState: () => void;
	reset: () => void;
};

export type BillingManagementStore = BillingManagementState &
	BillingManagementActions;
