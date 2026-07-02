import type {
	ApiUserAssessmentStylesResponse,
	AssessmentReportContextStyleSectionKey,
	QuadrantScoreBreakdown,
} from "@/types";

export function getQuadrantScoresForContext(
	styles: ApiUserAssessmentStylesResponse,
	contextKey: AssessmentReportContextStyleSectionKey,
): QuadrantScoreBreakdown | null {
	switch (contextKey) {
		case "professional_typical": {
			const scores = styles.professional_typical_scores;
			return {
				red: scores.prtred,
				green: scores.prtgreen,
				grey: scores.prtgrey,
				blue: scores.prtblue,
			};
		}
		case "professional_stressful": {
			const scores = styles.professional_stressful_scores;
			return {
				red: scores.prsred,
				green: scores.prsgreen,
				grey: scores.prsgrey,
				blue: scores.prsblue,
			};
		}
		case "personal_typical": {
			const scores = styles.personal_typical_scores;
			return {
				red: scores.petred,
				green: scores.petgreen,
				grey: scores.petgrey,
				blue: scores.petblue,
			};
		}
		case "personal_stressful": {
			const scores = styles.personal_stressful_scores;
			return {
				red: scores.pesred,
				green: scores.pesgreen,
				grey: scores.pesgrey,
				blue: scores.pesblue,
			};
		}
		default:
			return null;
	}
}
