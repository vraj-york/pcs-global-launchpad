import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	CHATBOT_PROACTIVE_API_LOAD_FAILED_MESSAGE,
	CHATBOT_PROACTIVE_API_REQUEST_TIMEOUT_MS,
	CHATBOT_PROACTIVE_EMPLOYEE_API_PATH,
} from "@/const";

const mockGet = vi.fn();

vi.mock("@/api/chatbot.api", () => ({
	chatbotAxios: {
		get: mockGet,
	},
}));

describe("chatbotProactiveApi.getEmployeePayload", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it("calls the proactive path and maps snake_case to camelCase", async () => {
		mockGet.mockResolvedValue({
			data: {
				version: "2026-test",
				mock_data: true,
				context: {
					display_name: "Ada",
					role_scope: "all_company_peers_as_teammates",
					mock_data: true,
					peers: [
						{
							employee_id: "emp-002",
							display_name: "Priya",
							relation: "peer",
							mock_assessment_summary: "Mock summary.",
						},
					],
				},
				nudge: { first_idle_ms: 4500, second_idle_ms: 4500 },
				stages: [
					{
						phase: 0,
						title: "Welcome, Ada!",
						subtitle: "Ready.",
						cards: [
							{
								id: "team_dynamics",
								label: "Check Team Dynamics",
								submit: "Help me with BSP wheel.",
								icon: "trending-up",
								description: "Subtitle",
								tone: "info",
							},
						],
						bispy_choices: [],
						assistant_messages: [],
					},
				],
			},
		});

		const { chatbotProactiveApi } = await import("@/api/chatbot-proactive.api");
		const result = await chatbotProactiveApi.getEmployeePayload();

		expect(mockGet).toHaveBeenCalledWith(
			CHATBOT_PROACTIVE_EMPLOYEE_API_PATH,
			expect.objectContaining({
				timeout: CHATBOT_PROACTIVE_API_REQUEST_TIMEOUT_MS,
				params: {},
			}),
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data.version).toBe("2026-test");
		expect(result.data.context.displayName).toBe("Ada");
		expect(result.data.context.peers[0].employeeId).toBe("emp-002");
		expect(result.data.stages[0].bispyChoices).toEqual([]);
		expect(result.data.stages[0].cards[0].id).toBe("team_dynamics");
		expect(result.data.nudge.firstIdleMs).toBe(4500);
		expect(result.data.nudge.secondIdleMs).toBe(4500);
	});

	it("sends display_name and phase query params when provided", async () => {
		mockGet.mockResolvedValue({
			data: {
				version: "1",
				mock_data: true,
				context: {
					display_name: "Test",
					role_scope: "x",
					mock_data: true,
					peers: [],
				},
				nudge: { first_idle_ms: 1, second_idle_ms: 2 },
				stages: [],
			},
		});

		const { chatbotProactiveApi } = await import("@/api/chatbot-proactive.api");
		await chatbotProactiveApi.getEmployeePayload({
			displayName: "Custom",
			phase: 1,
		});

		expect(mockGet).toHaveBeenCalledWith(
			CHATBOT_PROACTIVE_EMPLOYEE_API_PATH,
			expect.objectContaining({
				params: { display_name: "Custom", phase: 1 },
			}),
		);
	});

	it("maps assistant_messages show_waiting_hint to showWaitingHint", async () => {
		mockGet.mockResolvedValue({
			data: {
				version: "1",
				mock_data: true,
				context: {
					display_name: "A",
					role_scope: "x",
					mock_data: true,
					peers: [],
				},
				nudge: { first_idle_ms: 1, second_idle_ms: 2 },
				stages: [
					{
						phase: 1,
						assistant_messages: [
							{
								id: "n1",
								lines: ["Hi"],
								show_waiting_hint: true,
								waiting_hint: "Waiting",
								options: [],
							},
						],
					},
				],
			},
		});

		const { chatbotProactiveApi } = await import("@/api/chatbot-proactive.api");
		const result = await chatbotProactiveApi.getEmployeePayload();

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const msg = result.data.stages[0].assistantMessages[0];
		expect(msg.showWaitingHint).toBe(true);
		expect(msg.waitingHint).toBe("Waiting");
	});

	it("returns ok false with detail message when request fails", async () => {
		mockGet.mockRejectedValue({
			response: { data: { detail: "Not authorized" } },
		});

		const { chatbotProactiveApi } = await import("@/api/chatbot-proactive.api");
		const result = await chatbotProactiveApi.getEmployeePayload();

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.message).toBe("Not authorized");
	});

	it("uses fallback message when error has no detail", async () => {
		mockGet.mockRejectedValue(new Error("network"));

		const { chatbotProactiveApi } = await import("@/api/chatbot-proactive.api");
		const result = await chatbotProactiveApi.getEmployeePayload();

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.message).toBe(CHATBOT_PROACTIVE_API_LOAD_FAILED_MESSAGE);
	});
});
