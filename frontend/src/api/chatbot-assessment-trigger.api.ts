import type { AxiosError } from "axios";
import { CHATBOT_ASSESSMENT_TRIGGER_CONTENT } from "@/const";
import type {
	ChatbotAssessmentTriggerApiResult,
	ChatbotAssessmentTriggerPayload,
	ChatbotAssessmentTriggerResponseWire,
	ChatbotAssessmentTriggerSessionData,
	ChatbotThread,
} from "@/types";
import { chatbotAxios } from "./chatbot.api";

const triggerHttpConfig = { timeout: 45000 as const };

function extractErrorMessage(error: unknown, fallback: string): string {
	const axiosError = error as AxiosError<{
		detail?: string;
		message?: string;
	}>;
	return (
		axiosError.response?.data?.detail ??
		axiosError.response?.data?.message ??
		fallback
	);
}

function mapThread(
	raw: ChatbotAssessmentTriggerResponseWire["thread"],
): ChatbotThread {
	return {
		id: raw.id,
		title: raw.title,
		pinned: raw.pinned,
		persona: raw.persona,
		chatMode: raw.chat_mode,
		coachClientId: raw.coach_client_id,
		createdAt: raw.created_at,
		updatedAt: raw.updated_at,
		lastMessageAt: raw.last_message_at,
	};
}

export const chatbotAssessmentTriggerApi = {
	createSession: async (
		payload: ChatbotAssessmentTriggerPayload,
	): Promise<
		ChatbotAssessmentTriggerApiResult<ChatbotAssessmentTriggerSessionData>
	> => {
		try {
			const response =
				await chatbotAxios.post<ChatbotAssessmentTriggerResponseWire>(
					"/sessions/assessment-trigger",
					{
						assessment_id: payload.assessmentId,
						display_name: payload.displayName,
						category: payload.category,
						score: payload.score,
						persona: "employee",
						chat_mode: "quick",
					},
					triggerHttpConfig,
				);

			const chips = (response.data.opening_message.follow_up_chips ?? [])
				.map((chip) => ({
					display: chip.display?.trim() ?? "",
					submit: chip.submit?.trim() ?? "",
				}))
				.filter((chip) => chip.display && chip.submit)
				.slice(0, 2);

			return {
				ok: true,
				data: {
					thread: mapThread(response.data.thread),
					openingMessage: {
						id: response.data.opening_message.id,
						content: response.data.opening_message.content,
						createdAt: response.data.opening_message.created_at,
						followUpChips: chips,
					},
				},
			};
		} catch (error) {
			return {
				ok: false,
				message: extractErrorMessage(
					error,
					CHATBOT_ASSESSMENT_TRIGGER_CONTENT.createSessionError,
				),
			};
		}
	},
};
