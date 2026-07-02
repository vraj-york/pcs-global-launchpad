/**
 * SSE wire types for chatbot streaming (`chatbot.api` / backend contract).
 */

/** Incremental text token from the final LLM response turn. */
export type SSETokenEvent = {
	event: "token";
	data: { text: string };
};

/** Progress signal emitted while the agentic loop executes a tool. */
export type SSEToolActivityEvent = {
	event: "tool_activity";
	data: {
		action: string;
		tool_name: string | null;
		reset_stream: boolean;
	};
};

/** Stable lifecycle-phase keys for the thinking timeline (client owns copy/icon). */
export type ThinkingStepKey =
	| "parse_intent"
	| "scan_context"
	| "organize_output";

/** A thinking-timeline row: `key` is a fixed phase or tool id; `label` is the tool fallback copy. */
export type SSEThinkingStepEvent = {
	event: "thinking_step";
	data: {
		key: string;
		status: "active" | "done";
		label: string | null;
	};
};

/** Terminal success event — stream complete; carries model + usage metadata. */
export type SSEDoneEvent = {
	event: "done";
	data: {
		model: string;
		usage: { input_tokens: number; output_tokens: number };
	};
};

/** Terminal failure event — stream ending due to an error. */
export type SSEErrorEvent = {
	event: "error";
	data: { message: string; code: string };
};

/** Emitted as the first frame when the backend auto-creates a new thread. */
export type SSEThreadCreatedEvent = {
	event: "thread_created";
	data: { thread_id: string; persona: string; chat_mode: string };
};

/** Dynamic chips after `done`: short `display`, longer `submit` sent on click. */
export type ChatbotSuggestionChipWire = {
	display: string;
	submit: string;
};

export type SSESuggestionsEvent = {
	event: "suggestions";
	data: { chips: ChatbotSuggestionChipWire[] };
};

export type SSEEvent =
	| SSETokenEvent
	| SSEToolActivityEvent
	| SSEThinkingStepEvent
	| SSEDoneEvent
	| SSEErrorEvent
	| SSEThreadCreatedEvent
	| SSESuggestionsEvent;
