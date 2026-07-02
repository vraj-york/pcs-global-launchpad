import type { ChatbotFollowUpChip } from "./chatbot.types";

/** Wire-format thread row as returned by the backend (snake_case). */
export type ChatbotThreadRaw = {
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

/** Wire-format message row as returned by GET /threads/{id}/messages. */
export type ChatbotThreadMessageRaw = {
	id: string;
	conversation_id: string;
	role: string;
	content: string;
	created_at: string;
	follow_up_chips?: ChatbotFollowUpChip[] | null;
};

export type ChatbotThreadApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; message: string };

/** One message row from GET /threads/:id/messages before the store maps `followUpChipsWire` → `followUps`. */
export type ChatbotThreadMessageLoaded = {
	id: string;
	role: string;
	content: string;
	createdAt: string;
	followUpChipsWire?: ChatbotFollowUpChip[] | null;
};

export type ChatbotThreadMessagesPageData = {
	messages: ChatbotThreadMessageLoaded[];
	hasMore: boolean;
};
