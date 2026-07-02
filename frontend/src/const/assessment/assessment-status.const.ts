import type { AssessmentStatus } from "@/types";

export const ASSESSMENT_STATUS = {
	IN_PROGRESS: "in_progress",
	COMPLETED: "completed",
	SCORED: "scored",
	REPORT_GENERATED: "report_generated",
} as const satisfies Record<string, AssessmentStatus>;
