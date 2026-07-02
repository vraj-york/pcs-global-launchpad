import { toast } from "sonner";
import { create } from "zustand";
import {
	getAllCompaniesByCorporation,
	getCorporationAdminSystemAnalytics,
} from "@/api";
import type {
	CorporationAdminDashboardStore,
	CorporationAdminDashboardTimeFilter,
	CorporationAdminSystemAnalyticsQuery,
} from "@/types";

const initialState = {
	corporationId: null as string | null,
	companyFilter: "all" as CorporationAdminDashboardStore["companyFilter"],
	timeFilter: "all" as CorporationAdminDashboardTimeFilter,
	companyOptions: [] as CorporationAdminDashboardStore["companyOptions"],
	companiesLoading: false,
	analytics: null as CorporationAdminDashboardStore["analytics"],
	analyticsLoading: false,
	analyticsError: null as string | null,
};

function buildAnalyticsQuery(
	state: Pick<CorporationAdminDashboardStore, "companyFilter" | "timeFilter">,
): CorporationAdminSystemAnalyticsQuery {
	const query: CorporationAdminSystemAnalyticsQuery = {};
	if (state.companyFilter !== "all") {
		query.companyId = state.companyFilter;
	}
	if (state.timeFilter !== "all") {
		query.timeFilter = state.timeFilter;
	}
	return query;
}

export const useCorporationAdminDashboardStore =
	create<CorporationAdminDashboardStore>()((set, get) => ({
		...initialState,

		fetchCompanyOptions: async (corporationId) => {
			set({ companiesLoading: true, companyOptions: [] });
			const result = await getAllCompaniesByCorporation(corporationId);
			set({ companiesLoading: false });
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			set({ companyOptions: result.data });
		},

		fetchSystemAnalytics: async () => {
			if (!get().corporationId) return;
			set({ analyticsLoading: true, analyticsError: null });
			const result = await getCorporationAdminSystemAnalytics(
				buildAnalyticsQuery(get()),
			);
			set({ analyticsLoading: false });
			if (!result.ok) {
				set({ analytics: null, analyticsError: result.message });
				return;
			}
			set({ analytics: result.data, analyticsError: null });
		},

		setCompanyFilter: async (value) => {
			set({ companyFilter: value });
			await get().fetchSystemAnalytics();
		},

		setTimeFilter: async (value) => {
			set({ timeFilter: value });
			await get().fetchSystemAnalytics();
		},

		initializeDashboard: async (corporationId) => {
			set({
				...initialState,
				corporationId,
				companiesLoading: true,
				analyticsLoading: true,
			});
			await get().fetchCompanyOptions(corporationId);
			await get().fetchSystemAnalytics();
		},

		reset: () => set(initialState),
	}));
