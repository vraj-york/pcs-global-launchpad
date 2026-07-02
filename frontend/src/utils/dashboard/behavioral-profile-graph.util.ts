import { listAssessments } from "@/api";
import { BEHAVIORAL_PROFILE_GRAPH_SCORED_ASSESSMENT_STATUSES } from "@/const";
import { isApiError } from "@/lib";
import type { LatestScoredAssessment } from "@/types";

export async function resolveLatestScoredAssessment(): Promise<LatestScoredAssessment | null> {
	for (const status of BEHAVIORAL_PROFILE_GRAPH_SCORED_ASSESSMENT_STATUSES) {
		const result = await listAssessments({ status, limit: 1 });
		const assessment = !isApiError(result) ? result.data[0] : undefined;
		if (assessment?.id) {
			return {
				id: assessment.id,
				completedAt: assessment.completed_at ?? null,
			};
		}
	}
	return null;
}

export async function resolveLatestScoredAssessmentId(): Promise<
	string | null
> {
	const latest = await resolveLatestScoredAssessment();
	return latest?.id ?? null;
}
