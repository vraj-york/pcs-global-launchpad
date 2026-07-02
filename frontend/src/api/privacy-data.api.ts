import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type { VerifyDataDownloadOtpPayload } from "@/types";

async function postDataDownloadOtpAction(
	url: string,
): Promise<
	| { ok: true; message: string; email: string }
	| { ok: false; message: string; status?: number }
> {
	const result = await apiClient.post<{
		success: boolean;
		message: string;
		data?: { email: string };
	}>(url);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	const email = body.data?.email;
	if (!email) {
		return {
			ok: false as const,
			message: "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
		email,
	};
}

async function postDataDownloadVerify(
	url: string,
	payload: VerifyDataDownloadOtpPayload,
): Promise<
	| { ok: true; message: string }
	| { ok: false; message: string; status?: number }
> {
	const result = await apiClient.post<{
		success: boolean;
		message: string;
	}>(url, payload);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
	};
}

/**
 * POST /users/me/privacy/data-export/send-otp
 */
export function sendDataDownloadOtp() {
	return postDataDownloadOtpAction(
		API_ENDPOINTS.users.privacyDataExportSendOtp,
	);
}

/**
 * POST /users/me/privacy/data-export/resend-otp
 */
export function resendDataDownloadOtp() {
	return postDataDownloadOtpAction(
		API_ENDPOINTS.users.privacyDataExportResendOtp,
	);
}

/**
 * POST /users/me/privacy/data-export/verify
 */
export function verifyDataDownloadOtp(payload: VerifyDataDownloadOtpPayload) {
	return postDataDownloadVerify(
		API_ENDPOINTS.users.privacyDataExportVerify,
		payload,
	);
}
