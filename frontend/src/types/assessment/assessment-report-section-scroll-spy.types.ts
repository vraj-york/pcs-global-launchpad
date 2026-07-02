import type { AssessmentReportResultsNavId } from "./assessment-report-results.types";

export type AssessmentReportSectionScrollSpyResult = {
	activeId: AssessmentReportResultsNavId;
	setActiveFromNavClick: (navId: AssessmentReportResultsNavId) => void;
};
