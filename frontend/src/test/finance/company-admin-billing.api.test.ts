import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "@/const";

const { mockGet, mockPost } = vi.hoisted(() => ({
	mockGet: vi.fn(),
	mockPost: vi.fn(),
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
	axiosInstance: { get: vi.fn() },
}));

describe("company-admin-billing.api", () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockPost.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("fetchCompanyAdminBilling appends companyId query", async () => {
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "ok",
				data: {
					companyId: "c1",
					billingId: null,
					companyName: "Co",
					companyRegion: null,
					planLabel: "Plan",
					planLevel: null,
					planTypeId: "monthly",
					billingCycle: "Monthly",
					subscriptionStatus: "active",
					paymentStatus: "paid",
					renewalDate: null,
					nextBillingAmountCents: null,
					nextBillingCurrency: null,
					paymentType: null,
					inconsistentBillingState: false,
					cancelAtPeriodEnd: false,
					canEdit: false,
					canRetryPayment: false,
					canCancelSubscription: true,
					canReinstateSubscription: false,
					stripeSubscriptionId: "sub_1",
				},
			},
		});

		const { fetchCompanyAdminBilling } = await import(
			"@/api/company-admin-billing.api"
		);
		const res = await fetchCompanyAdminBilling({ companyId: "c1" });

		expect(mockGet).toHaveBeenCalledWith(
			`${API_ENDPOINTS.companyAdmin.billing}?companyId=c1`,
		);
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.data.id).toBe("c1");
		}
	});

	it("cancelCompanyAdminSubscription posts reason", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: { success: true, message: "ok", data: { ok: true } },
		});

		const { cancelCompanyAdminSubscription } = await import(
			"@/api/company-admin-billing.api"
		);
		const res = await cancelCompanyAdminSubscription(
			{ companyId: "c1" },
			{ reason: "Budget / economic pressures" },
		);

		expect(mockPost).toHaveBeenCalledWith(
			`${API_ENDPOINTS.companyAdmin.billingCancelSubscription}?companyId=c1`,
			{ reason: "Budget / economic pressures", additionalNotes: undefined },
		);
		expect(res.ok).toBe(true);
	});

	it("requestCompanyAdminPlanChange posts to request-plan-change endpoint", async () => {
		mockPost.mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				success: true,
				message: "ok",
				data: { id: "req-1" },
			},
		});

		const { requestCompanyAdminPlanChange } = await import(
			"@/api/company-admin-billing.api"
		);
		const res = await requestCompanyAdminPlanChange({ companyId: "c1" });

		expect(mockPost).toHaveBeenCalledWith(
			`${API_ENDPOINTS.companyAdmin.billingRequestPlanChange}?companyId=c1`,
			{},
		);
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.id).toBe("req-1");
		}
	});
});
