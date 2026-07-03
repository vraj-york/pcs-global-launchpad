// Figma layer: "Settings - Security" — node 4:22095
/*
 * SEMANTIC ANALYSIS
 * Coach Settings → Security tab.
 * Reuses the existing, fully-wired SettingsSecurityTab ("Security Settings" card:
 * Change Password → Update, 2FA Preference → Enable/Disable 2FA) together with the
 * account-security store, which already drives the real change-password and MFA
 * dialogs against the account-security API. No coach-specific behavior needed.
 */
import { useCallback, useEffect } from "react";
import { SettingsSecurityTab } from "@/components/settings";
import { useAccountSecurityStore } from "@/store";

export function CoachSecurityTab() {
	const { securityLoading, securityError, fetchSecurityStatus } =
		useAccountSecurityStore();

	useEffect(() => {
		void fetchSecurityStatus();
	}, [fetchSecurityStatus]);

	const handleRetryLoad = useCallback(() => {
		void fetchSecurityStatus();
	}, [fetchSecurityStatus]);

	return (
		<SettingsSecurityTab
			securityLoading={securityLoading}
			securityError={securityError}
			onRetryLoad={handleRetryLoad}
		/>
	);
}
