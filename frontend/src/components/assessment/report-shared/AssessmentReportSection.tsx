import { AppLoader } from "@/components";
import { ASSESSMENT_REPORT_RESULTS_PAGE } from "@/const";
import { cn } from "@/lib/utils";
import type { AssessmentReportSectionProps } from "@/types";
import { AssessmentReportSectionHeader } from "./AssessmentReportSectionHeader";

export function AssessmentReportSection({
	id,
	title,
	subtitle,
	loadState,
	errorTitle,
	errorBody,
	headerClassName,
	children,
}: AssessmentReportSectionProps) {
	const shellClassName = ASSESSMENT_REPORT_RESULTS_PAGE.sectionShellClassName;

	if (loadState === "loading" || loadState === "idle") {
		return (
			<section id={id} className={shellClassName} aria-busy>
				{title ? (
					<AssessmentReportSectionHeader
						title={title}
						subtitle={subtitle}
						className={headerClassName}
					/>
				) : null}
				<AppLoader className="py-16" />
			</section>
		);
	}

	if (loadState === "error") {
		return (
			<section id={id} className={shellClassName}>
				<h2 className="text-heading-4 font-semibold text-foreground">
					{errorTitle ?? title}
				</h2>
				{errorBody ? (
					<p className="mt-2 text-regular text-muted-foreground">{errorBody}</p>
				) : null}
			</section>
		);
	}

	return (
		<section id={id} className={shellClassName}>
			{title ? (
				<AssessmentReportSectionHeader
					title={title}
					subtitle={subtitle}
					className={cn(headerClassName)}
				/>
			) : null}
			{children}
		</section>
	);
}
