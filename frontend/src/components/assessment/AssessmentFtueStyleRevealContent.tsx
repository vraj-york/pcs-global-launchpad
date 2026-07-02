import { ArrowRight, Download, Zap } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
	AppLoader,
	AssessmentCoachingTrigger,
	AssessmentReportStyleWheelPanel,
	StyleTraitsGrid,
	UserAssessmentStylesProvider,
	useUserAssessmentStylesContext,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	ASSESSMENT_FTUE_REVEAL,
	ASSESSMENT_REPORT_ADAPTARIAN,
	ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE,
	ASSESSMENT_REPORT_VIEW,
	ASSESSMENT_REPORTS_BASE_URL,
} from "@/const";
import { useSubscriptionAccess } from "@/hooks";
import { cn } from "@/lib";
import { useAuthStore, useUsersStore } from "@/store";
import type { AssessmentFtueStyleRevealContentProps } from "@/types";
import {
	buildBspStyleTraitItems,
	deriveNameFromEmail,
	extractColorCategoryLabelFromDescription,
	getOverallStressfulDominantMindState,
	getStylePillBackgroundClassFromDescription,
	getStyleTitleClassFromPillClass,
	getStyleTitleGradientClassFromDescription,
	isAdaptarianStyleNumber,
	styleNumberToSpokeId,
} from "@/utils";

const copy = ASSESSMENT_FTUE_REVEAL;
const wheelCopy = ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE;

function AssessmentFtueStyleRevealBody({
	reportKey,
	onDownload,
	isDownloading = false,
	onContinueToDashboard,
}: Omit<AssessmentFtueStyleRevealContentProps, "assessmentId">) {
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

	const dominantMindState = useMemo(
		() =>
			styles?.overall_stressful_scores
				? getOverallStressfulDominantMindState(styles.overall_stressful_scores)
				: null,
		[styles?.overall_stressful_scores],
	);

	const traitItems = useMemo(
		() => (overall ? buildBspStyleTraitItems(overall) : []),
		[overall],
	);

	if (loadState === "loading" || loadState === "idle") {
		return <AppLoader className="min-h-96 py-16" />;
	}

	if (loadState === "error" || !styles || !overall || !dominantMindState) {
		return (
			<div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 py-16 text-center">
				<p className="text-regular text-text-secondary">{copy.loadError}</p>
				<Button type="button" onClick={onContinueToDashboard}>
					{copy.continueToDashboardCta}
				</Button>
			</div>
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
	const categoryClassName =
		colorCategory && !isAdaptarianOverall
			? getStyleTitleGradientClassFromDescription(
					overall.description,
					overallSpoke,
				)
			: undefined;
	const overallAccentClass = getStyleTitleClassFromPillClass(pillClass);

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-4 py-4 md:py-6">
			<div className="flex min-h-8 items-center justify-center gap-1.5 rounded-3xl bg-background px-4 py-0.5 text-mini font-semibold leading-mini tracking-wide text-link shadow-xs">
				<Zap
					className="size-3.5 shrink-0 text-link"
					strokeWidth={2}
					aria-hidden
				/>
				<span>{copy.tag}</span>
			</div>

			<div className="flex max-w-3xl flex-col items-center gap-3 text-center">
				<h1 className="text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-brand-primary">
					{copy.title}
				</h1>
				<p className="text-balance text-regular font-semibold leading-regular text-text-foreground">
					{copy.subtitlePrefix}
					<span className={cn(overallAccentClass)}>{overall.title}</span>
					{copy.subtitleMiddle}
					<span className={cn(dominantMindState.accentClassName)}>
						{dominantMindState.label}
					</span>
					{copy.subtitleSuffix}
				</p>
			</div>

			<div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
				<div className="flex min-h-0 min-w-0">
					<AssessmentReportStyleWheelPanel
						variant="ftue"
						styleNumber={overall.style_number}
						title={overall.title}
						spokeId={overallSpoke}
						isAdaptarian={isAdaptarianOverall}
						characterStrengths={overall.character_strengths}
						pillClass={pillClass}
						colorCategory={colorCategory}
						categoryClassName={categoryClassName}
						styleIndicatorAriaLabel={wheelCopy.styleIndicatorAriaLabel(
							overall.style_number,
							overall.title,
						)}
						wheelAriaLabel={wheelCopy.wheelAriaLabel}
						characterStrengthsAriaLabel={wheelCopy.characterStrengthsAriaLabel}
						wheelMaxWidthClass="max-w-xs"
						panelClassName="h-full min-h-0 w-full rounded-3xl"
					/>
				</div>

				<div className="flex min-h-0 min-w-0">
					<StyleTraitsGrid
						variant="ftue"
						traits={traitItems}
						warningSigns={overall.warning_signs}
					/>
				</div>
			</div>

			<div className="flex w-full flex-col items-center gap-4">
				<div className="flex flex-col flex-wrap items-stretch justify-center gap-3 sm:flex-row sm:items-center">
					<Button
						type="button"
						variant="outline"
						size="lg"
						icon={Download}
						onClick={onDownload}
						disabled={!reportKey || !ASSESSMENT_REPORTS_BASE_URL}
						isLoading={isDownloading}
					>
						{copy.downloadReportCta}
					</Button>
					<Button
						type="button"
						size="lg"
						icon={ArrowRight}
						iconPosition="end"
						onClick={onContinueToDashboard}
					>
						{copy.continueToDashboardCta}
					</Button>
				</div>
				<div className="flex items-center justify-center gap-1.5">
					<Zap
						className="size-5 shrink-0 text-muted-foreground"
						strokeWidth={2}
						aria-hidden
					/>
					<p className="text-mini font-medium leading-mini tracking-wide text-muted-foreground">
						{copy.footer}
					</p>
				</div>
			</div>
		</div>
	);
}

export function AssessmentFtueStyleRevealContent({
	assessmentId,
	reportKey,
	onDownload,
	isDownloading = false,
	onContinueToDashboard,
}: AssessmentFtueStyleRevealContentProps) {
	const { email } = useAuthStore();
	const { firstName, lastName } = useUsersStore();
	const { canAccessChatbot } = useSubscriptionAccess();
	const displayName = useMemo(() => {
		const full = [firstName, lastName].filter(Boolean).join(" ").trim();
		return (
			full ||
			deriveNameFromEmail(email) ||
			ASSESSMENT_REPORT_VIEW.welcomeDisplayNameFallback
		);
	}, [email, firstName, lastName]);

	return (
		<UserAssessmentStylesProvider assessmentId={assessmentId}>
			<AssessmentCoachingTrigger
				assessmentId={assessmentId}
				displayName={displayName}
				enabled={canAccessChatbot}
			/>
			<AssessmentFtueStyleRevealBody
				reportKey={reportKey}
				onDownload={onDownload}
				isDownloading={isDownloading}
				onContinueToDashboard={onContinueToDashboard}
			/>
		</UserAssessmentStylesProvider>
	);
}
