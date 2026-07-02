import { SquarePen } from "lucide-react";
import { useState } from "react";
import { AppLoader } from "@/components";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SETTINGS_SECURITY_CONTENT } from "@/const";
import { useAccountSecurityStore } from "@/store";
import type { SettingsSecurityTabProps } from "@/types";
import { SettingsChangePasswordDialog } from "./SettingsChangePasswordDialog";
import { SettingsMfaDialog } from "./SettingsMfaDialog";

const C = SETTINGS_SECURITY_CONTENT;

export function SettingsSecurityTab({
	securityLoading,
	securityError,
	onRetryLoad,
}: SettingsSecurityTabProps) {
	const securityStatus = useAccountSecurityStore((s) => s.securityStatus);

	const [changePasswordOpen, setChangePasswordOpen] = useState(false);
	const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
	const [mfaDialogMode, setMfaDialogMode] = useState<"enable" | "disable">(
		"enable",
	);

	if (securityLoading && !securityStatus) {
		return <AppLoader className="min-h-80" />;
	}

	if (securityError || !securityStatus) {
		return (
			<div className="flex min-h-40 flex-col items-start gap-3">
				<p className="text-sm text-destructive">
					{securityError ?? C.loadError}
				</p>
				<Button type="button" variant="outline" onClick={onRetryLoad}>
					{C.retryButton}
				</Button>
			</div>
		);
	}

	const mfaEnabled = securityStatus.mfaEnabled;

	const handleOpenMfaDialog = () => {
		setMfaDialogMode(mfaEnabled ? "disable" : "enable");
		setMfaDialogOpen(true);
	};

	return (
		<>
			<div className="w-full max-w-4xl rounded-xl border border-border bg-background">
				<div className="flex h-14 items-center border-b border-border px-4">
					<p className="text-base font-medium text-text-secondary">
						{C.cardTitle}
					</p>
				</div>

				<div className="flex flex-col gap-4 p-4">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<p className="text-base font-medium text-text-secondary">
							{C.changePasswordTitle}
						</p>
						<Button
							type="button"
							variant="outline"
							icon={SquarePen}
							onClick={() => setChangePasswordOpen(true)}
							aria-label={C.changePasswordUpdateButton}
							tabIndex={0}
						>
							{C.changePasswordUpdateButton}
						</Button>
					</div>

					<Separator />

					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<p className="text-base font-medium text-text-foreground">
								{C.twoFactorTitle}
							</p>
							<p className="text-small text-muted-foreground">
								{mfaEnabled
									? C.twoFactorEnabledDescription
									: C.twoFactorDescription}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							onClick={handleOpenMfaDialog}
							aria-label={
								mfaEnabled ? C.disableTwoFactorButton : C.enableTwoFactorButton
							}
							tabIndex={0}
						>
							{mfaEnabled ? C.disableTwoFactorButton : C.enableTwoFactorButton}
						</Button>
					</div>
				</div>
			</div>

			<SettingsChangePasswordDialog
				open={changePasswordOpen}
				onOpenChange={setChangePasswordOpen}
			/>

			<SettingsMfaDialog
				open={mfaDialogOpen}
				onOpenChange={setMfaDialogOpen}
				mode={mfaDialogMode}
				email={securityStatus.email}
			/>
		</>
	);
}
