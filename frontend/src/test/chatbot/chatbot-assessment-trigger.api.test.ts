import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPost = vi.fn();

vi.mock("@/api/chatbot.api", () => ({
	chatbotAxios: {
		post: mockPost,
	},
}));

describe("chatbotAssessmentTriggerApi", () => {
	beforeEach(() => {
		mockPost.mockReset();
	});

	it("maps assessment trigger response to session data", async () => {
		mockPost.mockResolvedValue({
			data: {
				assessment_id: "assessment-1",
				thread: {
					id: "thread-1",
					title: "Assessment coaching",
					pinned: false,
					persona: "employee",
					chat_mode: "quick",
					coach_client_id: null,
					created_at: "2026-01-01T00:00:00Z",
					updated_at: "2026-01-01T00:00:01Z",
					last_message_at: "2026-01-01T00:00:01Z",
				},
				opening_message: {
					id: "msg-1",
					content: "Hi Alex, welcome!",
					created_at: "2026-01-01T00:00:01Z",
					follow_up_chips: [
						{
							display: "Explain my style",
							submit: "Explain what my overall behavioral style means.",
						},
					],
				},
			},
		});

		const { chatbotAssessmentTriggerApi } = await import(
			"@/api/chatbot-assessment-trigger.api"
		);
		const result = await chatbotAssessmentTriggerApi.createSession({
			assessmentId: "assessment-1",
			displayName: "Alex",
			category: "Collaborator",
			score: "Control",
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.thread.id).toBe("thread-1");
		expect(result.data.openingMessage.content).toContain("Alex");
		expect(result.data.openingMessage.followUpChips).toHaveLength(1);
		expect(mockPost).toHaveBeenCalledWith(
			"/sessions/assessment-trigger",
			expect.objectContaining({
				assessment_id: "assessment-1",
				display_name: "Alex",
				category: "Collaborator",
				score: "Control",
			}),
			expect.any(Object),
		);
	});
});
