import { useCallback, useEffect, useMemo, useState } from "react";
import {
	SettingsPrivacyDataTab,
	SettingsProfileOverviewTab,
	SettingsSecurityTab,
} from "@/components";
import { SETTINGS_PAGE_CONTENT, SETTINGS_TABS, SUBMODULE_KEYS } from "@/const";
import { usePermissions } from "@/hooks";
import { canAccess } from "@/lib";
import { cn } from "@/lib/utils";
import { useAccountSecurityStore, useUsersStore } from "@/store";
import type { SettingsTabId } from "@/types";

const C = SETTINGS_PAGE_CONTENT;

const SETTINGS_TAB_PERMISSIONS: Record<
	SettingsTabId,
	(typeof SUBMODULE_KEYS)[keyof typeof SUBMODULE_KEYS]
> = {
	"profile-overview": SUBMODULE_KEYS.SETTINGS_PROFILE,
	security: SUBMODULE_KEYS.SETTINGS_SECURITY,
	"privacy-data": SUBMODULE_KEYS.SETTINGS_PRIVACY,
};

export function SettingsPageContent() {
	const [activeTab, setActiveTab] = useState<SettingsTabId>("profile-overview");
	const { userProfile } = useUsersStore();
	const { userProfileLoading, userProfileError, fetchUserProfile } =
		useUsersStore();
	const { securityLoading, securityError, fetchSecurityStatus } =
		useAccountSecurityStore();
	const { enabledKeys } = usePermissions();

	const visibleTabs = useMemo(
		() =>
			SETTINGS_TABS.filter((tab) =>
				canAccess(enabledKeys, SETTINGS_TAB_PERMISSIONS[tab.id]),
			),
		[enabledKeys],
	);

	const visibleTabIds = useMemo(
		() => visibleTabs.map((tab) => tab.id),
		[visibleTabs],
	);

	useEffect(() => {
		if (visibleTabIds.length === 0) return;
		if (!visibleTabIds.includes(activeTab)) {
			setActiveTab(visibleTabIds[0]);
		}
	}, [activeTab, visibleTabIds]);

	const handleRetryProfileLoad = useCallback(() => {
		void fetchUserProfile();
	}, [fetchUserProfile]);

	const handleRetrySecurityLoad = useCallback(() => {
		void fetchSecurityStatus();
	}, [fetchSecurityStatus]);

	useEffect(() => {
		if (userProfile) return;
		void fetchUserProfile();
	}, [userProfile, fetchUserProfile]);

	useEffect(() => {
		if (activeTab === "security") {
			void fetchSecurityStatus();
		}
	}, [activeTab, fetchSecurityStatus]);

	const renderTabContent = () => {
		switch (activeTab) {
			case "profile-overview":
				return (
					<SettingsProfileOverviewTab
						profileLoading={userProfileLoading}
						profileError={userProfileError}
						onRetryLoad={handleRetryProfileLoad}
					/>
				);
			case "security":
				return (
					<SettingsSecurityTab
						securityLoading={securityLoading}
						securityError={securityError}
						onRetryLoad={handleRetrySecurityLoad}
					/>
				);
			case "privacy-data":
				return <SettingsPrivacyDataTab />;
		}
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-heading-4 font-semibold text-text-foreground">
					{C.title}
				</h1>
				<p className="text-small text-text-secondary">{C.subtitle}</p>
			</div>

			{visibleTabs.length > 0 ? (
				<>
					<div className="flex h-11 min-h-11 items-center rounded-xl bg-card-foreground p-1">
						<nav
							className="flex flex-wrap items-center gap-4"
							aria-label="Settings tabs"
						>
							{visibleTabs.map((tab) => (
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
						</nav>
					</div>

					{renderTabContent()}
				</>
			) : null}
		</div>
	);
}
