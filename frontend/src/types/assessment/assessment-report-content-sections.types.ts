import type { ApiReportContentResponse } from "./assessment.types";
import type { AssessmentReportSectionLoadState } from "./assessment-report-status-flow.types";

export type ReportContentSectionKey =
	| "welcome"
	| "colorInfo"
	| "communication"
	| "decreaseStress"
	| "bevspe"
	| "nextSteps";

export type ReportContentSectionConfig = {
	key: ReportContentSectionKey;
	sectionKey: string;
	loadErrorMessage: string;
};

export type ReportContentSectionState = {
	loadState: AssessmentReportSectionLoadState;
	payload: ApiReportContentResponse | null;
};

export type AssessmentReportResultsContentProps = {
	welcomeDisplayName: string;
	onShare?: () => void;
};
