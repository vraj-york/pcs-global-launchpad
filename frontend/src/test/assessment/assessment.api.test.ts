import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "@/const";

const mockGet = vi.hoisted(() => vi.fn());

vi.mock("@/lib", () => ({
	apiClient: {
		get: mockGet,
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	},
	isApiError: (response: { ok: boolean }) => !response.ok,
}));

vi.mock("@/const", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/const")>();
	return {
		...actual,
		ASSESSMENT_API_BASE_URL: "https://assessment.test",
		ASSESSMENT_API_MISSING_BASE_URL_MESSAGE:
			"VITE_BSP_ASSESSMENT_API_URL is not set",
	};
});

describe("assessment.api getReportContent", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("GETs report content by section key", async () => {
		const payload = {
			section_key: "welcome_and_overall",
			content: { welcome_copy: "Hello" },
		};
		mockGet.mockResolvedValue({ ok: true, status: 200, data: payload });

		const { getReportContent } = await import("@/api");
		const result = await getReportContent("welcome_and_overall");

		expect(result).toEqual({ ok: true, status: 200, data: payload });
		expect(mockGet).toHaveBeenCalledWith(
			`https://assessment.test${API_ENDPOINTS.assessment.reportContent("welcome_and_overall")}`,
		);
	});

	it("encodes section keys in the path", async () => {
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			data: { section_key: "color/info", content: {} },
		});

		const { getReportContent } = await import("@/api");
		await getReportContent("color/info");

		expect(mockGet).toHaveBeenCalledWith(
			`https://assessment.test${API_ENDPOINTS.assessment.reportContent("color/info")}`,
		);
	});
});

describe("assessment.api getUserAssessmentStyles", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it("GETs user style breakdown for an assessment", async () => {
		const assessmentId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
		const payload = {
			assessment_id: assessmentId,
			assessment_score_id: "score-uuid",
			scored_at: "2026-05-15T12:00:00Z",
			overall_style: {
				context: "overall",
				type: "basic",
				style: { style_number: 6, title: "Humanitarian", description: "Desc" },
			},
			professional_typical: {
				context: "professional_typical",
				type: "basic",
				style: { style_number: 10, title: "Innovitarian", description: "Desc" },
			},
			professional_stressful: {
				context: "professional_stressful",
				type: "basic",
				style: { style_number: 1, title: "Pioneer", description: "Desc" },
			},
			personal_typical: {
				context: "personal_typical",
				type: "basic",
				style: { style_number: 7, title: "Geek", description: "Desc" },
			},
			personal_stressful: {
				context: "personal_stressful",
				type: "basic",
				style: { style_number: 3, title: "Gregarian", description: "Desc" },
			},
			professional_typical_scores: {
				prtred: 42,
				prtgreen: 78,
				prtgrey: 55,
				prtblue: 103,
			},
			professional_stressful_scores: {
				prsred: 30,
				prsgreen: 60,
				prsgrey: 45,
				prsblue: 88,
			},
			personal_typical_scores: {
				petred: 50,
				petgreen: 70,
				petgrey: 40,
				petblue: 95,
			},
			personal_stressful_scores: {
				pesred: 35,
				pesgreen: 65,
				pesgrey: 50,
				pesblue: 90,
			},
			decrease_stress_metrics: {
				prblue: 88,
				peblue: 90,
				professional_typical_oct: 10,
				personal_typical_oct: 7,
				stressful_combo_oct: 8,
			},
		};
		mockGet.mockResolvedValue({ ok: true, status: 200, data: payload });

		const { getUserAssessmentStyles } = await import("@/api");
		const result = await getUserAssessmentStyles(assessmentId);

		expect(result).toEqual({ ok: true, status: 200, data: payload });
		expect(mockGet).toHaveBeenCalledWith(
			`https://assessment.test${API_ENDPOINTS.assessment.userStyles(assessmentId)}`,
		);
	});
});

describe("assessment.api getBspStyles", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it("GETs all BSP styles", async () => {
		const payload = [
			{
				id: "style-1",
				style_number: 1,
				title: "Pioneer",
				character_strengths: ["Ambitious", "Passionate"],
			},
		];
		mockGet.mockResolvedValue({ ok: true, status: 200, data: payload });

		const { getBspStyles } = await import("@/api");
		const result = await getBspStyles({ limit: 13 });

		expect(result).toEqual({ ok: true, status: 200, data: payload });
		expect(mockGet).toHaveBeenCalledWith(
			`https://assessment.test${API_ENDPOINTS.assessment.bspStyles}?limit=13`,
		);
	});
});

describe("assessment.api getReportContent without base URL", () => {
	it("returns missing base URL error", async () => {
		vi.resetModules();
		vi.doMock("@/const", async (importOriginal) => {
			const actual = await importOriginal<typeof import("@/const")>();
			return {
				...actual,
				ASSESSMENT_API_BASE_URL: "",
				ASSESSMENT_API_MISSING_BASE_URL_MESSAGE:
					"VITE_BSP_ASSESSMENT_API_URL is not set",
			};
		});

		const { getReportContent } = await import("@/api");
		const result = await getReportContent("welcome_and_overall");

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.message).toBe("VITE_BSP_ASSESSMENT_API_URL is not set");
			expect(result.status).toBe(0);
		}
	});
});
