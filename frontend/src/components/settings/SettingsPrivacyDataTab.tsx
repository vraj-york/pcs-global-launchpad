import { Eye, Send } from "lucide-react";
import { useState } from "react";
import { SettingsDataDownloadDialog } from "@/components";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ROUTES, SETTINGS_PRIVACY_CONTENT } from "@/const";

const C = SETTINGS_PRIVACY_CONTENT;

export function SettingsPrivacyDataTab() {
	const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);

	const handleViewTerms = () => {
		window.open(
			`${window.location.origin}${ROUTES.auth.termsOfUse}`,
			"_blank",
			"noopener,noreferrer",
		);
	};

	const handleViewPrivacyPolicy = () => {
		window.open(
			`${window.location.origin}${ROUTES.auth.privacyPolicy}`,
			"_blank",
			"noopener,noreferrer",
		);
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
					<div className="flex flex-wrap items-center justify-between gap-4 py-2">
						<p className="text-base font-medium text-text-secondary">
							{C.termsOfUseTitle}
						</p>
						<Button
							type="button"
							variant="outline"
							icon={Eye}
							onClick={handleViewTerms}
							aria-label={C.viewButton}
							tabIndex={0}
						>
							{C.viewButton}
						</Button>
					</div>

					<Separator />

					<div className="flex flex-wrap items-center justify-between gap-4 py-2">
						<p className="text-base font-medium text-text-secondary">
							{C.privacyPolicyTitle}
						</p>
						<Button
							type="button"
							variant="outline"
							icon={Eye}
							onClick={handleViewPrivacyPolicy}
							aria-label={C.viewButton}
							tabIndex={0}
						>
							{C.viewButton}
						</Button>
					</div>

					<Separator />

					<div className="flex flex-wrap items-center justify-between gap-4 py-2">
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<p className="text-base font-medium text-text-secondary">
								{C.downloadDataTitle}
							</p>
							<p className="text-small text-muted-foreground">
								{C.downloadDataDescription}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							icon={Send}
							iconPosition="end"
							onClick={() => setDownloadDialogOpen(true)}
							aria-label={C.sendRequestButton}
							tabIndex={0}
						>
							{C.sendRequestButton}
						</Button>
					</div>
				</div>
			</div>

			<SettingsDataDownloadDialog
				open={downloadDialogOpen}
				onOpenChange={setDownloadDialogOpen}
			/>
		</>
	);
}
