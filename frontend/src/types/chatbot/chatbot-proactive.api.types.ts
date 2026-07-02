import type { ChatbotProactiveEmployeePhase } from "./chatbot-proactive.types";

export type ChatbotProactiveOption = {
	id: string;
	label: string;
	submit: string;
	icon: string;
	description?: string;
	tone?: string;
};

export type ChatbotProactiveAssistantMessage = {
	id: string;
	lines: string[];
	options: ChatbotProactiveOption[];
	showWaitingHint: boolean;
	waitingHint?: string;
};

export type ChatbotProactiveStage = {
	phase: ChatbotProactiveEmployeePhase;
	title?: string;
	subtitle?: string;
	cards: ChatbotProactiveOption[];
	bispyChoices: ChatbotProactiveOption[];
	assistantMessages: ChatbotProactiveAssistantMessage[];
};

export type ChatbotProactiveContextPeer = {
	employeeId: string;
	displayName: string;
	relation: string;
	mockAssessmentSummary: string;
};

export type ChatbotProactiveEmployeePayload = {
	version: string;
	mockData: boolean;
	context: {
		displayName: string;
		roleScope: string;
		mockData: boolean;
		peers: ChatbotProactiveContextPeer[];
	};
	nudge: {
		firstIdleMs: number;
		secondIdleMs: number;
	};
	stages: ChatbotProactiveStage[];
};

export type ChatbotProactiveApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; message: string };

/** Backend wire shape for `GET /proactive/employee` (snake_case). */
export type ChatbotProactiveOptionWire = {
	id: string;
	label: string;
	submit: string;
	icon: string;
	description?: string;
	tone?: string;
};

export type ChatbotProactiveAssistantMessageWire = {
	id: string;
	lines: string[];
	options?: ChatbotProactiveOptionWire[];
	show_waiting_hint?: boolean;
	waiting_hint?: string;
};

export type ChatbotProactiveStageWire = {
	phase: ChatbotProactiveEmployeePhase;
	title?: string;
	subtitle?: string;
	cards?: ChatbotProactiveOptionWire[];
	bispy_choices?: ChatbotProactiveOptionWire[];
	assistant_messages?: ChatbotProactiveAssistantMessageWire[];
};

export type ChatbotProactiveContextPeerWire = {
	employee_id: string;
	display_name: string;
	relation: string;
	mock_assessment_summary: string;
};

export type ChatbotProactivePayloadWire = {
	version: string;
	mock_data: boolean;
	context: {
		display_name: string;
		role_scope: string;
		mock_data: boolean;
		peers: ChatbotProactiveContextPeerWire[];
	};
	nudge: {
		first_idle_ms: number;
		second_idle_ms: number;
	};
	stages: ChatbotProactiveStageWire[];
};
