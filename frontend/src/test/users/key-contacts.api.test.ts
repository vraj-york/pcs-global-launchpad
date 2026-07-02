import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "@/const";

const { mockPost, mockPatch, mockDelete } = vi.hoisted(() => ({
	mockPost: vi.fn(),
	mockPatch: vi.fn(),
	mockDelete: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
	apiClient: {
		get: vi.fn(),
		post: mockPost,
		put: vi.fn(),
		patch: mockPatch,
		delete: mockDelete,
	},
	isApiError: (response: { ok: boolean }) => !response.ok,
}));

describe("key-contacts.api sendKeyContactInvite", () => {
	const contactId = "730f1956-49df-4b5b-b955-7a5b95bb2c5b";
	const payload = { roleId: "fcb812c0-333f-4187-a14b-fd77b2404bac" };

	beforeEach(() => {
		mockPost.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("posts to key-contacts/:id/invite with roleId body when success is true", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 201,
			data: {
				success: true,
				message: "Key contact invited successfully.",
			},
		});

		const { sendKeyContactInvite } = await import("@/api/key-contacts.api");
		const result = await sendKeyContactInvite(contactId, payload);

		expect(result).toEqual({
			ok: true,
			message: "Key contact invited successfully.",
		});
		expect(mockPost).toHaveBeenCalledWith(
			API_ENDPOINTS.keyContacts.invite(contactId),
			payload,
		);
	});

	it("returns structured failure when body.success is false", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 400,
			data: { success: false, message: "Duplicate email" },
		});

		const { sendKeyContactInvite } = await import("@/api/key-contacts.api");
		const result = await sendKeyContactInvite(contactId, payload);

		expect(result).toEqual({
			ok: false,
			message: "Duplicate email",
			status: 400,
		});
	});

	it("returns ApiError when post fails", async () => {
		mockPost.mockResolvedValue({
			ok: false,
			message: "Network error",
			status: 503,
		});

		const { sendKeyContactInvite } = await import("@/api/key-contacts.api");
		const result = await sendKeyContactInvite(contactId, payload);

		expect(result).toEqual({
			ok: false,
			message: "Network error",
			status: 503,
		});
	});
});

describe("key-contacts.api patchKeyContact", () => {
	const contactId = "42bc7ba4-1f64-4486-9b21-77b9b63b5eef";
	const payload = {
		firstName: "Jane",
		lastName: "Doe",
		nickname: "JD",
		email: "jane.ss@example.com",
		workPhone: "+1 555-0100",
		cellPhone: "+1 555-0199",
		timezone: "EST (Eastern Time)",
		contactType: "training_coordinator",
		jobRole: "Director of Operations",
		corporationId: "c7c9e75f-5254-4391-a6a1-2c3fa30f1025",
		companyId: "5f5cbc0e-a592-48f0-978b-8524a9f2b71f",
	};

	beforeEach(() => {
		mockPatch.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("PATCH key-contacts/:id with full body when success is true", async () => {
		mockPatch.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "Contact updated successfully.",
			},
		});

		const { patchKeyContact } = await import("@/api/key-contacts.api");
		const result = await patchKeyContact(contactId, payload);

		expect(result).toEqual({ ok: true });
		expect(mockPatch).toHaveBeenCalledWith(
			API_ENDPOINTS.keyContacts.byId(contactId),
			payload,
		);
	});

	it("returns structured failure when body.success is false", async () => {
		mockPatch.mockResolvedValue({
			ok: true,
			status: 400,
			data: { success: false, message: "Invalid company" },
		});

		const { patchKeyContact } = await import("@/api/key-contacts.api");
		const result = await patchKeyContact(contactId, payload);

		expect(result).toEqual({
			ok: false,
			message: "Invalid company",
			status: 400,
		});
	});

	it("returns ApiError when patch fails", async () => {
		mockPatch.mockResolvedValue({
			ok: false,
			message: "Forbidden",
			status: 403,
		});

		const { patchKeyContact } = await import("@/api/key-contacts.api");
		const result = await patchKeyContact(contactId, payload);

		expect(result).toEqual({
			ok: false,
			message: "Forbidden",
			status: 403,
		});
	});
});

