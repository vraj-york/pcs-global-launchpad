export type CreatePromoCodePayload = {
	code: string;
	planTypeId: "monthly" | "annual" | "one_time";
	description?: string;
	discountType: "percent" | "fixed_amount";
	discountValue: number;
	duration: "once" | "forever";
	expiresAt?: string;
	maxRedemptions?: number;
	limitToAssignment?: boolean;
	corporationId?: string;
	companyId?: string;
};

export type PromoCodeCreatedData = {
	id: string;
	code: string;
};

export type PromoCodeValidatedData = { valid: true };

export type PromoCodeListStatus = "active" | "inactive" | "expired";

/** Row for Add Company → Plan & Seats promo dropdown. */
export type PromoCodeAvailableForCompanySetupItem = {
	id: string;
	code: string;
	planTypeId: string;
	discountType: "percent" | "fixed_amount";
	discountValue: number;
	currency: string | null;
};

export type PromoCodesAvailableForCompanySetupData = {
	items: PromoCodeAvailableForCompanySetupItem[];
};

/** Query for GET /promo-codes/available-for-company-setup */
export type AvailablePromoCodesForSetupQuery = {
	planTypeId?: string;
	corporationId?: string;
};

export type PromoCodeListItemData = {
	id: string;
	code: string;
	description: string | null;
	planTypeId: string;
	planTypeName: string;
	discountType: "percent" | "fixed_amount";
	discountSummary: string;
	duration: "once" | "forever";
	expiresAt: string | null;
	maxRedemptions: number | null;
	timesRedeemed: number;
	status: PromoCodeListStatus;
	createdAt: string;
};

export type PromoCodeDetailStatus = PromoCodeListStatus;

export type PromoCodeDetailData = Omit<PromoCodeListItemData, "status"> & {
	status: PromoCodeDetailStatus;
	/** e.g. `% (Percentage)` or fixed label from API. */
	discountTypeDisplay: string;
	discountValue: number;
	currency: string | null;
	limitToAssignment: boolean;
	corporationId: string | null;
	corporationDisplayName: string | null;
	companyId: string | null;
	companyDisplayName: string | null;
	stripePromotionCodeActive: boolean;
};

export type PromoUsageOutcomeFilter = "all" | "success" | "failed";

export type PromoUsageTimeFilter = "all" | "7d" | "30d" | "90d" | "1y";

export type PromoUsageSortBy =
	| "occurredAt"
	| "userDisplayName"
	| "outcome"
	| "corporationName"
	| "companyName";

export type PromoCodeUsageListItem = {
	id: string;
	outcome: "success" | "failed";
	userDisplayName: string | null;
	userEmail: string | null;
	corporationName: string | null;
	corporationCodeLabel: string | null;
	companyName: string | null;
	companyRegion: string | null;
	occurredAt: string;
};

export type PromoCodeUsageFilterOption = {
	id: string;
	name: string;
};

export type PromoCodeUsageListData = {
	items: PromoCodeUsageListItem[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
	filterOptions: {
		corporations: PromoCodeUsageFilterOption[];
		companies: PromoCodeUsageFilterOption[];
	};
};

export type ListPromoCodeUsageQuery = {
	page?: number;
	pageSize?: number;
	search?: string;
	outcome?: PromoUsageOutcomeFilter;
	corporationId?: string;
	companyId?: string;
	time?: PromoUsageTimeFilter;
	sortBy?: PromoUsageSortBy;
	sortOrder?: "asc" | "desc";
};

export type PromoCodesListSortBy =
	| "createdAt"
	| "code"
	| "planTypeName"
	| "expiresAt"
	| "discountType"
	| "discount"
	| "status"
	| "usageLimit";

export type PromoCodesListStatusFilter = "active" | "inactive" | "expired";

export type ListPromoCodesQuery = {
	page?: number;
	limit?: number;
	sortBy?: PromoCodesListSortBy;
	sortOrder?: "asc" | "desc";
	search?: string;
	planTypeId?: string;
	discountType?: "percent" | "fixed_amount";
	createdAfter?: string;
	status?: PromoCodesListStatusFilter;
};

/** PATCH /promo-codes/:id — partial update (subset of backend UpdatePromoCodeDto). */
export type UpdatePromoCodePayload = {
	code?: string;
	planTypeId?: "monthly" | "annual" | "one_time";
	description?: string;
	discountType?: "percent" | "fixed_amount";
	discountValue?: number;
	duration?: "once" | "forever";
	expiresAt?: string;
	maxRedemptions?: number;
	limitToAssignment?: boolean;
	corporationId?: string;
	companyId?: string;
};

export type PromoCodesListData = {
	items: PromoCodeListItemData[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

/** Standard `{ success, message, data }` wrapper from promo HTTP endpoints. */
export type PromoApiEnvelope<T> = {
	success: boolean;
	message: string;
	data?: T;
};

// ─── Store types ────────────────────────────────────────────────────────────

export type PromoCodesState = {
	// list
	listItems: PromoCodeListItemData[];
	listTotal: number;
	listPage: number;
	listLoading: boolean;
	listError: string | null;
	listSortBy: PromoCodesListSortBy;
	listSortOrder: "asc" | "desc";
	listSearch: string;
	listStatusFilter: PromoCodesListStatusFilter | undefined;
	listPlanTypeFilter: string | undefined;
	listDiscountTypeFilter: "percent" | "fixed_amount" | undefined;
	listCreatedAfterFilter: string | undefined;
	// detail
	promoDetail: PromoCodeDetailData | null;
	promoDetailLoading: boolean;
	promoDetailError: string | null;
	promoDetailErrorStatus: number | null;
	// usage
	usageItems: PromoCodeUsageListItem[];
	usageTotal: number;
	usagePage: number;
	usageLoading: boolean;
	usageError: string | null;
	// mutation
	mutationLoading: boolean;
};

export type PromoCodesActions = {
	fetchPromoCodesList: (
		page: number,
		limit: number,
		params?: Partial<ListPromoCodesQuery>,
	) => Promise<void>;
	fetchPromoCodeById: (id: string) => Promise<void>;
	fetchPromoCodeUsage: (
		id: string,
		query?: ListPromoCodeUsageQuery,
	) => Promise<void>;
	createPromoCode: (
		payload: CreatePromoCodePayload,
	) => Promise<
		{ ok: true; data: PromoCodeCreatedData } | { ok: false; message: string }
	>;
	updatePromoCode: (
		id: string,
		payload: UpdatePromoCodePayload,
	) => Promise<{ ok: true } | { ok: false; message: string }>;
	togglePromotionActive: (
		id: string,
		active: boolean,
	) => Promise<{ ok: true } | { ok: false; message: string }>;
	deletePromoCode: (
		id: string,
	) => Promise<{ ok: true } | { ok: false; message: string }>;
	setListPage: (page: number) => void;
	setListSort: (
		sortBy: PromoCodesListSortBy,
		sortOrder: "asc" | "desc",
	) => void;
	setListSearch: (search: string) => void;
	setListStatusFilter: (status: PromoCodesListStatusFilter | undefined) => void;
	setListPlanTypeFilter: (planTypeId: string | undefined) => void;
	setListDiscountTypeFilter: (
		discountType: "percent" | "fixed_amount" | undefined,
	) => void;
	setListCreatedAfterFilter: (createdAfter: string | undefined) => void;
	clearListError: () => void;
	clearPromoDetail: () => void;
	reset: () => void;
};

export type PromoCodesStore = PromoCodesState & PromoCodesActions;
