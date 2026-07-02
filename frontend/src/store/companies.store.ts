import { toast } from "sonner";
import { create } from "zustand";
import {
	getCompanies as getCompaniesApi,
	getCompanyFilterOptions as getCompanyFilterOptionsApi,
	reinstateCompany as reinstateCompanyApi,
	suspendCompany as suspendCompanyApi,
} from "@/api";
import { isApiError } from "@/lib/apiClient";
import type {
	CompaniesStore,
	CompanyApiStatusFilter,
	SuspendCompanyPayload,
} from "@/types";

const initialState = {
	listItems: [] as CompaniesStore["listItems"],
	listTotal: 0,
	listPage: 1,
	listLoading: false,
	listError: null as string | null,
	listSortBy: "createdAt" as CompaniesStore["listSortBy"],
	listSortOrder: "desc" as CompaniesStore["listSortOrder"],
	listCreatedFilter: undefined as CompaniesStore["listCreatedFilter"],
	listStatusFilter: undefined as CompaniesStore["listStatusFilter"],
	listCorporationFilter: undefined as CompaniesStore["listCorporationFilter"],
	listPlanFilter: undefined as CompaniesStore["listPlanFilter"],
	listPlanTypeFilter: undefined as CompaniesStore["listPlanTypeFilter"],
	listSearch: "",
	filterOptions: null as CompaniesStore["filterOptions"],
	filterOptionsLoading: false,
};

export const useCompaniesStore = create<CompaniesStore>()((set, get) => ({
	...initialState,

	fetchFilterOptions: async () => {
		set({ filterOptionsLoading: true });
		const result = await getCompanyFilterOptionsApi();
		set({ filterOptionsLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return;
		}
		if (result.data) {
			set({ filterOptions: result.data });
		}
	},

	fetchCompanies: async (
		page: number,
		limit: number,
		params?: {
			sortBy?: CompaniesStore["listSortBy"];
			sortOrder?: CompaniesStore["listSortOrder"];
			createdFilter?: CompaniesStore["listCreatedFilter"];
			status?: CompaniesStore["listStatusFilter"];
			corporationId?: string;
			planId?: string;
			planTypeId?: string;
			search?: string;
		},
	) => {
		const {
			listSortBy,
			listSortOrder,
			listCreatedFilter,
			listStatusFilter,
			listCorporationFilter,
			listPlanFilter,
			listPlanTypeFilter,
		} = get();
		const sortBy = params?.sortBy ?? listSortBy;
		const sortOrder = params?.sortOrder ?? listSortOrder;
		const createdFilter = params?.createdFilter ?? listCreatedFilter;
		const statusRaw = params?.status ?? listStatusFilter;
		const status = statusRaw
			? (statusRaw.toLowerCase() as CompaniesStore["listStatusFilter"])
			: undefined;
		const corporationId = params?.corporationId ?? listCorporationFilter;
		const planId = params?.planId ?? listPlanFilter;
		const planTypeId = params?.planTypeId ?? listPlanTypeFilter;
		const search = params?.search;
		set({ listLoading: true, listError: null });
		const result = await getCompaniesApi({
			page,
			limit,
			sortBy,
			sortOrder,
			createdFilter,
			status: status as CompanyApiStatusFilter | undefined,
			corporationId,
			planId,
			planTypeId,
			search,
		});
		set({ listLoading: false });
		if (!result.ok) {
			set({ listError: result.message });
			toast.error(result.message);
			return;
		}
		if (result.data) {
			set({
				listItems: result.data.items,
				listTotal: result.data.total,
				listPage: result.data.page,
				listError: null,
			});
		}
	},

	setListPage: (page: number) =>
		set((state) => {
			if (state.listPage === page) return {};
			return { listPage: page, listLoading: true };
		}),

	setListSort: (
		sortBy: CompaniesStore["listSortBy"],
		sortOrder: CompaniesStore["listSortOrder"],
	) => set({ listSortBy: sortBy, listSortOrder: sortOrder }),

	setListCreatedFilter: (createdFilter: CompaniesStore["listCreatedFilter"]) =>
		set({ listCreatedFilter: createdFilter }),

	setListStatusFilter: (status: string | undefined) =>
		set({ listStatusFilter: status }),

	setListCorporationFilter: (corporationId: string | undefined) =>
		set({ listCorporationFilter: corporationId }),

	setListPlanFilter: (planId: string | undefined) =>
		set({ listPlanFilter: planId }),

	setListPlanTypeFilter: (planTypeId: string | undefined) =>
		set({ listPlanTypeFilter: planTypeId }),

	setListSearch: (search: string) => set({ listSearch: search }),

	clearListError: () => set({ listError: null }),

	suspendCompany: async (companyId: string, payload: SuspendCompanyPayload) => {
		const result = await suspendCompanyApi(companyId, payload);
		if (isApiError(result)) {
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		const msg = (result.data as { message?: string })?.message;
		if (msg) toast.success(msg);
		return { ok: true as const };
	},

	reinstateCompany: async (companyId: string) => {
		const result = await reinstateCompanyApi(companyId);
		if (isApiError(result)) {
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		const msg = (result.data as { message?: string })?.message;
		if (msg) toast.success(msg);
		return { ok: true as const };
	},

	reset: () => set(initialState),
}));
