import {
	AssessmentReportResultsHeader,
	AssessmentReportResultsNav,
} from "@/components";
import { ASSESSMENT_REPORT_RESULTS_PAGE } from "@/const";
import type { AssessmentReportResultsShellProps } from "@/types";

export function AssessmentReportResultsShell({
	completedSubtitle,
	downloadDisabled,
	isDownloading,
	backLabel,
	backVariant,
	showTitleAndSubtitle,
	showShare,
	onBack,
	onShare,
	onDownload,
	children,
}: AssessmentReportResultsShellProps) {
	return (
		<div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8">
			<AssessmentReportResultsHeader
				pageTitle={ASSESSMENT_REPORT_RESULTS_PAGE.pageTitle}
				completedSubtitle={completedSubtitle}
				backLabel={backLabel}
				backVariant={backVariant}
				showTitleAndSubtitle={showTitleAndSubtitle}
				showShare={showShare}
				shareLabel={ASSESSMENT_REPORT_RESULTS_PAGE.shareLabel}
				downloadLabel={ASSESSMENT_REPORT_RESULTS_PAGE.downloadPdfLabel}
				downloadDisabled={downloadDisabled}
				isDownloading={isDownloading}
				onBack={onBack}
				onShare={onShare}
				onDownload={onDownload}
			/>
			<div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
				<aside className="shrink-0 lg:sticky lg:top-6 lg:self-start">
					<AssessmentReportResultsNav />
				</aside>
				<div className="min-w-0 flex-1">{children}</div>
			</div>
		</div>
	);
}
