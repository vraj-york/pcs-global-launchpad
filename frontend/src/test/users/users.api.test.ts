import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "@/const";

const { mockPost, mockGet, mockPatch, mockDelete } = vi.hoisted(() => ({
	mockPost: vi.fn(),
	mockGet: vi.fn(),
	mockPatch: vi.fn(),
	mockDelete: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
	apiClient: {
		get: mockGet,
		post: mockPost,
		put: vi.fn(),
		patch: mockPatch,
		delete: mockDelete,
	},
	isApiError: (response: { ok: boolean }) => !response.ok,
}));

describe("users.api inviteUser", () => {
	const samplePayload = {
		firstName: "Ada",
		lastName: "Lovelace",
		email: "ada@example.com",
		workPhone: "+1 555 0100",
		timezone: "UTC",
		inviteType: "Assessment Only",
	};

	beforeEach(() => {
		mockPost.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("posts to the invite endpoint and returns ok when success is true", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "Invitation sent", data: {} },
		});

		const { inviteUser } = await import("@/api/users.api");
		const result = await inviteUser(samplePayload);

		expect(result).toEqual({ ok: true, message: "Invitation sent" });
		expect(mockPost).toHaveBeenCalledWith(
			API_ENDPOINTS.users.invite,
			samplePayload,
		);
	});

	it("returns structured failure when body.success is false", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: false, message: "Email already invited" },
		});

		const { inviteUser } = await import("@/api/users.api");
		const result = await inviteUser(samplePayload);

		expect(result).toEqual({
			ok: false,
			message: "Email already invited",
			status: 200,
		});
	});

	it("returns ApiError when post fails", async () => {
		mockPost.mockResolvedValue({
			ok: false,
			message: "Network error",
			status: 503,
		});

		const { inviteUser } = await import("@/api/users.api");
		const result = await inviteUser(samplePayload);

		expect(result).toEqual({
			ok: false,
			message: "Network error",
			status: 503,
		});
	});

	it("uses Invalid response when success is false but message is missing", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 400,
			data: { success: false },
		});

		const { inviteUser } = await import("@/api/users.api");
		const result = await inviteUser(samplePayload);

		expect(result).toEqual({
			ok: false,
			message: "Invalid response",
			status: 400,
		});
	});
});

describe("users.api bulkInviteUsers", () => {
	const csv = new File(["firstName,lastName\nA,B"], "users.csv", {
		type: "text/csv",
	});

	beforeEach(() => {
		mockPost.mockReset();
	});

	it("posts FormData to users/invite/bulk with file when success is true", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "Bulk invite started" },
		});

		const { bulkInviteUsers } = await import("@/api/users.api");
		const result = await bulkInviteUsers(csv);

		expect(result).toEqual({ ok: true, message: "Bulk invite started" });
		expect(mockPost).toHaveBeenCalledTimes(1);
		const [url, body] = mockPost.mock.calls[0] as [string, FormData];
		expect(url).toBe(API_ENDPOINTS.users.inviteBulk);
		expect(body).toBeInstanceOf(FormData);
		expect((body as FormData).get("file")).toBe(csv);
	});

	it("returns structured failure when body.success is false", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 400,
			data: { success: false, message: "Invalid CSV" },
		});

		const { bulkInviteUsers } = await import("@/api/users.api");
		const result = await bulkInviteUsers(csv);

		expect(result).toEqual({
			ok: false,
			message: "Invalid CSV",
			status: 400,
		});
	});
});

describe("users.api getUserProfile", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it("GETs users/me/profile and returns data when success is true", async () => {
		const profile = {
			cognitoSub: "sub-1",
			corporationId: "corp-1",
			companyId: "company-1",
			userCode: 1,
			status: "Active",
			firstName: "A",
			lastName: "B",
			email: "a@example.com",
			nickname: null,
			jobRole: "Coordinator",
			avatar: "https://cdn.example.com/avatar.png",
			workPhone: null,
			cellPhone: null,
			timezone: "UTC",
			completedOnboardingSteps: 0,
			corporation: "Corp",
			companyName: "Co",
			roleName: "User",
			category: "Employee",
			userType: null,
			inviteType: "BSPBlueprint",
		};
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "ok", data: profile },
		});

		const { getUserProfile } = await import("@/api/users.api");
		const result = await getUserProfile();

		expect(result).toEqual({
			ok: true,
			data: profile,
			status: 200,
		});
		expect(mockGet).toHaveBeenCalledWith(API_ENDPOINTS.users.userProfile);
	});

	it("returns structured failure when body.success is false", async () => {
		mockGet.mockResolvedValue({
			ok: true,
			status: 403,
			data: { success: false, message: "Forbidden" },
		});

		const { getUserProfile } = await import("@/api/users.api");
		const result = await getUserProfile();

		expect(result).toEqual({
			ok: false,
			message: "Forbidden",
			status: 403,
		});
	});

	it("returns structured failure when data is missing", async () => {
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "ok" },
		});

		const { getUserProfile } = await import("@/api/users.api");
		const result = await getUserProfile();

		expect(result).toEqual({
			ok: false,
			message: "Invalid response",
			status: 200,
		});
	});

	it("returns ApiError when get fails", async () => {
		mockGet.mockResolvedValue({
			ok: false,
			message: "Network error",
			status: 503,
		});

		const { getUserProfile } = await import("@/api/users.api");
		const result = await getUserProfile();

		expect(result).toEqual({
			ok: false,
			message: "Network error",
			status: 503,
		});
	});
});

