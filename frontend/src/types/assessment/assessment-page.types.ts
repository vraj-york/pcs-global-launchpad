import type { LoadedAssessmentSession } from "./assessment-session.types";

export type AssessmentPageLocalSession = LoadedAssessmentSession;

export type AssessmentPageStep =
	| "intro"
	| "instructions"
	| "active"
	| "complete";

export type AssessmentPageLocationState = {
	reviewAssessmentId?: string;
	/** Open completion summary for this assessment (e.g. back from report results). */
	openCompleteFor?: string;
	/** Open the question session for editing, even when all answers are saved. */
	editAnswers?: boolean;
};
