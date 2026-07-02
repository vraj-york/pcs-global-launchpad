import { useMemo } from "react";
import {
	ASSESSMENT_REPORT_PRINT,
	ASSESSMENT_REPORT_PRINT_GLOBAL_STYLE,
	ASSESSMENT_REPORT_VIEW,
} from "@/const";
import { cn } from "@/lib/utils";
import { useAuthStore, useUsersStore } from "@/store";
import type { AssessmentReportPrintShellProps } from "@/types";
import { buildAssessmentShareReportHref, deriveNameFromEmail } from "@/utils";
import { AssessmentReportPrintBody } from "./AssessmentReportPrintBody";
import { UserAssessmentStylesProvider } from "./UserAssessmentStylesProvider";

export function AssessmentReportPrintShell({
	assessmentId,
	mode,
	onShare,
}: AssessmentReportPrintShellProps) {
	const { email } = useAuthStore();
	const { firstName, lastName } = useUsersStore();
	const isPreview = mode === "preview";

	const welcomeDisplayName = useMemo(() => {
		const full = [firstName, lastName].filter(Boolean).join(" ").trim();
		return (
			full ||
			deriveNameFromEmail(email) ||
			ASSESSMENT_REPORT_VIEW.welcomeDisplayNameFallback
		);
	}, [firstName, lastName, email]);

	const shareReportHref = useMemo(
		() => buildAssessmentShareReportHref(assessmentId),
		[assessmentId],
	);

	return (
		<div
			className="min-h-screen bg-muted py-4 print:min-h-0 print:bg-white print:py-0 print:[print-color-adjust:exact]"
			data-assessment-print-page-wrapper
		>
			<style>{ASSESSMENT_REPORT_PRINT_GLOBAL_STYLE}</style>
			<div
				className={cn(
					"group/print-root mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-2",
					"print:w-full print:max-w-none print:items-center print:gap-0 print:bg-white print:p-0 print:[print-color-adjust:exact]",
					"group-data-[assessment-print-pdf=true]/print-root:print:w-screen",
				)}
				data-assessment-print-root
				data-assessment-print-pdf="true"
			>
				{isPreview ? (
					<p
						className="text-center text-small font-medium leading-small text-text-secondary print:hidden"
						data-assessment-print-preview-banner
					>
						{ASSESSMENT_REPORT_PRINT.previewBanner}
					</p>
				) : null}
				<UserAssessmentStylesProvider assessmentId={assessmentId}>
					<AssessmentReportPrintBody
						welcomeDisplayName={welcomeDisplayName}
						onShare={onShare}
						shareReportHref={shareReportHref}
					/>
				</UserAssessmentStylesProvider>
			</div>
		</div>
	);
}
