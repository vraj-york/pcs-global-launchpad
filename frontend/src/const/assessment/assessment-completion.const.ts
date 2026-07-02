import type { AssessmentCompletionSectionRow } from "@/types";
import {
	ASSESSMENT_QUESTIONS_PER_SECTION,
	ASSESSMENT_SECTION_COUNT,
} from "./assessment-session.const";

export const ASSESSMENT_COMPLETION = {
	title: "Assessment Complete!",
	subtitle:
		"You've answered all 60 questions across 4 behavioral contexts. Review your summary below, then submit to generate your personalized report.",
	overviewTitle: "Completion Overview",
	questionsPerSectionLabel: (n: number) => `${n} questions answered`,
	totalQuestions: "Total Questions",
	totalSections: "Total Sections",
	totalProgress: "Total Progress",
	whatNextTitle: "What Happens Next?",
	whatNext: [
		"Your answers will be scored and analyzed.",
		"Your behavioral profile will be generated.",
		"You'll receive a personalized report with insights.",
		"BiSPy Bot will help you understand your results.",
	] as const,
	reviewAnswers: "Review Your Answers",
	reviewMissingSession:
		"We could not open your answers. Return to the assessment from the start.",
	reviewResumeStatusError:
		"We couldn't reopen your assessment for editing. Please try again.",
	submitReport: "Submit & Generate Your Report",
	submitAssessment: "Submit Assessment",
	enqueueReportError:
		"We couldn't start report generation. Please try again in a moment.",
} as const;

export const ASSESSMENT_COMPLETION_SECTION_ROW: readonly AssessmentCompletionSectionRow[] =
	[
		{
			shell: "bg-success-bg",
			label: "text-icon-success",
		},
		{
			shell: "bg-warning-bg",
			label: "text-icon-warning",
		},
		{
			shell: "bg-info-bg",
			label: "text-icon-info",
		},
		{
			shell: "bg-error-bg",
			label: "text-icon-error",
		},
	] as const;

const ASSESSMENT_COMPLETION_TOTAL_QUESTIONS =
	ASSESSMENT_SECTION_COUNT * ASSESSMENT_QUESTIONS_PER_SECTION;

export const ASSESSMENT_COMPLETION_OVERVIEW_STATS = [
	{
		value: String(ASSESSMENT_COMPLETION_TOTAL_QUESTIONS),
		label: ASSESSMENT_COMPLETION.totalQuestions,
	},
	{
		value: String(ASSESSMENT_SECTION_COUNT),
		label: ASSESSMENT_COMPLETION.totalSections,
	},
	{ value: "100%", label: ASSESSMENT_COMPLETION.totalProgress },
] as const;
