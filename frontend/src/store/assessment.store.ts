import { create } from "zustand";
import {
	bulkCreateResponses as bulkCreateResponsesApi,
	bulkPersistSectionResponses as bulkPersistSectionResponsesApi,
	bulkUpdateResponses as bulkUpdateResponsesApi,
	createAssessment as createAssessmentApi,
	enqueueAssessmentReport as enqueueAssessmentReportApi,
	enqueueAssessmentScoring as enqueueAssessmentScoringApi,
	getAssessment as getAssessmentApi,
	getQuestionResponses as getQuestionResponsesApi,
	getQuestions as getQuestionsApi,
	listAssessments as listAssessmentsApi,
	updateAssessment as updateAssessmentApi,
	uploadAssessmentReportPrintHtml as uploadAssessmentReportPrintHtmlApi,
} from "@/api";
import type { AssessmentState, AssessmentStore } from "@/types";

const initialState: AssessmentState = {};

export const useAssessmentStore = create<AssessmentStore>()((set) => ({
	...initialState,

	getQuestions: (params) => getQuestionsApi(params),

	listAssessments: (params) => listAssessmentsApi(params),

	getAssessment: (assessmentId) => getAssessmentApi(assessmentId),

	getQuestionResponses: (assessmentId) => getQuestionResponsesApi(assessmentId),

	createAssessment: () => createAssessmentApi(),

	updateAssessment: (assessmentId, body) =>
		updateAssessmentApi(assessmentId, body),

	enqueueAssessmentScoring: (assessmentId) =>
		enqueueAssessmentScoringApi(assessmentId),

	uploadAssessmentReportPrintHtml: (assessmentId, html) =>
		uploadAssessmentReportPrintHtmlApi(assessmentId, html),

	enqueueAssessmentReport: (assessmentId, printHtmlS3Key) =>
		enqueueAssessmentReportApi(assessmentId, printHtmlS3Key),

	bulkCreateResponses: (assessmentId, items) =>
		bulkCreateResponsesApi(assessmentId, items),

	bulkUpdateResponses: (assessmentId, items) =>
		bulkUpdateResponsesApi(assessmentId, items),

	bulkPersistSectionResponses: (assessmentId, items, existingOptionIds) =>
		bulkPersistSectionResponsesApi(assessmentId, items, existingOptionIds),

	reset: () => set(initialState),
}));
