import axios, { type InternalAxiosRequestConfig } from "axios";
import type { ChatbotRole, ChatbotSearchMode } from "@/const";
import { getBearerToken } from "@/lib";
import type { ChatbotPeerMention, SSEEvent } from "@/types";

/**
 * Chatbot REST base URL (e.g. `https://…/v1`). Set `VITE_CHATBOT_API_URL` in the env
 * file. Chat and thread endpoints append paths to this (e.g. `""` for chat, `/threads/…`).
 */
const CHATBOT_API_BASE_URL = import.meta.env.VITE_CHATBOT_API_URL;

/**
 * Streaming endpoint URL — text/event-stream responses via SSE.
 * NOTE: AWS Lambda requires InvokeMode: RESPONSE_STREAM on the Lambda URL.
 */
const CHATBOT_STREAM_URL = import.meta.env.VITE_CHATBOT_STREAM_URL;

/** Wire-format message shape expected by the backend conversation_history field. */
export type ConversationMessage = {
	role: "user" | "assistant";
	content: string;
};

/**
 * Chatbot Request Types
 */
export type ChatbotRequest = {
	question: string;
	searchMode: ChatbotSearchMode;
	role: ChatbotRole;
	mentions?: ChatbotPeerMention[];
	conversationHistory?: ConversationMessage[];
	clientId?: string;
	sessionId?: string;
	threadId?: string;
};

/**
 * Chatbot Response Types
 */
export type ChatbotResponse = {
	answer: string;
	sources?: string[];
};

/**
 * Chatbot API Response wrapper
 */
export type ChatbotApiResponse<T> = {
	data: T;
	status: number;
	ok: true;
};

export type ChatbotApiError = {
	message: string;
	status: number;
	ok: false;
};

/**
 * Chatbot axios — same base for chat and threads (`chatbot-threads.api.ts`).
 */
export const chatbotAxios = axios.create({
	baseURL: CHATBOT_API_BASE_URL,
	timeout: 60000, // 60 seconds for AI responses
	headers: {
		"Content-Type": "application/json",
	},
});

/**
 * Request interceptor: add Authorization Bearer token for chatbot API
 */
chatbotAxios.interceptors.request.use(
	async (config: InternalAxiosRequestConfig) => {
		const token = await getBearerToken();
		if (token) {
			config.headers.set("Authorization", `Bearer ${token}`);
		}
		return config;
	},
	(error) => Promise.reject(error),
);

/** Re-export SSE wire types for callers that import from this module. */
export type {
	ChatbotSuggestionChipWire,
	SSEDoneEvent,
	SSEErrorEvent,
	SSEEvent,
	SSESuggestionsEvent,
	SSEThreadCreatedEvent,
	SSETokenEvent,
	SSEToolActivityEvent,
} from "@/types";

/**
 * Async generator that reads a fetch() Response body as a text/event-stream
 * and yields fully-typed SSEEvent objects.
 *
 * Handles partial-chunk reads — the SSE frame boundary (\n\n) may arrive
 * split across TCP packets, so raw bytes are buffered until a complete
 * frame is available before parsing.
 */