describe("key-contacts.api bulkUploadKeyContacts", () => {
	const csv = new File(["a,b\n1,2"], "contacts.csv", {
		type: "text/csv",
	});

	beforeEach(() => {
		mockPost.mockReset();
	});

	it("posts FormData to key-contacts/bulk with file field when success is true", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "Import completed.",
			},
		});

		const { bulkUploadKeyContacts } = await import("@/api/key-contacts.api");
		const result = await bulkUploadKeyContacts(csv);

		expect(result).toEqual({
			ok: true,
			message: "Import completed.",
			data: {
				createdCount: 0,
				createdIds: [],
				failed: [],
			},
		});
		expect(mockPost).toHaveBeenCalledTimes(1);
		const [url, body] = mockPost.mock.calls[0] as [string, FormData];
		expect(url).toBe(API_ENDPOINTS.keyContacts.bulk);
		expect(body).toBeInstanceOf(FormData);
		expect((body as FormData).get("file")).toBe(csv);
	});

	it("parses data.failed and data.createdCount when present", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "Key contact bulk import completed.",
				data: {
					createdCount: 1,
					createdIds: ["a1"],
					failed: [
						{
							row: 2,
							email: "x@example.com",
							message: "Company not found or no longer available.",
						},
					],
				},
			},
		});

		const { bulkUploadKeyContacts } = await import("@/api/key-contacts.api");
		const result = await bulkUploadKeyContacts(csv);

		expect(result).toEqual({
			ok: true,
			message: "Key contact bulk import completed.",
			data: {
				createdCount: 1,
				createdIds: ["a1"],
				failed: [
					{
						row: 2,
						email: "x@example.com",
						message: "Company not found or no longer available.",
					},
				],
			},
		});
	});

	it("returns structured failure when body.success is false", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 400,
			data: { success: false, message: "Invalid CSV" },
		});

		const { bulkUploadKeyContacts } = await import("@/api/key-contacts.api");
		const result = await bulkUploadKeyContacts(csv);

		expect(result).toEqual({
			ok: false,
			message: "Invalid CSV",
			status: 400,
		});
	});
});

describe("key-contacts.api deleteKeyContact", () => {
	const contactId = "0b7abb4c-041e-4574-8620-f09a7a00e26b";

	beforeEach(() => {
		mockDelete.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("DELETE key-contacts/:id when success is true", async () => {
		mockDelete.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "Key contact deleted successfully.",
			},
		});

		const { deleteKeyContact } = await import("@/api/key-contacts.api");
		const result = await deleteKeyContact(contactId);

		expect(result).toEqual({
			ok: true,
			message: "Key contact deleted successfully.",
		});
		expect(mockDelete).toHaveBeenCalledWith(
			API_ENDPOINTS.keyContacts.byId(contactId),
		);
	});

	it("returns structured failure when body.success is false", async () => {
		mockDelete.mockResolvedValue({
			ok: true,
			status: 400,
			data: { success: false, message: "Linked to app user" },
		});

		const { deleteKeyContact } = await import("@/api/key-contacts.api");
		const result = await deleteKeyContact(contactId);

		expect(result).toEqual({
			ok: false,
			message: "Linked to app user",
			status: 400,
		});
	});

	it("returns ApiError when delete fails", async () => {
		mockDelete.mockResolvedValue({
			ok: false,
			message: "Forbidden",
			status: 403,
		});

		const { deleteKeyContact } = await import("@/api/key-contacts.api");
		const result = await deleteKeyContact(contactId);

		expect(result).toEqual({
			ok: false,
			message: "Forbidden",
			status: 403,
		});
	});
});
