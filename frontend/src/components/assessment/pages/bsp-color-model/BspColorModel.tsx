import { AssessmentReportPanel } from "@/components";
import {
	ASSESSMENT_REPORT_COLOR_INFO,
	ASSESSMENT_REPORT_COLOR_INFO_HTML_SCOPES,
	ASSESSMENT_REPORT_RESULTS_PAGE,
} from "@/const";
import { cn } from "@/lib/utils";
import type { AssessmentReportBspColorModelProps } from "@/types";
import {
	parseBlueColorInfoCard,
	sealColorInfoHtmlFragment,
	splitColorInfoRightContent,
	stripRgInlineRgbChipLabels,
} from "@/utils";
import { ColorInfoRichHtml } from ".";

export function BspColorModel({
	cleftcontent,
	crightcontent,
}: AssessmentReportBspColorModelProps) {
	const { rgHtml, blueSectionHtml } = splitColorInfoRightContent(crightcontent);
	const leftSealed = sealColorInfoHtmlFragment(cleftcontent);
	const rgSealed = sealColorInfoHtmlFragment(
		stripRgInlineRgbChipLabels(rgHtml),
	);
	const { bodyHtml, titleHtml } = parseBlueColorInfoCard(blueSectionHtml);
	const blueBodySealed = sealColorInfoHtmlFragment(bodyHtml);
	const blueTitleSealed = sealColorInfoHtmlFragment(titleHtml);
	const hasBlueTitle = Boolean(blueTitleSealed.trim());

	return (
		<section
			id={ASSESSMENT_REPORT_RESULTS_PAGE.colorModelSectionId}
			className={ASSESSMENT_REPORT_RESULTS_PAGE.sectionShellClassName}
		>
			<h2
				className={cn(
					"text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2",
					"text-foreground",
				)}
			>
				{ASSESSMENT_REPORT_COLOR_INFO.sectionTitle}
			</h2>

			<div className="flex w-full min-w-0 flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-stretch">
				<AssessmentReportPanel
					padding="lg"
					className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:min-w-0"
				>
					<ColorInfoRichHtml
						html={leftSealed}
						scopeClassName={
							ASSESSMENT_REPORT_COLOR_INFO_HTML_SCOPES.innerCardBody
						}
					/>
				</AssessmentReportPanel>
				<AssessmentReportPanel
					padding="lg"
					className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:min-w-0"
				>
					<div
						className="flex flex-wrap gap-2"
						role="group"
						aria-label={ASSESSMENT_REPORT_COLOR_INFO.rgbChipsGroupAriaLabel}
					>
						{ASSESSMENT_REPORT_COLOR_INFO.rgbChips.map((chip) => {
							const surfaceKey = chip.surfaceKey;
							return (
								<div
									key={chip.label}
									className={cn(
										"flex h-14 w-24 shrink-0 items-center justify-center rounded-2xl text-heading-4 font-semibold text-light-same shadow-sm",
										surfaceKey === "red" && "bg-destructive",
										surfaceKey === "green" && "bg-brand-green",
										surfaceKey === "gray" && "bg-icon-primary dark:bg-accent",
									)}
								>
									{chip.label}
								</div>
							);
						})}
					</div>
					<ColorInfoRichHtml
						html={rgSealed}
						scopeClassName={
							ASSESSMENT_REPORT_COLOR_INFO_HTML_SCOPES.innerCardBody
						}
					/>
				</AssessmentReportPanel>

				{blueSectionHtml.trim() ? (
					<div
						className={cn(
							"flex w-full min-w-0 basis-full flex-col gap-0 rounded-xl border border-primary/20",
							"bg-brand-primary-bg p-6 shadow-none",
						)}
					>
						<div className="flex min-w-0 flex-row flex-wrap items-start gap-x-3">
							<div
								className={cn(
									"flex h-12 min-w-20 shrink-0 items-center justify-center rounded-2xl bg-interactive-info-active",
									"px-4 text-small font-bold uppercase tracking-wide text-primary-foreground",
								)}
								aria-hidden
							>
								{ASSESSMENT_REPORT_COLOR_INFO.bluePillLabel}
							</div>
							{hasBlueTitle ? (
								<div className="min-w-0 flex-1">
									<ColorInfoRichHtml
										html={blueTitleSealed}
										scopeClassName={
											ASSESSMENT_REPORT_COLOR_INFO_HTML_SCOPES.blueCardHeadline
										}
									/>
								</div>
							) : (
								<div className="min-w-0 flex-1">
									<ColorInfoRichHtml
										html={blueBodySealed}
										scopeClassName={
											ASSESSMENT_REPORT_COLOR_INFO_HTML_SCOPES.blueCardBody
										}
									/>
								</div>
							)}
						</div>
						{hasBlueTitle ? (
							<div className="-mt-3 flex min-w-0 flex-row items-start gap-x-3">
								<div
									className={cn(
										"pointer-events-none invisible flex h-12 min-w-20 shrink-0 items-center justify-center rounded-2xl px-4 opacity-0",
									)}
									aria-hidden
								>
									{ASSESSMENT_REPORT_COLOR_INFO.bluePillLabel}
								</div>
								<div className="min-w-0 flex-1">
									<ColorInfoRichHtml
										html={blueBodySealed}
										scopeClassName={
											ASSESSMENT_REPORT_COLOR_INFO_HTML_SCOPES.blueCardBody
										}
									/>
								</div>
							</div>
						) : null}
					</div>
				) : null}
			</div>
		</section>
	);
}
