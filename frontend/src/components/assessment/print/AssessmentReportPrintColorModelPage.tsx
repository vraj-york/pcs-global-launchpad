import { AssessmentReportPrintLayout, ColorInfoRichHtml } from "@/components";
import {
	ASSESSMENT_REPORT_COLOR_INFO,
	ASSESSMENT_REPORT_COLOR_INFO_HTML_SCOPES,
	ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS,
} from "@/const";
import { cn } from "@/lib";
import type { AssessmentReportBspColorModelProps } from "@/types";
import {
	parseBlueColorInfoCard,
	sealColorInfoHtmlFragment,
	splitColorInfoRightContent,
	stripRgInlineRgbChipLabels,
} from "@/utils";

export function AssessmentReportPrintColorModelPage({
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
		<AssessmentReportPrintLayout
			pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.colorModel}
		>
			<h2 className="shrink-0 text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-foreground">
				{ASSESSMENT_REPORT_COLOR_INFO.sectionTitle}
			</h2>

			<div className="flex min-h-0 flex-1 flex-col gap-3.5">
				<div className="flex min-h-0 flex-1 w-full items-stretch gap-[10px]">
					<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-visible rounded-3xl border border-border bg-background p-4">
						<ColorInfoRichHtml
							html={leftSealed}
							scopeClassName={
								ASSESSMENT_REPORT_COLOR_INFO_HTML_SCOPES.innerCardBody
							}
						/>
					</div>

					<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-visible rounded-3xl border border-border bg-background p-4">
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
										data-assessment-color-chip={surfaceKey}
										className={cn(
											"flex h-12 min-w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl px-4 text-small font-semibold text-light-same print:shadow-none",
											surfaceKey === "red" && "bg-destructive",
											surfaceKey === "green" && "bg-brand-green",
											surfaceKey === "gray" && "bg-icon-primary",
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
					</div>
				</div>

				{blueSectionHtml.trim() ? (
					<div className="flex shrink-0 flex-col gap-3 rounded-3xl border border-primary/20 bg-brand-primary-bg p-4">
						<div className="flex min-w-0 flex-row flex-wrap items-start gap-3">
							<div
								className="flex h-12 min-w-20 shrink-0 items-center justify-center rounded-2xl bg-interactive-info-active px-4 text-small font-bold uppercase tracking-wide text-primary-foreground"
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
							<div className="flex min-w-0 flex-row items-start gap-3">
								<div
									className="pointer-events-none invisible flex h-12 min-w-20 shrink-0 rounded-2xl px-4 opacity-0"
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
		</AssessmentReportPrintLayout>
	);
}
