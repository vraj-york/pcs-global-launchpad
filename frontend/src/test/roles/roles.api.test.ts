import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "@/const";

const { mockGet } = vi.hoisted(() => ({
	mockGet: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
	apiClient: {
		get: mockGet,
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
	isApiError: (response: { ok: boolean }) => !response.ok,
}));

describe("roles.api", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getModulesWithSubmodules", () => {
		it("fetches and normalizes modules with submodules", async () => {
			mockGet.mockResolvedValue({
				ok: true,
				status: 200,
				data: {
					success: true,
					message: "ok",
					data: [
						{
							id: "mod-1",
							name: "Dashboard",
							submodules: [
								{
									id: "sub-1",
									key: "dashboard.dashboard",
									name: "Dashboard",
								},
							],
						},
					],
				},
			});

			const { getModulesWithSubmodules } = await import("@/api/roles.api");
			const res = await getModulesWithSubmodules();

			expect(mockGet).toHaveBeenCalledWith(
				API_ENDPOINTS.permissions.modulesWithSubmodules,
			);
			expect(res.ok).toBe(true);
			if (res.ok) {
				expect(res.data).toEqual([
					{
						id: "mod-1",
						name: "Dashboard",
						submodules: [
							{
								id: "sub-1",
								key: "dashboard.dashboard",
								name: "Dashboard",
							},
						],
					},
				]);
			}
		});

		it("passes roleCategoryId query when provided", async () => {
			mockGet.mockResolvedValue({
				ok: true,
				status: 200,
				data: { success: true, message: "ok", data: [] },
			});

			const { getModulesWithSubmodules } = await import("@/api/roles.api");
			await getModulesWithSubmodules("cat-super-admin");

			expect(mockGet).toHaveBeenCalledWith(
				`${API_ENDPOINTS.permissions.modulesWithSubmodules}?roleCategoryId=cat-super-admin`,
			);
		});
	});

	describe("getCategoryEnabledSubmodules", () => {
		it("fetches enabled submodule IDs for a category", async () => {
			mockGet.mockResolvedValue({
				ok: true,
				status: 200,
				data: {
					success: true,
					message: "ok",
					data: { submoduleIds: ["sub-1", "sub-2"] },
				},
			});

			const { getCategoryEnabledSubmodules } = await import("@/api/roles.api");
			const res = await getCategoryEnabledSubmodules("cat-1");

			expect(mockGet).toHaveBeenCalledWith(
				API_ENDPOINTS.roles.categoryEnabledSubmodules("cat-1"),
			);
			expect(res.ok).toBe(true);
			if (res.ok) {
				expect(res.data).toEqual(["sub-1", "sub-2"]);
			}
		});
	});

	describe("getRoleById", () => {
		it("returns role detail with submoduleIds", async () => {
			mockGet.mockResolvedValue({
				ok: true,
				status: 200,
				data: {
					success: true,
					message: "ok",
					data: {
						id: "role-1",
						name: "Corp Admin",
						categoryId: "cat-1",
						category: "Corporation Admin",
						description: "desc",
						isPrivate: false,
						isExternal: true,
						submoduleIds: ["sub-1", "sub-2"],
					},
				},
			});

			const { getRoleById } = await import("@/api/roles.api");
			const res = await getRoleById("role-1");

			expect(mockGet).toHaveBeenCalledWith(API_ENDPOINTS.roles.byId("role-1"));
			expect(res.ok).toBe(true);
			if (res.ok) {
				expect(res.data.submoduleIds).toEqual(["sub-1", "sub-2"]);
			}
		});
	});
});
