import type { ApiQuestionWithOptions } from "./assessment.types";

/** In-memory per-question Likert state (4 rows, display order). */
export type ScoreState = Record<string, (number | null)[]>;

/**
 * Rehydration payload when `GET /assessments?status=in_progress` returns an
 * existing assessment; drives initial section, scores, save-vs-update flags,
 * and scroll to first incomplete item.
 */
export type AssessmentSessionInitialState = {
	activeSection: number;
	scores: ScoreState;
	/** 0-based index into the 15 questions of `activeSection`. */
	scrollToQuestionIndex: number;
};

export type LoadedAssessmentSession = {
	assessmentId: string;
	questions: ApiQuestionWithOptions[];
	sessionInitial: AssessmentSessionInitialState | null;
	persistedOptionIds: readonly string[];
	/** All questions answered; user is on the review page but has not submitted yet. */
	allQuestionsAnswered: boolean;
};

export type AssessmentSessionContentProps = {
	assessmentId: string;
	persistenceEnabled?: boolean;
	questions: ApiQuestionWithOptions[];
	onBackToInstructions: () => void;
	onAssessmentComplete: (assessmentId: string) => void;
	sessionInitial?: AssessmentSessionInitialState | null;
	initialPersistedOptionIds?: readonly string[];
};
