import type { ApiError, ApiResponse } from "@/lib";
import type {
	ApiAssessment,
	ApiEnqueueReportResponse,
	ApiEnqueueScoringResponse,
	ApiQuestionResponseItem,
	ApiQuestionResponseOut,
	ApiQuestionWithOptions,
	ApiUploadPrintHtmlResponse,
} from "./assessment.types";

/** Assessment store state; extend when adding cross-screen assessment UI state. */
export type AssessmentState = Record<never, never>;

export type AssessmentActions = {
	getQuestions: (params: {
		limit?: number;
		is_active?: boolean;
	}) => Promise<ApiResponse<ApiQuestionWithOptions[]> | ApiError>;
	listAssessments: (params?: {
		status?: "in_progress" | "completed" | "scored" | "report_generated";
		skip?: number;
		limit?: number;
	}) => Promise<ApiResponse<ApiAssessment[]> | ApiError>;
	getAssessment: (
		assessmentId: string,
	) => Promise<ApiResponse<ApiAssessment> | ApiError>;
	getQuestionResponses: (
		assessmentId: string,
	) => Promise<ApiResponse<ApiQuestionResponseOut[]> | ApiError>;
	createAssessment: () => Promise<ApiResponse<ApiAssessment> | ApiError>;
	updateAssessment: (
		assessmentId: string,
		body: {
			status: "in_progress" | "completed" | "scored" | "report_generated";
		},
	) => Promise<ApiResponse<ApiAssessment> | ApiError>;
	enqueueAssessmentScoring: (
		assessmentId: string,
	) => Promise<ApiResponse<ApiEnqueueScoringResponse> | ApiError>;
	uploadAssessmentReportPrintHtml: (
		assessmentId: string,
		html: string,
	) => Promise<ApiResponse<ApiUploadPrintHtmlResponse> | ApiError>;
	enqueueAssessmentReport: (
		assessmentId: string,
		printHtmlS3Key: string,
	) => Promise<ApiResponse<ApiEnqueueReportResponse> | ApiError>;
	bulkCreateResponses: (
		assessmentId: string,
		items: ApiQuestionResponseItem[],
	) => Promise<ApiResponse<ApiQuestionResponseOut[]> | ApiError>;
	bulkUpdateResponses: (
		assessmentId: string,
		items: ApiQuestionResponseItem[],
	) => Promise<ApiResponse<ApiQuestionResponseOut[]> | ApiError>;
	bulkPersistSectionResponses: (
		assessmentId: string,
		items: ApiQuestionResponseItem[],
		existingOptionIds: ReadonlySet<string>,
	) => Promise<ApiResponse<ApiQuestionResponseOut[]> | ApiError>;
	reset: () => void;
};

export type AssessmentStore = AssessmentState & AssessmentActions;
