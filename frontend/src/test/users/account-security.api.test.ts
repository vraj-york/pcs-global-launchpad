import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "@/const";

const { mockPost, mockGet } = vi.hoisted(() => ({
	mockPost: vi.fn(),
	mockGet: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
	apiClient: {
		get: mockGet,
		post: mockPost,
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
	isApiError: (response: { ok: boolean }) => !response.ok,
}));

describe("account-security.api", () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockPost.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("getSecurityStatus returns data when success", async () => {
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "ok",
				data: {
					mfaEnabled: false,
					mfaMethod: null,
					email: "user@example.com",
				},
			},
		});

		const { getSecurityStatus } = await import("@/api/account-security.api");
		const result = await getSecurityStatus();

		expect(result).toEqual({
			ok: true,
			data: {
				mfaEnabled: false,
				mfaMethod: null,
				email: "user@example.com",
			},
			status: 200,
		});
		expect(mockGet).toHaveBeenCalledWith(API_ENDPOINTS.users.accountSecurity);
	});

	it("postChangePassword posts payload to change-password endpoint", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "Password updated" },
		});

		const payload = {
			currentPassword: "OldP@ss1",
			newPassword: "NewP@ss2!",
			confirmPassword: "NewP@ss2!",
		};

		const { postChangePassword } = await import("@/api/account-security.api");
		const result = await postChangePassword(payload);

		expect(result).toEqual({
			ok: true,
			message: "Password updated",
			status: 200,
		});
		expect(mockPost).toHaveBeenCalledWith(
			API_ENDPOINTS.users.accountSecurityChangePassword,
			payload,
		);
	});

	it("sendMfaOtp uses enable or disable send-otp path", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "Sent",
				data: { email: "user@example.com" },
			},
		});

		const { sendMfaOtp } = await import("@/api/account-security.api");
		const enableResult = await sendMfaOtp("enable");
		const disableResult = await sendMfaOtp("disable");

		expect(enableResult).toEqual({
			ok: true,
			message: "Sent",
			email: "user@example.com",
		});
		expect(disableResult.ok).toBe(true);
		expect(mockPost).toHaveBeenNthCalledWith(
			1,
			API_ENDPOINTS.users.accountSecurityMfaSendOtp("enable"),
		);
		expect(mockPost).toHaveBeenNthCalledWith(
			2,
			API_ENDPOINTS.users.accountSecurityMfaSendOtp("disable"),
		);
	});

	it("verifyMfaOtp posts otp to verify endpoint for action", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "MFA enabled" },
		});

		const { verifyMfaOtp } = await import("@/api/account-security.api");
		const result = await verifyMfaOtp("enable", { otp: "123456" });

		expect(result).toEqual({ ok: true, message: "MFA enabled" });
		expect(mockPost).toHaveBeenCalledWith(
			API_ENDPOINTS.users.accountSecurityMfaVerify("enable"),
			{ otp: "123456" },
		);
	});
});
