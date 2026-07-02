import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

// ─── Axios mock ─────────────────────────────────────────────────────────────
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/api/chatbot.api", () => ({
	chatbotAxios: {
		get: mockGet,
		delete: mockDelete,
		post: mockPost,
		patch: mockPatch,
	},
}));

// ─── DOM stub helpers ────────────────────────────────────────────────────────
// The unit test project runs in a Node environment; exportThread relies on
// browser-only APIs that must be stubbed before the tested function runs.

const mockAnchorClick = vi.fn();
let mockAnchor: {
	href: string;
	download: string;
	click: typeof mockAnchorClick;
};

const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockCreateObjectURL = vi.fn().mockReturnValue("blob:fake-url");
const mockRevokeObjectURL = vi.fn();

beforeAll(() => {
	// URL.createObjectURL / revokeObjectURL are absent in Node.
	global.URL.createObjectURL = mockCreateObjectURL;
	global.URL.revokeObjectURL = mockRevokeObjectURL;

	// document is absent in Node.
	vi.stubGlobal("document", {
		createElement: vi.fn(() => {
			mockAnchor = { href: "", download: "", click: mockAnchorClick };
			return mockAnchor;
		}),
		body: { appendChild: mockAppendChild, removeChild: mockRemoveChild },
	});
});

afterAll(() => {
	vi.unstubAllGlobals();
});

// ─── exportThread ─────────────────────────────────────────────────────────────

describe("chatbotThreadsApi.exportThread", () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockAnchorClick.mockReset();
		mockCreateObjectURL.mockReset().mockReturnValue("blob:fake-url");
		mockRevokeObjectURL.mockReset();
		mockAppendChild.mockReset();
		mockRemoveChild.mockReset();
	});

	it("calls GET /threads/{id}/export with display_name param", async () => {
		mockGet.mockResolvedValue({
			data: { filename: "test.pdf", data: "dGVzdA==" },
		});

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		await chatbotThreadsApi.exportThread("thread-abc", "My Thread", "Jane Doe");

		expect(mockGet).toHaveBeenCalledWith(
			"/threads/thread-abc/export",
			expect.objectContaining({
				params: { display_name: "Jane Doe" },
				timeout: 30000,
			}),
		);
	});

	it("omits display_name param when an empty string is provided", async () => {
		mockGet.mockResolvedValue({
			data: { filename: "test.pdf", data: "dGVzdA==" },
		});

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		await chatbotThreadsApi.exportThread("thread-abc", "My Thread", "");

		expect(mockGet).toHaveBeenCalledWith(
			"/threads/thread-abc/export",
			expect.objectContaining({ params: { display_name: undefined } }),
		);
	});

	it("uses the server-provided filename for the download", async () => {
		mockGet.mockResolvedValue({
			data: { filename: "server-name.pdf", data: "dGVzdA==" },
		});

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		await chatbotThreadsApi.exportThread("thread-1", "Any Title", "John");

		expect(mockAnchor.download).toBe("server-name.pdf");
	});

	it("falls back to a client-generated filename when server returns null", async () => {
		mockGet.mockResolvedValue({ data: { filename: null, data: "dGVzdA==" } });

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		await chatbotThreadsApi.exportThread(
			"thread-1",
			"Stress Management",
			"John",
		);

		expect(mockAnchor.download).toMatch(
			/^conversation-stress-management-\d{4}-\d{2}-\d{2}\.pdf$/,
		);
	});

	it("creates a Blob, triggers anchor click, and revokes the object URL", async () => {
		mockGet.mockResolvedValue({
			data: { filename: "out.pdf", data: "dGVzdA==" },
		});

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		await chatbotThreadsApi.exportThread("thread-1", "Title", "User");

		expect(mockCreateObjectURL).toHaveBeenCalledOnce();
		expect(mockAnchor.href).toBe("blob:fake-url");
		expect(mockAnchorClick).toHaveBeenCalledOnce();
		expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
	});

	it("appends the anchor to body then removes it after click", async () => {
		mockGet.mockResolvedValue({
			data: { filename: "out.pdf", data: "dGVzdA==" },
		});

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		await chatbotThreadsApi.exportThread("thread-1", "Title", "User");

		expect(mockAppendChild).toHaveBeenCalledOnce();
		expect(mockRemoveChild).toHaveBeenCalledOnce();
	});

	it("returns { ok: true } on success", async () => {
		mockGet.mockResolvedValue({
			data: { filename: "test.pdf", data: "dGVzdA==" },
		});

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		const result = await chatbotThreadsApi.exportThread("thread-1", "T", "U");

		expect(result.ok).toBe(true);
	});

	it("returns ok:false with the server detail message on API error", async () => {
		mockGet.mockRejectedValue({
			response: { data: { detail: "Rate limit exceeded" } },
		});

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		const result = await chatbotThreadsApi.exportThread("thread-1", "T", "U");

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toBe("Rate limit exceeded");
	});

	it("returns ok:false with fallback message when error has no detail", async () => {
		mockGet.mockRejectedValue(new Error("network timeout"));

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		const result = await chatbotThreadsApi.exportThread("thread-1", "T", "U");

		expect(result.ok).toBe(false);
		if (!result.ok)
			expect(result.message).toBe("Failed to export conversation.");
	});
});

// ─── deleteThread ─────────────────────────────────────────────────────────────

describe("chatbotThreadsApi.deleteThread", () => {
	beforeEach(() => {
		mockDelete.mockReset();
	});

	it("calls DELETE /threads/{id} and returns ok:true", async () => {
		mockDelete.mockResolvedValue({});

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		const result = await chatbotThreadsApi.deleteThread("thread-42");

		expect(mockDelete).toHaveBeenCalledWith(
			"/threads/thread-42",
			expect.objectContaining({ timeout: 30000 }),
		);
		expect(result.ok).toBe(true);
	});

	it("returns ok:false with detail message on server error", async () => {
		mockDelete.mockRejectedValue({
			response: { data: { detail: "Thread not found" } },
		});

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		const result = await chatbotThreadsApi.deleteThread("thread-99");

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toBe("Thread not found");
	});

	it("returns ok:false with fallback message when error has no detail", async () => {
		mockDelete.mockRejectedValue(new Error("network"));

		const { chatbotThreadsApi } = await import("@/api/chatbot-threads.api");
		const result = await chatbotThreadsApi.deleteThread("thread-99");

		expect(result.ok).toBe(false);
		if (!result.ok)
			expect(result.message).toBe("Failed to delete conversation.");
	});
});
