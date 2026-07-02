import { useMemo } from "react";
import {
	AssessmentReportPanel,
	AssessmentReportPrintLayout,
	AssessmentReportStyleWheelPanel,
	useUserAssessmentStylesContext,
} from "@/components";
import {
	ASSESSMENT_REPORT_ADAPTARIAN,
	ASSESSMENT_REPORT_CONTEXT_STYLE_LABELS,
	ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE,
	ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS,
	ASSESSMENT_REPORT_QUADRANT_CONTEXT_KEYS,
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

function PrintContextStyleCard({
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
			padding="none"
			className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-between gap-2 rounded-2xl p-5"
		>
			<div className="flex min-w-0 flex-col gap-1.5">
				<p className="text-small font-semibold leading-small text-text-secondary">
					{styleNumber}
				</p>
				<p
					className={cn(
						"inline-block w-fit max-w-full self-start break-words text-heading-3 font-semibold leading-heading-3 tracking-heading-3",
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
			<p className="text-balance text-regular font-medium leading-regular text-muted-foreground">
				{contextLabel}
			</p>
		</AssessmentReportPanel>
	);
}

function PrintOverallStyleDescription({
	title,
	description,
}: AssessmentReportOverallStyleDescriptionProps) {
	return (
		<div className="text-regular font-normal leading-regular text-foreground">
			<p className="text-balance">
				<span className="font-semibold">
					{copy.overallStyleDescriptionLead(title)}
				</span>
				<span>{description}</span>
			</p>
		</div>
	);
}

export function AssessmentReportPrintOverallStylePages() {
	const { loadState, styles } = useUserAssessmentStylesContext();

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

	if (loadState !== "ok" || !styles || !overall) {
		return null;
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
		<>
			<AssessmentReportPrintLayout
				pageNumber={ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.overallStyleOverview}
			>
				<header className="flex shrink-0 flex-col gap-1">
					<h2 className="text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-foreground">
						{copy.sectionTitle}
					</h2>
					<p className="text-regular font-medium leading-regular text-muted-foreground">
						{copy.sectionSubtitle}
					</p>
				</header>

				<div className="flex min-h-0 flex-1 w-full items-stretch gap-[13px]">
					<div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-background">
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
							variant="print"
							wheelMaxWidthClass="max-w-59"
						/>
					</div>

					<div
						className="flex h-full min-h-0 w-[250px] shrink-0 flex-1 flex-col justify-center gap-[14px]"
						role="group"
						aria-label={copy.contextCardsAriaLabel}
					>
						{quadrantCards.map((card) => (
							<PrintContextStyleCard
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
			</AssessmentReportPrintLayout>

			<AssessmentReportPrintLayout
				pageNumber={
					ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS.overallStyleDescription
				}
			>
				<header className="flex shrink-0 flex-col gap-1">
					<h2 className="text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-foreground">
						{copy.sectionTitle}
					</h2>
				</header>
				<AssessmentReportPanel variant="info" padding="lg" className="w-full">
					<PrintOverallStyleDescription
						title={overall.title}
						description={overall.description}
					/>
				</AssessmentReportPanel>
			</AssessmentReportPrintLayout>
		</>
	);
}
