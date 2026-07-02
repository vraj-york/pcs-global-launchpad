import { create } from "zustand";
import {
	getCompanyAdminOnboardingReview,
	getCompanyAdminSystemAnalytics,
} from "@/api";
import type {
	CompanyAdminAnalyticsDashboardTimeFilter,
	CompanyAdminCompanyItem,
	CompanyAdminDashboardStore,
	CompanyAdminSystemAnalyticsQuery,
} from "@/types";

export function companyAdminHasActiveSubscription(
	companies: CompanyAdminCompanyItem[] | null,
): boolean {
	return Boolean(companies?.some((c) => c.hasActiveSubscription === true));
}

export function corporationAdminHasOutstandingPayment(
	companies: CompanyAdminCompanyItem[] | null,
): boolean {
	return Boolean(companies?.some((c) => c.canCheckout));
}

const onboardingInitialState = {
	companies: null as CompanyAdminCompanyItem[] | null,
	loading: false,
	loadError: false,
	hasFetched: false,
};

const analyticsInitialState = {
	timeFilter: "all" as CompanyAdminAnalyticsDashboardTimeFilter,
	analytics: null as CompanyAdminDashboardStore["analytics"],
	analyticsLoading: false,
	analyticsError: null as string | null,
};

function buildAnalyticsQuery(
	state: Pick<CompanyAdminDashboardStore, "timeFilter">,
): CompanyAdminSystemAnalyticsQuery {
	const query: CompanyAdminSystemAnalyticsQuery = {};
	if (state.timeFilter !== "all") {
		query.timeFilter = state.timeFilter;
	}
	return query;
}

export const useCompanyAdminDashboardStore = create<CompanyAdminDashboardStore>(
	(set, get) => ({
		...onboardingInitialState,
		...analyticsInitialState,

		fetchCompanies: async () => {
			const { hasFetched, loading } = get();
			if (hasFetched || loading) {
				return;
			}
			set({ hasFetched: true, loading: true, loadError: false });
			const result = await getCompanyAdminOnboardingReview();
			if (!result.ok) {
				set({ companies: null, loading: false, loadError: true });
				return;
			}
			set({
				companies: result.data.companies,
				loading: false,
				loadError: false,
			});
		},

		fetchSystemAnalytics: async () => {
			set({ analyticsLoading: true, analyticsError: null });
			const result = await getCompanyAdminSystemAnalytics(
				buildAnalyticsQuery(get()),
			);
			set({ analyticsLoading: false });
			if (!result.ok) {
				set({ analytics: null, analyticsError: result.message });
				return;
			}
			set({ analytics: result.data, analyticsError: null });
		},

		setTimeFilter: async (value) => {
			set({ timeFilter: value });
			await get().fetchSystemAnalytics();
		},

		initializeAnalyticsDashboard: async () => {
			set({ ...analyticsInitialState, analyticsLoading: true });
			await get().fetchSystemAnalytics();
		},

		resetAnalytics: () => set(analyticsInitialState),

		reset: () => set({ ...onboardingInitialState, ...analyticsInitialState }),
	}),
);
