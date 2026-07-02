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

describe("support.api submitSupportRequest", () => {
	beforeEach(() => {
		mockPost.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("posts FormData to support-requests with text fields and attachments", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 201,
			data: { success: true, message: "Support request submitted" },
		});

		const png = new File(["png"], "screenshot.png", { type: "image/png" });
		const jpeg = new File(["jpeg"], "screenshot.jpeg", { type: "image/jpeg" });

		const { submitSupportRequest } = await import("@/api/support.api");
		const result = await submitSupportRequest({
			email: "aa@example.com",
			subject: "Login issue",
			message: "See attached screenshots.",
			attachments: [png, jpeg],
		});

		expect(result).toEqual({
			ok: true,
			message: "Support request submitted",
		});
		expect(mockPost).toHaveBeenCalledTimes(1);

		const [url, body] = mockPost.mock.calls[0] as [string, FormData];
		expect(url).toBe(API_ENDPOINTS.support.root);
		expect(body).toBeInstanceOf(FormData);
		expect((body as FormData).get("email")).toBe("aa@example.com");
		expect((body as FormData).get("subject")).toBe("Login issue");
		expect((body as FormData).get("message")).toBe("See attached screenshots.");
		expect((body as FormData).getAll("attachments")).toEqual([png, jpeg]);
	});

	it("returns structured failure when body.success is false", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 400,
			data: { success: false, message: "Invalid email" },
		});

		const { submitSupportRequest } = await import("@/api/support.api");
		const result = await submitSupportRequest({
			email: "bad",
			subject: "Help",
			message: "",
		});

		expect(result).toEqual({
			ok: false,
			message: "Invalid email",
			status: 400,
		});
	});

	it("returns ApiError when post fails", async () => {
		mockPost.mockResolvedValue({
			ok: false,
			message: "Network error",
			status: 503,
		});

		const { submitSupportRequest } = await import("@/api/support.api");
		const result = await submitSupportRequest({
			email: "aa@example.com",
			subject: "Login issue",
			message: "Help",
		});

		expect(result).toEqual({
			ok: false,
			message: "Network error",
			status: 503,
		});
	});
});
