import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type {
	ChangePasswordPayload,
	MfaOtpAction,
	SecurityStatusData,
	VerifyMfaOtpPayload,
} from "@/types";

/**
 * GET /users/me/security — MFA status and registered email.
 */
export async function getSecurityStatus() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: SecurityStatusData;
	}>(API_ENDPOINTS.users.accountSecurity);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	if (body.data === undefined) {
		return {
			ok: false as const,
			message: "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: body.data, status: result.status };
}

/**
 * POST /users/me/security/change-password
 */
export async function postChangePassword(payload: ChangePasswordPayload) {
	const result = await apiClient.post<{
		success: boolean;
		message: string;
	}>(API_ENDPOINTS.users.accountSecurityChangePassword, payload);
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
		status: result.status,
	};
}

async function postMfaOtpAction(
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

async function postMfaVerify(
	url: string,
	payload: VerifyMfaOtpPayload,
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
 * POST /users/me/security/mfa/{enable|disable}/send-otp
 */
export function sendMfaOtp(action: MfaOtpAction) {
	return postMfaOtpAction(
		API_ENDPOINTS.users.accountSecurityMfaSendOtp(action),
	);
}

/**
 * POST /users/me/security/mfa/{enable|disable}/resend-otp
 */
export function resendMfaOtp(action: MfaOtpAction) {
	return postMfaOtpAction(
		API_ENDPOINTS.users.accountSecurityMfaResendOtp(action),
	);
}

/**
 * POST /users/me/security/mfa/{enable|disable}/verify
 */
export function verifyMfaOtp(
	action: MfaOtpAction,
	payload: VerifyMfaOtpPayload,
) {
	return postMfaVerify(
		API_ENDPOINTS.users.accountSecurityMfaVerify(action),
		payload,
	);
}
