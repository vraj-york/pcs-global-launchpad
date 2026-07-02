import type { ChatbotFollowUpChip, ChatbotThread } from "./chatbot.types";

export type ChatbotAssessmentTriggerPayload = {
	assessmentId: string;
	displayName: string | null;
	category: string | null;
	score: string | null;
};

export type ChatbotAssessmentTriggerStatus =
	| "idle"
	| "loading"
	| "ready"
	| "error";

export type ChatbotAssessmentTriggerOpeningMessageWire = {
	id: string;
	content: string;
	created_at: string;
	follow_up_chips?: Array<{ display: string; submit: string }> | null;
};

export type ChatbotAssessmentTriggerResponseWire = {
	assessment_id: string;
	thread: {
		id: string;
		title: string;
		pinned: boolean;
		persona: string;
		chat_mode: string;
		coach_client_id: string | null;
		created_at: string;
		updated_at: string;
		last_message_at: string | null;
	};
	opening_message: ChatbotAssessmentTriggerOpeningMessageWire;
};

export type ChatbotAssessmentTriggerSessionData = {
	thread: ChatbotThread;
	openingMessage: {
		id: string;
		content: string;
		createdAt: string;
		followUpChips: ChatbotFollowUpChip[];
	};
};

export type ChatbotAssessmentTriggerApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; message: string };

export type AssessmentCoachingTriggerProps = {
	assessmentId: string;
	displayName: string;
	enabled: boolean;
};

export type BootstrapAssessmentTriggerOutcome =
	| "success"
	| "skipped_duplicate"
	| "error"
	| "aborted"
	| "invalid";
