import {
	ASSESSMENT_REPORT_PRINT,
	ASSESSMENT_REPORT_PRINT_TOTAL_PAGES,
	formatAssessmentReportPrintPageLabel,
} from "@/const";
import { cn } from "@/lib/utils";
import type { AssessmentReportPrintLayoutProps } from "@/types";

export function AssessmentReportPrintLayout({
	pageNumber,
	totalPages = ASSESSMENT_REPORT_PRINT_TOTAL_PAGES,
	children,
	className,
}: AssessmentReportPrintLayoutProps) {
	return (
		<div
			className="contents print:relative print:box-border print:overflow-hidden print:break-after-page print:flex print:h-screen print:w-screen print:items-center print:justify-center group-data-[assessment-print-pdf=true]/print-root:print:block group-data-[assessment-print-pdf=true]/print-root:print:h-screen group-data-[assessment-print-pdf=true]/print-root:print:w-screen last:print:break-after-auto"
			data-print-page-sheet={pageNumber}
		>
			<article
				className={cn(
					"box-border mx-auto flex w-219 h-155 min-h-155 max-h-155 shrink-0 flex-col gap-2.5 overflow-hidden rounded-3xl border border-border bg-background p-3 shadow-md",
					"print:relative print:mx-auto print:box-border print:flex print:origin-center print:overflow-hidden print:rounded-none print:border-0 print:shadow-none print:[print-color-adjust:exact] print:break-after-avoid print:break-inside-avoid",
					"group-data-[assessment-print-pdf=true]/print-root:print:absolute group-data-[assessment-print-pdf=true]/print-root:print:top-0 group-data-[assessment-print-pdf=true]/print-root:print:left-0 group-data-[assessment-print-pdf=true]/print-root:print:zoom-4 group-data-[assessment-print-pdf=true]/print-root:print:transform-none",
					className,
				)}
				data-print-page={pageNumber}
			>
				<div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
					{children}
				</div>
				<footer className="flex shrink-0 items-center justify-between">
					<span className="text-small font-semibold leading-small tracking-heading-2 text-link underline">
						{ASSESSMENT_REPORT_PRINT.brandFooterLabel}
					</span>
					<span className="text-small font-semibold leading-small tracking-heading-2 text-text-secondary">
						{formatAssessmentReportPrintPageLabel(pageNumber, totalPages)}
					</span>
				</footer>
			</article>
		</div>
	);
}
