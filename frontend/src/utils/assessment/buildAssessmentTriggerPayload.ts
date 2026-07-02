import type {
	ApiUserAssessmentStylesResponse,
	ChatbotAssessmentTriggerPayload,
} from "@/types";
import { getOverallStressfulDominantMindState } from "./assessmentUserStyles";

export function buildAssessmentTriggerPayload(
	assessmentId: string,
	displayName: string,
	styles: ApiUserAssessmentStylesResponse | null,
): ChatbotAssessmentTriggerPayload {
	const category = styles?.overall_style?.style?.title?.trim() || null;
	const dominant = styles?.overall_stressful_scores
		? getOverallStressfulDominantMindState(styles.overall_stressful_scores)
		: null;
	const score = dominant?.label?.trim() || null;
	const name = displayName.trim() || null;

	return {
		assessmentId,
		displayName: name,
		category,
		score,
	};
}
