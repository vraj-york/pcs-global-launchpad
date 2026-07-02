import { type ReactNode, useMemo } from "react";
import {
	AssessmentReportPanel,
	AssessmentReportStyleWheelPanel,
	useUserAssessmentStylesContext,
} from "@/components/assessment";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ASSESSMENT_ONLY_DASHBOARD,
	ASSESSMENT_REPORT_ADAPTARIAN,
	ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE,
} from "@/const";
import { cn } from "@/lib";
import type { OverallBehavioralProfileGraphCardProps } from "@/types";
import {
	extractColorCategoryLabelFromDescription,
	getStylePillBackgroundClassFromDescription,
	getStyleTitleGradientClassFromDescription,
	isAdaptarianStyleNumber,
	styleNumberToSpokeId,
} from "@/utils";

const wheelCopy = ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE;
const cardCopy = ASSESSMENT_ONLY_DASHBOARD.overallCard;

function OverallBehavioralProfileGraphCardShell({
	className,
	children,
}: OverallBehavioralProfileGraphCardProps & {
	children: ReactNode;
}) {
	return (
		<Card
			className={cn("border-0 bg-background py-0 rounded-2xl", className)}
			aria-label={cardCopy.ariaLabel}
		>
			<CardContent className="flex flex-col gap-6 p-6">{children}</CardContent>
		</Card>
	);
}

function OverallBehavioralProfileGraphHeader() {
	return (
		<div className="flex flex-col gap-1.5">
			<h2 className="text-heading-4 font-semibold text-text-foreground">
				{cardCopy.title}
			</h2>
			<p className="text-small text-text-secondary">{cardCopy.subtitle}</p>
		</div>
	);
}

export function OverallBehavioralProfileGraphCardLoadingState({
	className,
}: OverallBehavioralProfileGraphCardProps) {
	return (
		<OverallBehavioralProfileGraphCardShell className={className}>
			<OverallBehavioralProfileGraphHeader />
			<div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
				<Skeleton className="min-h-96 rounded-2xl" />
				<Skeleton className="min-h-52 rounded-2xl" />
			</div>
		</OverallBehavioralProfileGraphCardShell>
	);
}

export function OverallBehavioralProfileGraphCardContent({
	className,
}: OverallBehavioralProfileGraphCardProps) {
	const { loadState, styles } = useUserAssessmentStylesContext();
	const overall = styles?.overall_style.style;

	const overallSpoke = useMemo(
		() => (overall ? styleNumberToSpokeId(overall.style_number) : null),
		[overall],
	);

	if (loadState === "loading" || loadState === "idle" || !styles || !overall) {
		return (
			<OverallBehavioralProfileGraphCardLoadingState className={className} />
		);
	}

	if (loadState === "error") {
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
		<OverallBehavioralProfileGraphCardShell className={className}>
			<OverallBehavioralProfileGraphHeader />
			<div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
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
					styleIndicatorAriaLabel={wheelCopy.styleIndicatorAriaLabel(
						overall.style_number,
						overall.title,
					)}
					wheelAriaLabel={wheelCopy.wheelAriaLabel}
					characterStrengthsAriaLabel={wheelCopy.characterStrengthsAriaLabel}
				/>

				<AssessmentReportPanel variant="filled" padding="lg" className="h-full">
					<div className="text-regular font-normal leading-regular text-foreground">
						<p>
							<span className="font-semibold">
								{wheelCopy.overallStyleDescriptionLead(overall.title)}
							</span>
							<span>{overall.description}</span>
						</p>
					</div>
				</AssessmentReportPanel>
			</div>
		</OverallBehavioralProfileGraphCardShell>
	);
}
