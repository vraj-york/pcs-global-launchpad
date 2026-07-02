import type { AxiosError } from "axios";
import {
	CHATBOT_PROACTIVE_API_LOAD_FAILED_MESSAGE,
	CHATBOT_PROACTIVE_API_REQUEST_TIMEOUT_MS,
	CHATBOT_PROACTIVE_EMPLOYEE_API_PATH,
} from "@/const";
import type {
	ChatbotProactiveApiResult,
	ChatbotProactiveEmployeePayload,
	ChatbotProactiveEmployeePhase,
	ChatbotProactivePayloadWire,
	ChatbotProactiveStage,
	ChatbotProactiveStageWire,
} from "@/types";
import { chatbotAxios } from "./chatbot.api";

function mapStage(stage: ChatbotProactiveStageWire): ChatbotProactiveStage {
	return {
		phase: stage.phase,
		title: stage.title,
		subtitle: stage.subtitle,
		cards: stage.cards ?? [],
		bispyChoices: stage.bispy_choices ?? [],
		assistantMessages: (stage.assistant_messages ?? []).map((message) => ({
			id: message.id,
			lines: message.lines ?? [],
			options: message.options ?? [],
			showWaitingHint: Boolean(message.show_waiting_hint),
			waitingHint: message.waiting_hint,
		})),
	};
}

function mapPayload(
	payload: ChatbotProactivePayloadWire,
): ChatbotProactiveEmployeePayload {
	return {
		version: payload.version,
		mockData: payload.mock_data,
		context: {
			displayName: payload.context.display_name,
			roleScope: payload.context.role_scope,
			mockData: payload.context.mock_data,
			peers: payload.context.peers.map((peer) => ({
				employeeId: peer.employee_id,
				displayName: peer.display_name,
				relation: peer.relation,
				mockAssessmentSummary: peer.mock_assessment_summary,
			})),
		},
		nudge: {
			firstIdleMs: payload.nudge.first_idle_ms,
			secondIdleMs: payload.nudge.second_idle_ms,
		},
		stages: payload.stages.map(mapStage),
	};
}

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

export const chatbotProactiveApi = {
	async getEmployeePayload(options?: {
		displayName?: string;
		phase?: ChatbotProactiveEmployeePhase;
	}): Promise<ChatbotProactiveApiResult<ChatbotProactiveEmployeePayload>> {
		try {
			const response = await chatbotAxios.get<ChatbotProactivePayloadWire>(
				CHATBOT_PROACTIVE_EMPLOYEE_API_PATH,
				{
					timeout: CHATBOT_PROACTIVE_API_REQUEST_TIMEOUT_MS,
					params: {
						...(options?.displayName
							? { display_name: options.displayName }
							: {}),
						...(typeof options?.phase === "number"
							? { phase: options.phase }
							: {}),
					},
				},
			);
			return { ok: true, data: mapPayload(response.data) };
		} catch (error) {
			return {
				ok: false,
				message: extractErrorMessage(
					error,
					CHATBOT_PROACTIVE_API_LOAD_FAILED_MESSAGE,
				),
			};
		}
	},
};
