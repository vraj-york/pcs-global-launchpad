import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
	AssessmentReportPanel,
	AssessmentReportSection,
	AssessmentReportStyleWheelPanel,
	useUserAssessmentStylesContext,
} from "@/components";
import {
	ASSESSMENT_REPORT_ADAPTARIAN,
	ASSESSMENT_REPORT_CONTEXT_STYLE_LABELS,
	ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE,
	ASSESSMENT_REPORT_QUADRANT_CONTEXT_KEYS,
	ASSESSMENT_REPORT_RESULTS_PAGE,
} from "@/const";
import { cn } from "@/lib";
import type {
	AssessmentReportContextStyleCardProps,
	AssessmentReportOverallStyleDescriptionProps,
} from "@/types";
import {
	extractColorCategoryLabelFromDescription,
	getStylePillBackgroundClassFromDescription,
	getStyleTitleGradientClassFromDescription,
	isAdaptarianStyleNumber,
	styleNumberToSpokeId,
} from "@/utils";

const copy = ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE;

function ContextStyleCard({
	styleNumber,
	title,
	contextLabel,
	spokeId,
	styleDescription = "",
	overallIsAdaptarian,
}: AssessmentReportContextStyleCardProps) {
	const useAdaptarianCombinedTitle =
		overallIsAdaptarian === true && isAdaptarianStyleNumber(styleNumber);

	return (
		<AssessmentReportPanel
			as="article"
			variant="filled"
			padding="md"
			className="flex h-full min-h-44 w-full min-w-0 flex-col gap-3"
		>
			<div className="flex flex-col gap-0.5">
				<p className="text-regular font-semibold leading-regular text-text-secondary">
					{styleNumber}
				</p>
				<p
					className={cn(
						"text-heading-3 font-semibold leading-heading-3 tracking-heading-3",
						useAdaptarianCombinedTitle
							? "bg-gradient-to-r from-brand-red via-brand-green to-icon-primary bg-clip-text text-transparent"
							: styleDescription.trim()
								? getStyleTitleGradientClassFromDescription(
										styleDescription,
										spokeId,
									)
								: "text-foreground",
					)}
				>
					{title}
				</p>
			</div>
			<p className="mt-auto text-regular font-medium leading-regular text-muted-foreground">
				{contextLabel}
			</p>
		</AssessmentReportPanel>
	);
}

function OverallStyleDescription({
	title,
	description,
}: AssessmentReportOverallStyleDescriptionProps) {
	return (
		<div className="text-regular font-normal leading-regular text-foreground">
			<p className="mb-4">
				<span className="font-semibold">
					{copy.overallStyleDescriptionLead(title)}
				</span>
				<span>{description}</span>
			</p>
		</div>
	);
}

export function YourBehavioralStyle() {
	const { loadState, styles } = useUserAssessmentStylesContext();

	useEffect(() => {
		if (loadState === "error") {
			toast.error(copy.loadError);
		}
	}, [loadState]);

	const overall = styles?.overall_style.style;
	const overallSpoke = useMemo(
		() => (overall ? styleNumberToSpokeId(overall.style_number) : null),
		[overall],
	);

	const quadrantCards = useMemo(() => {
		if (!styles) {
			return [];
		}
		return ASSESSMENT_REPORT_QUADRANT_CONTEXT_KEYS.map((key) => {
			const row = styles[key];
			return {
				key,
				styleNumber: row.style.style_number,
				title: row.style.title,
				contextLabel: ASSESSMENT_REPORT_CONTEXT_STYLE_LABELS[key],
				spokeId: styleNumberToSpokeId(row.style.style_number),
				styleDescription: row.style.description,
			};
		});
	}, [styles]);

	if (loadState === "error" || (loadState === "ok" && (!styles || !overall))) {
		return (
			<AssessmentReportSection
				id={ASSESSMENT_REPORT_RESULTS_PAGE.overallBehavioralStyleSectionId}
				errorTitle={copy.loadErrorTitle}
				errorBody={copy.loadErrorBody}
				loadState="error"
			/>
		);
	}

	if (loadState === "loading" || loadState === "idle" || !styles || !overall) {
		return (
			<AssessmentReportSection
				id={ASSESSMENT_REPORT_RESULTS_PAGE.overallBehavioralStyleSectionId}
				loadState="loading"
			/>
		);
	}

	const isAdaptarianOverall = isAdaptarianStyleNumber(overall.style_number);
	const colorCategory = extractColorCategoryLabelFromDescription(
		overall.description,
	);
	const pillClass = isAdaptarianOverall
		? ASSESSMENT_REPORT_ADAPTARIAN.styleIndicatorPillClass
		: getStylePillBackgroundClassFromDescription(
				overall.description,
				overallSpoke,
			);

	return (
		<AssessmentReportSection
			id={ASSESSMENT_REPORT_RESULTS_PAGE.overallBehavioralStyleSectionId}
			title={copy.sectionTitle}
			subtitle={copy.sectionSubtitle}
		>
			<div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,32rem)_1fr] lg:items-stretch lg:gap-4">
				<AssessmentReportStyleWheelPanel
					styleNumber={overall.style_number}
					title={overall.title}
					spokeId={overallSpoke}
					isAdaptarian={isAdaptarianOverall}
					characterStrengths={overall.character_strengths}
					pillClass={pillClass}
					colorCategory={colorCategory}
					categoryClassName={
						colorCategory
							? getStyleTitleGradientClassFromDescription(
									overall.description,
									overallSpoke,
								)
							: undefined
					}
					styleIndicatorAriaLabel={copy.styleIndicatorAriaLabel(
						overall.style_number,
						overall.title,
					)}
					wheelAriaLabel={copy.wheelAriaLabel}
					characterStrengthsAriaLabel={copy.characterStrengthsAriaLabel}
					panelClassName="lg:max-w-lg"
				/>

				<div className="flex h-full min-h-0 min-w-0 flex-col gap-4 self-stretch">
					<AssessmentReportPanel variant="info" padding="lg">
						<OverallStyleDescription
							title={overall.title}
							description={overall.description}
						/>
					</AssessmentReportPanel>

					<div
						className="grid w-full grid-cols-2 content-start items-stretch gap-4"
						role="group"
						aria-label={copy.contextCardsAriaLabel}
					>
						{quadrantCards.map((card) => (
							<ContextStyleCard
								key={card.key}
								styleNumber={card.styleNumber}
								title={card.title}
								contextLabel={card.contextLabel}
								spokeId={card.spokeId}
								styleDescription={card.styleDescription}
								overallIsAdaptarian={isAdaptarianOverall}
							/>
						))}
					</div>
				</div>
			</div>
		</AssessmentReportSection>
	);
}
