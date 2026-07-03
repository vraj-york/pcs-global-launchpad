// Figma layer: "User Directory/ View Details/ Assessments & Results - View Result" (node 4:22217)
import { Download, X } from "lucide-react";
import { useCallback, useState } from "react";
import {
	AssessmentReportResultsContent,
	AssessmentReportResultsNav,
	UserAssessmentStylesProvider,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { ASSESSMENT_RESULT_MODAL } from "@/const";
import type { AssessmentResultModalProps } from "@/types";
import { downloadAssessmentReport } from "@/utils";

/**
 * Admin-facing "View Result" modal that renders a user's completed behavioral
 * assessment report. Reuses the existing report section nav + content (report copy
 * comes from the global active `report-content` templates; the user-specific style
 * data is resolved by `UserAssessmentStylesProvider` from `assessmentId`). The
 * PDF download reuses `downloadAssessmentReport` and is disabled when no report key
 * is available.
 */
export function AssessmentResultModal({
	open,
	onOpenChange,
	assessmentId,
	welcomeDisplayName,
	reportKey,
}: AssessmentResultModalProps) {
	const [isDownloading, setIsDownloading] = useState(false);
	const canDownload = Boolean(reportKey?.trim());

	const handleDownload = useCallback(async () => {
		if (!canDownload || isDownloading) return;
		setIsDownloading(true);
		try {
			await downloadAssessmentReport(reportKey);
		} finally {
			setIsDownloading(false);
		}
	}, [canDownload, isDownloading, reportKey]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="flex h-[calc(100vh-2rem)] max-h-[900px] w-[calc(100vw-2rem)] max-w-[1440px] flex-col gap-0 overflow-hidden p-0 shadow-lg"
			>
				{/* Header Wrapper (node 4:22219) */}
				<div className="flex items-center gap-4 border-b border-border px-6 py-6">
					<DialogTitle className="min-w-0 flex-1 truncate">
						{ASSESSMENT_RESULT_MODAL.title}
					</DialogTitle>
					<Button
						variant="outline"
						icon={Download}
						onClick={handleDownload}
						isLoading={isDownloading}
						disabled={!canDownload}
						className="shrink-0"
					>
						{ASSESSMENT_RESULT_MODAL.downloadLabel}
					</Button>
					<DialogClose asChild>
						<Button
							variant="ghost"
							size="icon"
							icon={X}
							className="size-9 shrink-0 rounded-lg bg-card p-2 text-icon-secondary hover:bg-muted hover:text-text-foreground"
							aria-label={ASSESSMENT_RESULT_MODAL.closeLabel}
						/>
					</DialogClose>
				</div>

				{/* Body (node 4:22225): scrollable two-column report */}
				<div className="min-h-0 flex-1 overflow-y-auto p-6">
					<div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
						<aside className="shrink-0 lg:sticky lg:top-0 lg:self-start">
							<AssessmentReportResultsNav />
						</aside>
						<div className="min-w-0 flex-1">
							<UserAssessmentStylesProvider assessmentId={assessmentId}>
								<div className="flex w-full min-w-0 max-w-none flex-col items-stretch gap-8">
									<AssessmentReportResultsContent
										welcomeDisplayName={welcomeDisplayName}
									/>
								</div>
							</UserAssessmentStylesProvider>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
