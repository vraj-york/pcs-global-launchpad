import type { ReactNode } from "react";
import type { AssessmentReportSectionLoadState } from "./assessment-report-status-flow.types";
import type { WagonWheelSpokeId } from "./assessment-report-wagon-wheel.types";

export type OverallStyleIndicator = {
	styleNumber: number;
	title: string;
	pillClass: string;
	ariaLabel: string;
};

export type ApiBspStyle = {
	id: string;
	style_number: number;
	title: string;
	has_video: boolean;
	youtube_video_id: string | null;
	description: string;
	display_order: number;
	environmental_preferences: string[];
	interaction_preferences: string[];
	character_strengths: string[];
	psychological_needs: string[];
	likes: string[];
	dislikes: string[];
	work_preferences: string[];
	warning_signs: string[];
	when_feeling_stressed: string;
	created_at: string;
	updated_at: string;
};

export type AssessmentScoreStyleContextKey =
	| "overall"
	| "professional_typical"
	| "professional_stressful"
	| "personal_typical"
	| "personal_stressful";

export type AssessmentScoreStyleType = "basic" | "plural" | "split";

export type ApiUserAssessmentContextStyle = {
	context: AssessmentScoreStyleContextKey;
	type: AssessmentScoreStyleType;
	style: ApiBspStyle;
};

export type ProfessionalTypicalScoreBreakdown = {
	prtred: number;
	prtgreen: number;
	prtgrey: number;
	prtblue: number;
};

export type ProfessionalStressfulScoreBreakdown = {
	prsred: number;
	prsgreen: number;
	prsgrey: number;
	prsblue: number;
};

export type PersonalTypicalScoreBreakdown = {
	petred: number;
	petgreen: number;
	petgrey: number;
	petblue: number;
};

export type PersonalStressfulScoreBreakdown = {
	pesred: number;
	pesgreen: number;
	pesgrey: number;
	pesblue: number;
};

export type OverallStressfulScoreBreakdown = {
	cred: number;
	cgreen: number;
	cgrey: number;
	cblue: number;
};

export type OverallStressfulDominantMindState = {
	label: string;
	accentClassName: string;
};

export type DecreaseStressScoreMetrics = {
	prblue: number;
	peblue: number;
	professional_typical_oct: number;
	personal_typical_oct: number;
	stressful_combo_oct: number;
};

export type QuadrantScoreBreakdown = {
	red: number;
	green: number;
	grey: number;
	blue: number;
};

export type AssessmentReportContextStyleSectionKey = Exclude<
	AssessmentScoreStyleContextKey,
	"overall"
>;

export type ApiUserAssessmentStylesResponse = {
	assessment_id: string;
	assessment_score_id: string;
	overall_style: ApiUserAssessmentContextStyle;
	professional_typical: ApiUserAssessmentContextStyle;
	professional_stressful: ApiUserAssessmentContextStyle;
	personal_typical: ApiUserAssessmentContextStyle;
	personal_stressful: ApiUserAssessmentContextStyle;
	professional_typical_scores: ProfessionalTypicalScoreBreakdown;
	professional_stressful_scores: ProfessionalStressfulScoreBreakdown;
	personal_typical_scores: PersonalTypicalScoreBreakdown;
	personal_stressful_scores: PersonalStressfulScoreBreakdown;
	overall_stressful_scores: OverallStressfulScoreBreakdown;
	decrease_stress_metrics: DecreaseStressScoreMetrics;
	scored_at: string;
};

export type QuadrantStylePageProps = {
	styles: ApiUserAssessmentStylesResponse;
};

export type AssessmentReportContextStyleSectionProps = {
	contextKey: AssessmentReportContextStyleSectionKey;
	styles: ApiUserAssessmentStylesResponse;
	/** Split PRT/PRS/PET/PES across two PDF pages (overview vs traits). */
	printPart?: "overview" | "traits";
	/** Dashboard tab panel: no report section chrome. */
	embedded?: boolean;
};

export type AssessmentReportContextStyleOverviewProps = {
	contextKey: AssessmentReportContextStyleSectionKey;
	styles: ApiUserAssessmentStylesResponse;
	variant?: "default" | "print";
	className?: string;
};

export type AssessmentReportCraChartProps = {
	red: number;
	green: number;
	grey: number;
	className?: string;
	/** Compact fixed-aspect layout for print pages. */
	variant?: "default" | "print";
};

export type AssessmentReportAwarenessCardProps = {
	awarenessScore: number;
	className?: string;
};

export type AssessmentReportStyleTraitItem = {
	id: string;
	title: string;
	body: string;
	icon: "globe" | "star" | "thumbsUp" | "thumbsDown" | "brain" | "building";
};

export type AssessmentReportStyleTraitCardProps =
	AssessmentReportStyleTraitItem & {
		compact?: boolean;
		ftue?: boolean;
	};

export type AssessmentReportStyleTraitsGridProps = {
	traits: AssessmentReportStyleTraitItem[];
	warningSigns: string[];
	/** Tighter layout for fixed-size print pages. */
	variant?: "default" | "print" | "ftue";
};

export type AssessmentReportContextStyleCardProps = {
	styleNumber: number;
	title: string;
	contextLabel: string;
	/** Null when style_number has no clock position on the 12-spoke wheel (e.g. 13). */
	spokeId: WagonWheelSpokeId | null;
	/** BSP style ``description`` — used to derive pill/title colors. */
	styleDescription?: string;
	/** When true, Adaptarian titles use a red–green–grey gradient. */
	overallIsAdaptarian?: boolean;
};

export type AssessmentReportOverallStyleDescriptionProps = {
	title: string;
	description: string;
};

export type UserAssessmentStylesContextValue = {
	loadState: AssessmentReportSectionLoadState;
	styles: ApiUserAssessmentStylesResponse | null;
};

export type UserAssessmentStylesProviderProps = {
	assessmentId: string;
	enabled?: boolean;
	children: ReactNode;
};
