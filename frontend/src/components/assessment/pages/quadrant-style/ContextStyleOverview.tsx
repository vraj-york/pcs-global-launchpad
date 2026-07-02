import {
	AssessmentReportStyleWheelPanel,
	AwarenessCard,
	CraChart,
} from "@/components";
import {
	ASSESSMENT_REPORT_ADAPTARIAN,
	ASSESSMENT_REPORT_CONTEXT_STYLE_SECTIONS,
	ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED,
} from "@/const";
import type { AssessmentReportContextStyleOverviewProps } from "@/types";
import {
	extractColorCategoryLabelFromDescription,
	getContextStyleCategoryClass,
	getContextStylePillClass,
	getQuadrantScoresForContext,
	isAdaptarianStyleNumber,
	styleNumberToSpokeId,
} from "@/utils";

const sharedCopy = ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED;

export function ContextStyleOverview({
	contextKey,
	styles,
	variant = "default",
	className,
}: AssessmentReportContextStyleOverviewProps) {
	const copy = ASSESSMENT_REPORT_CONTEXT_STYLE_SECTIONS[contextKey];
	const contextRow = styles[contextKey];
	const style = contextRow.style;
	const scores = getQuadrantScoresForContext(styles, contextKey);

	if (!scores) {
		return null;
	}

	const spokeId = styleNumberToSpokeId(style.style_number);
	const isAdaptarian = isAdaptarianStyleNumber(style.style_number);
	const colorCategory = !isAdaptarian
		? extractColorCategoryLabelFromDescription(style.description)
		: "";
	const pillClass = isAdaptarian
		? ASSESSMENT_REPORT_ADAPTARIAN.styleIndicatorPillClass
		: getContextStylePillClass(contextRow.type, spokeId, style.description);
	const categoryClass = getContextStyleCategoryClass(
		contextRow.type,
		spokeId,
		style.description,
	);
	const isPrint = variant === "print";

	const wheelPanel = (
		<AssessmentReportStyleWheelPanel
			styleNumber={style.style_number}
			title={style.title}
			spokeId={spokeId}
			isAdaptarian={isAdaptarian}
			characterStrengths={style.character_strengths}
			pillClass={pillClass}
			colorCategory={colorCategory}
			categoryClassName={categoryClass}
			styleIndicatorAriaLabel={copy.styleIndicatorAriaLabel(
				style.style_number,
				style.title,
			)}
			wheelAriaLabel={copy.wheelAriaLabel}
			characterStrengthsAriaLabel={sharedCopy.characterStrengthsAriaLabel}
			variant={isPrint ? "print" : "default"}
			wheelMaxWidthClass={isPrint ? "max-w-59" : undefined}
		/>
	);

	if (isPrint) {
		return (
			<div
				className={
					className ?? "flex min-h-0 w-full flex-1 items-stretch gap-2.5"
				}
			>
				<div className="flex h-full min-h-0 w-1/2 shrink-0 flex-col overflow-hidden rounded-3xl border border-border bg-background">
					{wheelPanel}
				</div>
				<div className="flex h-full min-h-0 flex-1 flex-col gap-2">
					<CraChart
						red={scores.red}
						green={scores.green}
						grey={scores.grey}
						variant="print"
						className="min-h-0 w-full flex-1"
					/>
					<AwarenessCard
						awarenessScore={scores.blue}
						className="flex w-full shrink-0 flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 [&_.animate-ping]:hidden"
					/>
				</div>
			</div>
		);
	}

	return (
		<div
			className={
				className ??
				"grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,32rem)_1fr] lg:items-stretch"
			}
		>
			{wheelPanel}
			<div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
				<CraChart red={scores.red} green={scores.green} grey={scores.grey} />
				<AwarenessCard awarenessScore={scores.blue} />
			</div>
		</div>
	);
}
