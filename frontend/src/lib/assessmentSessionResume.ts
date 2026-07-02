import {
	ASSESSMENT_QUESTIONS_PER_SECTION,
	ASSESSMENT_SECTION_COUNT,
} from "@/const";
import type {
	ApiQuestionOption,
	ApiQuestionResponseOut,
	ApiQuestionWithOptions,
	AssessmentSessionInitialState,
	ScoreState,
} from "@/types";
import { isValidLikertSelection } from "./assessmentLikert";

function sortOptions(opts: ApiQuestionOption[]): ApiQuestionOption[] {
	return [...opts].sort((a, b) => a.display_order - b.display_order);
}

function splitQuestionSections(ordered: ApiQuestionWithOptions[]) {
	if (
		ordered.length <
		ASSESSMENT_SECTION_COUNT * ASSESSMENT_QUESTIONS_PER_SECTION
	) {
		return null;
	}
	return Array.from({ length: ASSESSMENT_SECTION_COUNT }, (_, s) =>
		ordered.slice(
			s * ASSESSMENT_QUESTIONS_PER_SECTION,
			s * ASSESSMENT_QUESTIONS_PER_SECTION + ASSESSMENT_QUESTIONS_PER_SECTION,
		),
	);
}

function emptyRow(): (number | null)[] {
	return [null, null, null, null];
}

/**
 * Maps `GET /assessments/.../question-responses` rows into per-question Likert
 * arrays keyed by `question.id` (option order = display order).
 */
function buildScoresFromQuestionResponses(
	questions: ApiQuestionWithOptions[],
	responses: readonly ApiQuestionResponseOut[],
): ScoreState {
	const byOptionId = new Map(
		responses.map((r) => [r.option_id, r.value] as const),
	);
	const scores: ScoreState = {};
	for (const q of questions) {
		const opts = sortOptions(q.options);
		if (opts.length !== 4) continue;
		const row: (number | null)[] = [null, null, null, null];
		for (let i = 0; i < 4; i++) {
			const v = byOptionId.get(opts[i]!.id);
			if (v !== undefined) row[i] = v;
		}
		if (row.some((s) => s !== null)) {
			scores[q.id] = row;
		}
	}
	return scores;
}

/**
 * Picks the section containing the first incomplete (invalid Likert) question,
 * marks full sections for bulk update, and the question index to scroll to.
 */
export function buildSessionResumeState(
	questions: ApiQuestionWithOptions[],
	responses: readonly ApiQuestionResponseOut[],
): AssessmentSessionInitialState {
	const sections = splitQuestionSections(questions);
	const scores = buildScoresFromQuestionResponses(questions, responses);
	if (!sections) {
		return {
			activeSection: 0,
			scores: {},
			scrollToQuestionIndex: 0,
		};
	}

	const getSel = (q: ApiQuestionWithOptions): (number | null)[] =>
		scores[q.id] ?? emptyRow();

	let activeSection = ASSESSMENT_SECTION_COUNT - 1;
	for (let s = 0; s < ASSESSMENT_SECTION_COUNT; s++) {
		const sec = sections[s]!;
		const nComplete = sec.filter((q) =>
			isValidLikertSelection(getSel(q)),
		).length;
		if (nComplete < ASSESSMENT_QUESTIONS_PER_SECTION) {
			activeSection = s;
			break;
		}
	}

	const current = sections[activeSection]!;
	let scrollToQuestionIndex = 0;
	for (let i = 0; i < current.length; i++) {
		if (!isValidLikertSelection(getSel(current[i]!))) {
			scrollToQuestionIndex = i;
			break;
		}
	}

	return {
		activeSection,
		scores,
		scrollToQuestionIndex,
	};
}

/** True when every question has a valid Likert selection (assessment finished, not yet submitted). */
export function isAssessmentFullyAnswered(
	questions: ApiQuestionWithOptions[],
	responses: readonly ApiQuestionResponseOut[],
): boolean {
	const sections = splitQuestionSections(questions);
	if (!sections) {
		return false;
	}
	const scores = buildScoresFromQuestionResponses(questions, responses);
	const getSel = (q: ApiQuestionWithOptions): (number | null)[] =>
		scores[q.id] ?? emptyRow();
	return sections.every((sec) =>
		sec.every((q) => isValidLikertSelection(getSel(q))),
	);
}
