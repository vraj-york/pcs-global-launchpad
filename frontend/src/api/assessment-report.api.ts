import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib";

type ShareReportEnvelope = {
	success: boolean;
	message: string;
	data?: { sent: true };
};

export async function shareAssessmentReport(
	assessmentId: string,
	recipients: string[],
): Promise<
	{ ok: true; status: number } | { ok: false; message: string; status: number }
> {
	const trimmedId = assessmentId.trim();
	if (!trimmedId) {
		return { ok: false, message: "Assessment id is required.", status: 400 };
	}
	const list = [
		...new Set(
			recipients.map((e) => e.trim().toLowerCase()).filter((e) => e.length > 0),
		),
	];
	if (list.length === 0) {
		return {
			ok: false,
			message: "Add at least one recipient email.",
			status: 400,
		};
	}

	const path = API_ENDPOINTS.assessmentReports.shareReport(trimmedId);
	const result = await apiClient.post<ShareReportEnvelope>(path, {
		recipients: list,
	});
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	const inner = result.data.data;
	if (inner === undefined || inner.sent !== true) {
		return {
			ok: false,
			message: "Invalid response from server",
			status: result.status,
		};
	}
	return { ok: true, status: result.status };
}
