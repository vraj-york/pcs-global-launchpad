import {
	AssessmentReportPanel,
	AssessmentReportSection,
	ContextStyleOverview,
	StyleTraitsGrid,
} from "@/components";
import { ASSESSMENT_REPORT_CONTEXT_STYLE_SECTIONS } from "@/const";
import type { AssessmentReportContextStyleSectionProps } from "@/types";
import {
	buildBspStyleTraitItems,
	getQuadrantScoresForContext,
	sanitizeAssessmentReportHtml,
} from "@/utils";

export function ContextStyleSection({
	contextKey,
	styles,
	printPart,
	embedded = false,
}: AssessmentReportContextStyleSectionProps) {
	const copy = ASSESSMENT_REPORT_CONTEXT_STYLE_SECTIONS[contextKey];
	const contextRow = styles[contextKey];
	const style = contextRow.style;
	const scores = getQuadrantScoresForContext(styles, contextKey);

	if (!scores) {
		return (
			<AssessmentReportSection
				id={copy.sectionId}
				errorTitle={copy.loadErrorTitle}
				errorBody={copy.loadErrorBody}
				loadState="error"
			/>
		);
	}

	const traitItems = buildBspStyleTraitItems(style);
	const descriptionHtml = style.description
		? sanitizeAssessmentReportHtml(style.description)
		: "";

	const showOverview = printPart !== "traits";
	const showTraits = printPart !== "overview";
	const sectionTitle = printPart === "traits" ? undefined : copy.sectionTitle;
	const isPrintLayout = printPart !== undefined;

	const content = (
		<>
			{showOverview ? (
				<ContextStyleOverview
					contextKey={contextKey}
					styles={styles}
					variant={isPrintLayout ? "print" : "default"}
				/>
			) : null}

			{showOverview && !isPrintLayout && descriptionHtml ? (
				<AssessmentReportPanel variant="info" padding="lg">
					<div
						className="text-regular font-normal leading-regular text-muted-foreground [&_p]:mb-4 [&_p:last-child]:mb-0"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized CMS HTML from user-styles.
						dangerouslySetInnerHTML={{ __html: descriptionHtml }}
					/>
				</AssessmentReportPanel>
			) : null}

			{showTraits ? (
				<div className="flex min-h-0 flex-1 flex-col gap-3">
					{isPrintLayout && descriptionHtml ? (
						<AssessmentReportPanel
							variant="info"
							padding="sm"
							className="shrink-0"
						>
							<div
								className="text-small font-normal leading-small text-muted-foreground [&_p]:mb-2 [&_p:last-child]:mb-0"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized CMS HTML from user-styles.
								dangerouslySetInnerHTML={{ __html: descriptionHtml }}
							/>
						</AssessmentReportPanel>
					) : null}
					<StyleTraitsGrid
						traits={traitItems}
						warningSigns={style.warning_signs}
						variant={isPrintLayout ? "print" : "default"}
					/>
				</div>
			) : null}
		</>
	);

	if (embedded) {
		return <div className="flex flex-col gap-4">{content}</div>;
	}

	return (
		<AssessmentReportSection
			id={copy.sectionId}
			title={sectionTitle}
			headerClassName={isPrintLayout ? "shrink-0" : undefined}
		>
			{content}
		</AssessmentReportSection>
	);
}