describe("users.api patchMyProfile", () => {
	beforeEach(() => {
		mockPatch.mockReset();
	});

	it("PATCHes users/me/profile and returns success", async () => {
		mockPatch.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "Profile updated" },
		});

		const { patchMyProfile } = await import("@/api/users.api");
		const payload = {
			nickname: "Sam",
			workPhone: "+1 555-0100",
			cellPhone: "+1 555-0102",
			timezone: "EST (Eastern Time)",
		};
		const result = await patchMyProfile(payload);

		expect(result).toEqual({
			ok: true,
			message: "Profile updated",
			status: 200,
		});
		expect(mockPatch).toHaveBeenCalledWith(
			API_ENDPOINTS.users.userProfile,
			payload,
		);
	});
});

describe("users.api patchMyAvatar", () => {
	beforeEach(() => {
		mockPatch.mockReset();
	});

	it("PATCHes users/me/avatar with multipart form data", async () => {
		mockPatch.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "Avatar updated",
				data: { avatar: "https://cdn.example.com/new.png" },
			},
		});

		const file = new File(["x"], "avatar.png", { type: "image/png" });
		const { patchMyAvatar } = await import("@/api/users.api");
		const result = await patchMyAvatar(file);

		expect(result).toEqual({
			ok: true,
			data: { avatar: "https://cdn.example.com/new.png" },
			message: "Avatar updated",
			status: 200,
		});
		expect(mockPatch).toHaveBeenCalledWith(
			API_ENDPOINTS.users.userAvatar,
			expect.any(FormData),
		);
		const formData = mockPatch.mock.calls[0][1] as FormData;
		expect(formData.get("avatar")).toBe(file);
	});
});

describe("users.api deleteMyAvatar", () => {
	beforeEach(() => {
		mockDelete.mockReset();
	});

	it("DELETEs users/me/avatar and returns success", async () => {
		mockDelete.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "Avatar removed" },
		});

		const { deleteMyAvatar } = await import("@/api/users.api");
		const result = await deleteMyAvatar();

		expect(result).toEqual({
			ok: true,
			message: "Avatar removed",
			status: 200,
		});
		expect(mockDelete).toHaveBeenCalledWith(API_ENDPOINTS.users.userAvatar);
	});
});

describe("users.api patchUserOnboardingSteps", () => {
	beforeEach(() => {
		mockPatch.mockReset();
	});

	it("PATCHes onboarding step endpoint and returns success payload", async () => {
		mockPatch.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "Onboarding step updated" },
		});

		const { patchUserOnboardingSteps } = await import("@/api/users.api");
		const result = await patchUserOnboardingSteps({ type: "consent" });

		expect(result).toEqual({
			ok: true,
			message: "Onboarding step updated",
			status: 200,
		});
		expect(mockPatch).toHaveBeenCalledWith(
			API_ENDPOINTS.users.userOnboardingSteps,
			{ type: "consent" },
		);
	});

	it("returns ApiError when patch fails", async () => {
		mockPatch.mockResolvedValue({
			ok: false,
			message: "Unauthorized",
			status: 401,
		});

		const { patchUserOnboardingSteps } = await import("@/api/users.api");
		const result = await patchUserOnboardingSteps({ type: "consent" });

		expect(result).toEqual({
			ok: false,
			message: "Unauthorized",
			status: 401,
		});
	});

	it("returns structured failure when body.success is false", async () => {
		mockPatch.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: false, message: "Invalid step type" },
		});

		const { patchUserOnboardingSteps } = await import("@/api/users.api");
		const result = await patchUserOnboardingSteps({ type: "consent" });

		expect(result).toEqual({
			ok: false,
			message: "Invalid step type",
			status: 200,
		});
	});
});

describe("users.api listPeerMentions", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it("GETs peer mentions without query when search is empty", async () => {
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "ok",
				data: {
					peers: [
						{
							id: "peer-1",
							type: "person",
							displayName: "Jane Peer",
							email: "jane@example.com",
							jobRole: "Designer",
						},
					],
				},
			},
		});

		const { listPeerMentions } = await import("@/api/users.api");
		const result = await listPeerMentions();

		expect(mockGet).toHaveBeenCalledWith(API_ENDPOINTS.users.peerMentions);
		expect(result).toEqual({
			ok: true,
			status: 200,
			data: {
				peers: [
					{
						id: "peer-1",
						type: "person",
						displayName: "Jane Peer",
						email: "jane@example.com",
						jobRole: "Designer",
					},
				],
			},
		});
	});

	it("GETs peer mentions with query param", async () => {
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "ok", data: { peers: [] } },
		});

		const { listPeerMentions } = await import("@/api/users.api");
		await listPeerMentions("  Ja  ");

		expect(mockGet).toHaveBeenCalledWith(
			`${API_ENDPOINTS.users.peerMentions}?query=Ja`,
		);
	});
});

describe("users.api getSubscriptionAccess", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it("GETs subscription access and returns parsed data", async () => {
		const payload = {
			companyId: "c1",
			subscriptionStatus: "active",
			planTypeId: "monthly",
			employeeRangeMax: 25,
			activeEmployeeCount: 10,
			isActive: true,
			isBlocked: false,
			employeeLimitExceeded: false,
			canAccessFullApp: true,
			canAccessChatbot: true,
			canStartAssessment: true,
			canViewResults: true,
		};

		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "Subscription access context loaded",
				data: payload,
			},
		});

		const { getSubscriptionAccess } = await import("@/api/users.api");
		const result = await getSubscriptionAccess();

		expect(result).toEqual({ ok: true, data: payload, status: 200 });
		expect(mockGet).toHaveBeenCalledWith(
			API_ENDPOINTS.users.userSubscriptionAccess,
		);
	});
});
