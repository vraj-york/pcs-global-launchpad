import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "@/const";

const { mockPost } = vi.hoisted(() => ({
	mockPost: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
	apiClient: {
		get: vi.fn(),
		post: mockPost,
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
	isApiError: (response: { ok: boolean }) => !response.ok,
}));

describe("privacy-data.api", () => {
	beforeEach(() => {
		mockPost.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("sendDataDownloadOtp hits send-otp endpoint and parses email", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "Sent",
				data: { email: "user@example.com" },
			},
		});

		const { sendDataDownloadOtp } = await import("@/api/privacy-data.api");
		const result = await sendDataDownloadOtp();

		expect(result).toEqual({
			ok: true,
			message: "Sent",
			email: "user@example.com",
		});
		expect(mockPost).toHaveBeenCalledWith(
			API_ENDPOINTS.users.privacyDataExportSendOtp,
		);
	});

	it("resendDataDownloadOtp hits resend-otp endpoint", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "Resent",
				data: { email: "user@example.com" },
			},
		});

		const { resendDataDownloadOtp } = await import("@/api/privacy-data.api");
		const result = await resendDataDownloadOtp();

		expect(result).toEqual({
			ok: true,
			message: "Resent",
			email: "user@example.com",
		});
		expect(mockPost).toHaveBeenCalledWith(
			API_ENDPOINTS.users.privacyDataExportResendOtp,
		);
	});

	it("verifyDataDownloadOtp posts otp to verify endpoint", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "Request submitted" },
		});

		const { verifyDataDownloadOtp } = await import("@/api/privacy-data.api");
		const result = await verifyDataDownloadOtp({ otp: "123456" });

		expect(result).toEqual({ ok: true, message: "Request submitted" });
		expect(mockPost).toHaveBeenCalledWith(
			API_ENDPOINTS.users.privacyDataExportVerify,
			{ otp: "123456" },
		);
	});
});
