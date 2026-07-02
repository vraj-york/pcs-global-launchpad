import { useCallback, useEffect, useRef, useState } from "react";
import { AppLoader, CompanyAdminOnboardingGate } from "@/components";
import { CORPORATION_ADMIN_DASHBOARD_PAGE } from "@/const";
import { cn } from "@/lib/utils";
import {
	corporationAdminHasOutstandingPayment,
	useCompanyAdminDashboardStore,
	useCorporationAdminDashboardStore,
	useUsersStore,
} from "@/store";
import type { CorporationAdminDashboardTab } from "@/types";
import { CorporationAdminDashboardAnalyticsTab } from "./CorporationAdminDashboardAnalyticsTab";
import { CorporationAdminDashboardFilters } from "./CorporationAdminDashboardFilters";

const C = CORPORATION_ADMIN_DASHBOARD_PAGE;

export function CorporationAdminDashboard() {
	const { userProfile, userProfileLoading, fetchUserProfile } = useUsersStore();
	const corporationId = userProfile?.corporationId?.trim() || null;

	const {
		initializeDashboard,
		reset,
		corporationId: storeCorporationId,
	} = useCorporationAdminDashboardStore();

	const {
		companies,
		loading: companiesLoading,
		loadError: companiesLoadError,
		fetchCompanies,
	} = useCompanyAdminDashboardStore();

	const [tab, setTab] = useState<CorporationAdminDashboardTab>("overview");
	const hasInitializedPaymentsTab = useRef(false);

	const isDashboardLoading =
		Boolean(corporationId) && storeCorporationId !== corporationId;

	const hasOutstandingPayment =
		corporationAdminHasOutstandingPayment(companies);
	const showPaymentTabs =
		!companiesLoading &&
		!companiesLoadError &&
		hasOutstandingPayment &&
		Boolean(companies?.length);

	useEffect(() => {
		if (!userProfileLoading && !corporationId) {
			void fetchUserProfile();
		}
	}, [corporationId, fetchUserProfile, userProfileLoading]);

	useEffect(() => {
		if (!corporationId) return;
		void initializeDashboard(corporationId);
		return () => {
			reset();
		};
	}, [corporationId, initializeDashboard, reset]);

	useEffect(() => {
		void fetchCompanies();
	}, [fetchCompanies]);

	useEffect(() => {
		if (
			!hasInitializedPaymentsTab.current &&
			companies !== null &&
			hasOutstandingPayment
		) {
			setTab("payments");
			hasInitializedPaymentsTab.current = true;
		}
		if (companies !== null && !hasOutstandingPayment) {
			hasInitializedPaymentsTab.current = false;
			setTab("overview");
		}
	}, [companies, hasOutstandingPayment]);

	const handleTabOverview = useCallback(() => {
		setTab("overview");
	}, []);

	const handleTabPayments = useCallback(() => {
		setTab("payments");
	}, []);

	if (!corporationId && !userProfileLoading) {
		return (
			<p className="text-sm text-destructive">{C.noCorporationLinkedError}</p>
		);
	}

	const header = (
		<div className="flex flex-col gap-1">
			<h1 className="text-heading-4 font-semibold text-text-foreground">
				{C.title}
			</h1>
			<p className="text-small text-text-secondary">{C.subtitle}</p>
		</div>
	);

	const overviewPanel = (
		<>
			<CorporationAdminDashboardFilters />
			<CorporationAdminDashboardAnalyticsTab
				isDashboardLoading={isDashboardLoading}
			/>
		</>
	);

	if (!showPaymentTabs) {
		return (
			<div className="flex min-h-0 flex-1 flex-col gap-6">
				<div className="flex flex-col gap-4">
					{header}
					{overviewPanel}
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6">
			<div className="flex shrink-0 flex-col gap-4">
				{header}

				<nav
					className="flex h-11 min-h-11 w-fit shrink-0 self-start items-center rounded-xl bg-card-foreground p-1"
					aria-label={C.tabsListAriaLabel}
				>
					<div className="flex flex-wrap items-center gap-4 px-1">
						<button
							type="button"
							role="tab"
							tabIndex={0}
							aria-selected={tab === "overview"}
							className={cn(
								"inline-flex h-9 min-h-9 cursor-pointer items-center justify-center rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors",
								tab === "overview"
									? "bg-background text-brand-primary"
									: "bg-transparent text-text-secondary hover:text-text-foreground",
							)}
							onClick={handleTabOverview}
						>
							{C.tabOverview}
						</button>
						<button
							type="button"
							role="tab"
							tabIndex={0}
							aria-selected={tab === "payments"}
							className={cn(
								"inline-flex h-9 min-h-9 cursor-pointer items-center justify-center rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors",
								tab === "payments"
									? "bg-background text-brand-primary"
									: "bg-transparent text-text-secondary hover:text-text-foreground",
							)}
							onClick={handleTabPayments}
						>
							{C.tabPayments}
						</button>
					</div>
				</nav>
			</div>

			{tab === "overview" ? overviewPanel : null}

			{tab === "payments" ? (
				<div className="flex min-h-0 flex-1 flex-col">
					<CompanyAdminOnboardingGate
						mixedCompanyPayments
						loadingFallback={<AppLoader className="min-h-40" />}
					/>
				</div>
			) : null}
		</div>
	);
}
