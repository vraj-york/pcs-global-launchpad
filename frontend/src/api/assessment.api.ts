import {
	API_ENDPOINTS,
	ASSESSMENT_API_BASE_URL,
	ASSESSMENT_API_MISSING_BASE_URL_MESSAGE,
	ASSESSMENT_BULK_PERSIST_409_MAX_RETRIES,
} from "@/const";
import { type ApiError, type ApiResponse, apiClient } from "@/lib";
import type {
	ApiAssessment,
	ApiBspStyle,
	ApiEnqueueReportResponse,
	ApiEnqueueScoringResponse,
	ApiQuestionResponseItem,
	ApiQuestionResponseOut,
	ApiQuestionWithOptions,
	ApiReportContentResponse,
	ApiUploadPrintHtmlResponse,
	ApiUserAssessmentStylesResponse,
} from "@/types";

function missingBaseUrlError(): ApiError {
	return {
		ok: false,
		message: ASSESSMENT_API_MISSING_BASE_URL_MESSAGE,
		status: 0,
	};
}

/**
 * GET /questions?limit=…&is_active=…
 * Public assessment API. Uses `VITE_BSP_ASSESSMENT_API_URL` (no trailing slash).
 */
export async function getQuestions(params: {
	limit?: number;
	is_active?: boolean;
}): Promise<ApiResponse<ApiQuestionWithOptions[]> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const sp = new URLSearchParams();
	if (params.limit != null) sp.set("limit", String(params.limit));
	if (params.is_active != null) sp.set("is_active", String(params.is_active));
	const q = sp.toString() ? `?${sp.toString()}` : "";
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.questions}${q}`;
	return apiClient.get<ApiQuestionWithOptions[]>(url);
}

/**
 * GET /assessments?status=…&skip=…&limit=…
 */
/**
 * GET /assessments/:id (includes report_key when a report row exists)
 */
export async function getAssessment(
	assessmentId: string,
): Promise<ApiResponse<ApiAssessment> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.byId(assessmentId)}`;
	return apiClient.get<ApiAssessment>(url);
}

/** GET /assessments/:id/user-styles — scored style breakdown with full bsp_styles rows. */
export async function getUserAssessmentStyles(
	assessmentId: string,
): Promise<ApiResponse<ApiUserAssessmentStylesResponse> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.userStyles(assessmentId)}`;
	return apiClient.get<ApiUserAssessmentStylesResponse>(url);
}

/**
 * GET /bsp-styles — all BSP style definitions (1–13).
 */
export async function getBspStyles(params?: {
	limit?: number;
}): Promise<ApiResponse<ApiBspStyle[]> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const sp = new URLSearchParams();
	if (params?.limit != null) {
		sp.set("limit", String(params.limit));
	}
	const q = sp.toString() ? `?${sp.toString()}` : "";
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.bspStyles}${q}`;
	return apiClient.get<ApiBspStyle[]>(url);
}

/** GET /report-content/:sectionKey — active report_content row (template JSON). */
export async function getReportContent(
	sectionKey: string,
): Promise<ApiResponse<ApiReportContentResponse> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.reportContent(sectionKey)}`;
	return apiClient.get<ApiReportContentResponse>(url);
}

export async function listAssessments(params?: {
	status?: "in_progress" | "completed" | "scored" | "report_generated";
	skip?: number;
	limit?: number;
}): Promise<ApiResponse<ApiAssessment[]> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const sp = new URLSearchParams();
	if (params?.status != null) sp.set("status", params.status);
	if (params?.skip != null) sp.set("skip", String(params.skip));
	if (params?.limit != null) sp.set("limit", String(params.limit));
	const q = sp.toString() ? `?${sp.toString()}` : "";
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.assessments}${q}`;
	return apiClient.get<ApiAssessment[]>(url);
}

/**
 * GET /assessments/:id/question-responses
 */
export async function getQuestionResponses(
	assessmentId: string,
): Promise<ApiResponse<ApiQuestionResponseOut[]> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.questionResponses(assessmentId)}`;
	return apiClient.get<ApiQuestionResponseOut[]>(url);
}

/**
 * POST /assessments
 */
export async function createAssessment(): Promise<
	ApiResponse<ApiAssessment> | ApiError
> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.assessments}`;
	return apiClient.post<ApiAssessment>(url, {});
}

