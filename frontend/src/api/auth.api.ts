import { API_ENDPOINTS } from "@/const";
import { type ApiError, type ApiResponse, apiClient } from "@/lib/apiClient";
import type {
	PasswordResetConfirmPayload,
	PasswordResetConfirmResponse,
	PasswordResetRequestPayload,
	PasswordResetRequestResponse,
	PasswordResetResendPayload,
	PasswordResetResendResponse,
	PasswordResetValidatePayload,
	PasswordResetValidateResponse,
} from "@/types";

/**
 * Auth API Service
 * Handles all authentication-related API calls
 * Following Single Responsibility Principle
 */
export const authApi = {
	/**
	 * Request password reset
	 * Sends a 6-digit reset code to the user's email
	 * @param payload - Email address for password reset
	 * @returns API response (always success to prevent email enumeration)
	 */
	requestPasswordReset: (
		payload: PasswordResetRequestPayload,
	): Promise<ApiResponse<PasswordResetRequestResponse> | ApiError> =>
		apiClient.post<PasswordResetRequestResponse>(
			API_ENDPOINTS.auth.passwordReset.request,
			payload,
		),
	/**
	 * Validate password reset token
	 * Validates the reset token without changing the password
	 * @param payload - Email address and token for password reset
	 * @returns API response (always success to prevent email enumeration)
	 */
	validatePasswordReset: (
		payload: PasswordResetValidatePayload,
	): Promise<ApiResponse<PasswordResetValidateResponse> | ApiError> =>
		apiClient.post<PasswordResetValidateResponse>(
			API_ENDPOINTS.auth.passwordReset.validate,
			payload,
		),
	/**
	 * Resend password reset code
	 * Generates a new reset code and sends it to the user's email (invalidates any previous codes)
	 * @param payload - Email address for password reset
	 * @returns API response (always success to prevent email enumeration)
	 */
	resendPasswordReset: (
		payload: PasswordResetResendPayload,
	): Promise<ApiResponse<PasswordResetResendResponse> | ApiError> =>
		apiClient.post<PasswordResetResendResponse>(
			API_ENDPOINTS.auth.passwordReset.resend,
			payload,
		),
	/**
	 * Confirm password reset
	 * Confirms the password reset by validating the token and setting the new password
	 * @param payload - Email address, token, and new password for password reset
	 * @returns API response (always success to prevent email enumeration)
	 */
	confirmPasswordReset: (
		payload: PasswordResetConfirmPayload,
	): Promise<ApiResponse<PasswordResetConfirmResponse> | ApiError> =>
		apiClient.post<PasswordResetConfirmResponse>(
			API_ENDPOINTS.auth.passwordReset.confirm,
			payload,
		),
};
