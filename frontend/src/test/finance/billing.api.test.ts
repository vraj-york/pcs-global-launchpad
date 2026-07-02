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
}));

describe("billing.api", () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockPost.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("fetchBillingRecords", () => {
		it("builds query string and maps items with id", async () => {
			mockGet.mockResolvedValue({
				ok: true,
				status: 200,
				data: {
					success: true,
					message: "ok",
					data: {
						items: [
							{
								companyId: "c1",
								billingId: "BILL-2026-001",
								companyName: "Acme",
								companyRegion: "North America",
								planLabel: "BSP (Monthly)",
								planLevel: "1-25 employees",
								planTypeId: "monthly",
								billingCycle: "Monthly",
								subscriptionStatus: "active",
								paymentStatus: "paid",
								renewalDate: "2026-06-01",
								nextBillingAmountCents: 1000,
								nextBillingCurrency: "usd",
								paymentType: "cc",
								inconsistentBillingState: false,
								cancelAtPeriodEnd: false,
								canEdit: true,
								canRetryPayment: false,
								canCancelSubscription: true,
								canReinstateSubscription: false,
								stripeSubscriptionId: "sub_x",
							},
						],
						page: 1,
						limit: 20,
						totalCount: 1,
						totalTruncated: false,
						hasNextPage: false,
					},
				},
			});

			const { fetchBillingRecords } = await import("@/api/billing.api");
			const res = await fetchBillingRecords({
				page: 2,
				limit: 20,
				planTypeId: "monthly",
				subscriptionStatus: "active",
				paymentStatus: "paid",
				billingCycles: ["monthly"],
				timePeriod: "30d",
				paymentTypes: ["cc", "offline"],
				sortBy: "companyName",
				sortOrder: "desc",
				search: "Acme",
			});

			expect(res.ok).toBe(true);
			if (res.ok) {
				expect(res.data.items[0]?.id).toBe("c1");
				expect(res.data.items[0]?.companyId).toBe("c1");
			}
			expect(mockGet).toHaveBeenCalledWith(
				expect.stringContaining(`${API_ENDPOINTS.finance.billing}?`),
			);
			const url = mockGet.mock.calls[0]?.[0] as string;
			expect(url).toContain("page=2");
			expect(url).toContain("planTypeId=monthly");
			expect(url).toContain("subscriptionStatus=active");
			expect(url).toContain("paymentStatus=paid");
			expect(url).toContain("billingCycles=monthly");
			expect(url).toContain("timePeriod=30d");
			expect(url).toContain("paymentTypes=cc%2Coffline");
			expect(url).toContain("sortBy=companyName");
			expect(url).toContain("sortOrder=desc");
			expect(url).toContain("search=Acme");
		});
	});

	describe("fetchBillingHistory", () => {
		it("builds query string for company history", async () => {
			mockGet.mockResolvedValue({
				ok: true,
				status: 200,
				data: {
					success: true,
					message: "ok",
					data: {
						items: [
							{
								eventId: "evt_123",
								eventType: "payment_successful",
								planLabel: "BSP (Monthly)",
								planTypeId: "monthly",
								amountCents: 1000,
								currency: "usd",
								actorName: "System",
								actorRole: "BSPBlueprint",
								actorKind: "system",
								occurredAt: 1_700_000_000,
							},
						],
						page: 1,
						limit: 20,
						totalCount: 1,
						hasNextPage: false,
					},
				},
			});

			const { fetchBillingHistory } = await import("@/api/billing.api");
			const res = await fetchBillingHistory("c1", {
				page: 2,
				limit: 20,
				eventType: "payment_successful",
				planTypeId: "monthly",
				actorKind: "system",
				sortBy: "occurredAt",
				sortOrder: "desc",
			});

			expect(res.ok).toBe(true);
			expect(mockGet).toHaveBeenCalledWith(
				expect.stringContaining(
					API_ENDPOINTS.finance.billingCompanyHistory("c1"),
				),
			);
			const url = mockGet.mock.calls[0]?.[0] as string;
			expect(url).toContain("page=2");
			expect(url).toContain("eventType=payment_successful");
			expect(url).toContain("planTypeId=monthly");
			expect(url).toContain("actorKind=system");
			expect(url).toContain("sortBy=occurredAt");
			expect(url).toContain("sortOrder=desc");
		});
	});

	describe("cancelBillingSubscription", () => {
		it("posts to cancel endpoint", async () => {
			mockPost.mockResolvedValue({
				ok: true,
				status: 200,
				data: { success: true, message: "ok", data: { ok: true } },
			});

			const { cancelBillingSubscription } = await import("@/api/billing.api");
			const res = await cancelBillingSubscription("c1", {
				reason: "Budget / economic pressures",
				additionalNotes: "note",
			});

			expect(res.ok).toBe(true);
			expect(mockPost).toHaveBeenCalledWith(
				API_ENDPOINTS.finance.billingCancelSubscription("c1"),
				{
					reason: "Budget / economic pressures",
					additionalNotes: "note",
				},
			);
		});
	});
});