export async function* parseSSEStream(
	response: Response,
): AsyncGenerator<SSEEvent, void, unknown> {
	if (!response.body) return;

	const reader = response.body.getReader();
	const decoder = new TextDecoder("utf-8");
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// SSE frames are delimited by \n\n
			const frames = buffer.split("\n\n");
			// Keep the last (potentially incomplete) fragment in the buffer
			buffer = frames.pop() ?? "";

			for (const frame of frames) {
				if (!frame.trim()) continue;

				let eventType = "message";
				let dataLine = "";

				for (const line of frame.split("\n")) {
					if (line.startsWith("event:")) {
						eventType = line.slice(6).trim();
					} else if (line.startsWith("data:")) {
						dataLine = line.slice(5).trim();
					}
				}

				if (!dataLine) continue;

				try {
					const parsed = JSON.parse(dataLine);
					yield { event: eventType, data: parsed } as SSEEvent;
					// Yield a macro-task turn between frames so that React can
					// commit the preceding setMessages() call before processing
					// the next frame.
					await new Promise<void>((r) => setTimeout(r, 0));
				} catch {}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Chatbot API Functions
 */
export const chatbotApi = {
	/**
	 * Send a question to the chatbot and stream the response via SSE.
	 *
	 * Yields typed SSEEvent objects as they arrive.
	 *
	 * Uses native fetch() + ReadableStream and not Axios — Axios buffers
	 * the full response before resolving.
	 *
	 * Pass `signal` to abort the stream to end request ends cleanly
	 */
	async *streamQuestion(
		request: ChatbotRequest,
		options?: { signal?: AbortSignal },
	): AsyncGenerator<SSEEvent, void, unknown> {
		const { signal } = options ?? {};
		const token = await getBearerToken();

		const body: Record<string, unknown> = {
			message: request.question,
			chat_mode: request.searchMode,
			user_type: request.role,
		};
		if (request.conversationHistory?.length) {
			body.conversation_history = request.conversationHistory;
		}
		if (request.clientId?.trim()) {
			body.client_id = request.clientId.trim();
		}
		if (request.sessionId) {
			body.session_id = request.sessionId;
		}
		if (request.threadId) {
			body.thread_id = request.threadId;
		}
		if (request.mentions?.length) {
			body.mentions = request.mentions.map((mention) => ({
				type: mention.type,
				id: mention.id,
				label: mention.label,
			}));
		}

		let response: Response;
		try {
			response = await fetch(CHATBOT_STREAM_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(body),
				signal,
			});
		} catch (err) {
			if (signal?.aborted || (err as Error).name === "AbortError") {
				return;
			}
			yield {
				event: "error" as const,
				data: {
					message: "Network error — could not reach the server.",
					code: "NETWORK_ERROR",
				},
			};
			return;
		}

		if (!response.ok) {
			yield {
				event: "error" as const,
				data: {
					message: `Server error (${response.status}). Please try again.`,
					code: "HTTP_ERROR",
				},
			};
			return;
		}

		yield* parseSSEStream(response);
	},

	/**
	 * Send a question to the chatbot
	 */
	askQuestion: async (
		request: ChatbotRequest,
	): Promise<ChatbotApiResponse<ChatbotResponse> | ChatbotApiError> => {
		try {
			const body: Record<string, unknown> = {
				message: request.question,
				chat_mode: request.searchMode,
				user_type: request.role,
			};

			// Only include conversation_history when there are prior turns to send.
			if (
				request.conversationHistory &&
				request.conversationHistory.length > 0
			) {
				body.conversation_history = request.conversationHistory;
			}

			// Only include client_id for coach sessions when the field is populated.
			if (request?.clientId?.trim()) {
				body.client_id = request.clientId.trim();
			}

			// Include session_id when present so the backend can group all turns of
			// this conversation under one audit record
			if (request.sessionId) {
				body.session_id = request.sessionId;
			}
			if (request.threadId) {
				body.thread_id = request.threadId;
			}
			if (request.mentions?.length) {
				body.mentions = request.mentions.map((mention) => ({
					type: mention.type,
					id: mention.id,
					label: mention.label,
				}));
			}

			const response = await chatbotAxios.post<ChatbotResponse>("", body);

			return {
				data: response.data,
				status: response.status,
				ok: true,
			};
		} catch (error) {
			if (axios.isAxiosError(error)) {
				let message = "An error occurred";
				const detail = error.response?.data?.detail;

				// Handle FastAPI validation errors (array of objects)
				if (Array.isArray(detail)) {
					message = detail
						.map((err: { msg?: string; loc?: string[] }) => {
							const field = err.loc?.slice(-1)[0] || "field";
							return `${field}: ${err.msg || "invalid"}`;
						})
						.join(", ");
				} else if (typeof detail === "string") {
					message = detail;
				} else if (error.response?.data?.message) {
					message = error.response.data.message;
				} else if (error.message) {
					message = error.message;
				}

				return {
					message,
					status: error.response?.status || 0,
					ok: false,
				};
			}
			return {
				message: "An unexpected error occurred",
				status: 0,
				ok: false,
			};
		}
	},
};

/** Re-export so callers can reference the streaming URL without coupling to env vars. */
export { CHATBOT_STREAM_URL };

/**
 * Type guard to check if response is an error
 */
export function isChatbotApiError(
	response: ChatbotApiResponse<ChatbotResponse> | ChatbotApiError,
): response is ChatbotApiError {
	return !response.ok;
}
