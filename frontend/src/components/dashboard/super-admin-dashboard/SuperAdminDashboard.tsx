import { useEffect, useState } from "react";
import {
	SUPER_ADMIN_DASHBOARD_PAGE,
	SUPER_ADMIN_DASHBOARD_TABS,
} from "@/const";
import { cn } from "@/lib/utils";
import { useSuperAdminDashboardStore } from "@/store";
import type { SuperAdminDashboardTabId } from "@/types";
import { SuperAdminDashboardFilters } from "./SuperAdminDashboardFilters";
import { SuperAdminDashboardPostHogTab } from "./SuperAdminDashboardPostHogTab";
import { SuperAdminDashboardSystemAnalyticsTab } from "./SuperAdminDashboardSystemAnalyticsTab";

const C = SUPER_ADMIN_DASHBOARD_PAGE;

export function SuperAdminDashboard() {
	const [activeTab, setActiveTab] =
		useState<SuperAdminDashboardTabId>("posthog");
	const { initializeDashboard, reset } = useSuperAdminDashboardStore();

	useEffect(() => {
		void initializeDashboard();
		return () => {
			reset();
		};
	}, [initializeDashboard, reset]);

	const renderTabContent = () => {
		switch (activeTab) {
			case "posthog":
				return <SuperAdminDashboardPostHogTab />;
			case "system-analytics":
				return <SuperAdminDashboardSystemAnalyticsTab />;
		}
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-heading-4 font-semibold text-text-foreground">
					{C.title}
				</h1>
				<p className="text-small text-text-secondary">{C.subtitle}</p>
			</div>

			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<nav
					className="flex h-11 min-h-11 shrink-0 items-center rounded-xl bg-card-foreground p-1"
					aria-label={C.tabsListAriaLabel}
				>
					<div className="flex flex-wrap items-center gap-4 px-1">
						{SUPER_ADMIN_DASHBOARD_TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={cn(
									"inline-flex h-9 min-h-9 cursor-pointer items-center justify-center rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors",
									activeTab === tab.id
										? "bg-background text-brand-primary"
										: "bg-transparent text-text-secondary hover:text-text-foreground",
								)}
								aria-current={activeTab === tab.id ? "page" : undefined}
								tabIndex={0}
							>
								{tab.label}
							</button>
						))}
					</div>
				</nav>

				{activeTab === "system-analytics" ? (
					<SuperAdminDashboardFilters />
				) : null}
			</div>

			{renderTabContent()}
		</div>
	);
}