/**
 * PUT /assessments/:id
 */
export async function updateAssessment(
	assessmentId: string,
	body: {
		status: "in_progress" | "completed" | "scored" | "report_generated";
	},
): Promise<ApiResponse<ApiAssessment> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.byId(assessmentId)}`;
	return apiClient.put<ApiAssessment>(url, body);
}

/**
 * POST /assessments/:id/enqueue-scoring — enqueue score worker (SQS); report follows when configured.
 */
export async function enqueueAssessmentScoring(
	assessmentId: string,
): Promise<ApiResponse<ApiEnqueueScoringResponse> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.enqueueScoring(assessmentId)}`;
	return apiClient.post<ApiEnqueueScoringResponse>(url, {});
}

export async function uploadAssessmentReportPrintHtml(
	assessmentId: string,
	html: string,
): Promise<ApiResponse<ApiUploadPrintHtmlResponse> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.reportPrintHtml(assessmentId)}`;
	return apiClient.post<ApiUploadPrintHtmlResponse>(url, { html });
}

export async function enqueueAssessmentReport(
	assessmentId: string,
	printHtmlS3Key: string,
): Promise<ApiResponse<ApiEnqueueReportResponse> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.enqueueReport(assessmentId)}`;
	return apiClient.post<ApiEnqueueReportResponse>(url, {
		print_html_s3_key: printHtmlS3Key,
	});
}

/**
 * POST /assessments/:id/question-responses/bulk
 */
export async function bulkCreateResponses(
	assessmentId: string,
	items: ApiQuestionResponseItem[],
): Promise<ApiResponse<ApiQuestionResponseOut[]> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.questionResponsesBulk(assessmentId)}`;
	return apiClient.post<ApiQuestionResponseOut[]>(url, { items });
}

/**
 * PUT /assessments/:id/question-responses/bulk
 */
export async function bulkUpdateResponses(
	assessmentId: string,
	items: ApiQuestionResponseItem[],
): Promise<ApiResponse<ApiQuestionResponseOut[]> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	const url = `${ASSESSMENT_API_BASE_URL}${API_ENDPOINTS.assessment.questionResponsesBulk(assessmentId)}`;
	return apiClient.put<ApiQuestionResponseOut[]>(url, { items });
}

/**
 * Create or update question responses for a section, with 409 → refetch option ids
 * and bounded retries (see `ASSESSMENT_BULK_PERSIST_409_MAX_RETRIES`).
 */
export async function bulkPersistSectionResponses(
	assessmentId: string,
	items: ApiQuestionResponseItem[],
	existingOptionIds: ReadonlySet<string>,
): Promise<ApiResponse<ApiQuestionResponseOut[]> | ApiError> {
	if (!ASSESSMENT_API_BASE_URL) {
		return missingBaseUrlError();
	}
	if (items.length === 0) {
		return { ok: true, data: [], status: 200 };
	}
	let effectiveIds = existingOptionIds;
	let conflictRefetchCount = 0;
	for (;;) {
		const toCreate = items.filter(
			(i) => !effectiveIds.has(String(i.option_id)),
		);
		const toUpdate = items.filter((i) => effectiveIds.has(String(i.option_id)));
		const out: ApiQuestionResponseOut[] = [];

		if (toCreate.length > 0) {
			const created = await bulkCreateResponses(assessmentId, toCreate);
			if (!created.ok) {
				if (
					created.status === 409 &&
					conflictRefetchCount < ASSESSMENT_BULK_PERSIST_409_MAX_RETRIES
				) {
					const fresh = await getQuestionResponses(assessmentId);
					if (fresh.ok) {
						effectiveIds = new Set(fresh.data.map((r) => String(r.option_id)));
						conflictRefetchCount += 1;
						continue;
					}
				}
				return created;
			}
			out.push(...created.data);
		}
		if (toUpdate.length > 0) {
			const updated = await bulkUpdateResponses(assessmentId, toUpdate);
			if (!updated.ok) {
				return updated;
			}
			out.push(...updated.data);
		}
		return { ok: true, data: out, status: 200 };
	}
}
