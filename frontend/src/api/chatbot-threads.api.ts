import type { AxiosError } from "axios";
import type {
	ChatbotThread,
	ChatbotThreadApiResult,
	ChatbotThreadMessageRaw,
	ChatbotThreadMessagesPageData,
	ChatbotThreadRaw,
} from "@/types";
import { chatbotAxios } from "./chatbot.api";

/**
 * Thread REST calls use a shorter timeout than the main chat `chatbotAxios` (60s).
 * Base URL is `VITE_CHATBOT_API_URL` (e.g. `https://…/v1`); paths are appended per call.
 */
const threadHttpConfig = { timeout: 30000 as const };
const withThreadConfig = (config?: object) => ({
	...config,
	...threadHttpConfig,
});

function mapThread(raw: ChatbotThreadRaw): ChatbotThread {
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

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 50);
}

function buildExportFilename(threadTitle: string): string {
	const date = new Date().toISOString().split("T")[0];
	const slug = slugify(threadTitle) || "conversation";
	return `conversation-${slug}-${date}.pdf`;
}

export const chatbotThreadsApi = {
	/**
	 * Create a new thread, optionally with a title.
	 * Returns the new thread immediately so the frontend can register it in the
	 * sidebar before the first streaming response arrives.
	 */
	createThread: async (body: {
		persona: string;
		chatMode: string;
		coachClientId?: string;
	}): Promise<ChatbotThreadApiResult<ChatbotThread>> => {
		try {
			const response = await chatbotAxios.post<ChatbotThreadRaw>(
				"/threads",
				{
					persona: body.persona,
					chat_mode: body.chatMode,
					coach_client_id: body.coachClientId ?? null,
				},
				withThreadConfig(),
			);
			return { ok: true, data: mapThread(response.data) };
		} catch (error) {
			return {
				ok: false,
				message: extractErrorMessage(error, "Failed to create conversation."),
			};
		}
	},

	/**
	 * Generate a short AI title for a thread from its first exchange.
	 * Fire-and-forget from the caller's perspective — silently no-ops on error.
	 */
	generateTitle: async (
		threadId: string,
		userMessage: string,
		assistantReply: string,
	): Promise<ChatbotThreadApiResult<{ title: string }>> => {
		try {
			const response = await chatbotAxios.post<{
				thread_id: string;
				title: string;
			}>(
				`/threads/${threadId}/generate-title`,
				{
					user_message: userMessage,
					assistant_reply: assistantReply,
				},
				withThreadConfig(),
			);
			return { ok: true, data: { title: response.data.title } };
		} catch (error) {
			return {
				ok: false,
				message: extractErrorMessage(error, "Failed to generate title."),
			};
		}
	},

	/**
	 * List the authenticated user's threads, pinned-first then by last activity.
	 */
	listThreads: async (
		limit = 50,
		offset = 0,
	): Promise<
		ChatbotThreadApiResult<{ threads: ChatbotThread[]; total: number }>
	> => {
		try {
			const response = await chatbotAxios.get<{
				threads: ChatbotThreadRaw[];
				total: number;
			}>("/threads", withThreadConfig({ params: { limit, offset } }));
			return {
				ok: true,
				data: {
					threads: response.data.threads.map(mapThread),
					total: response.data.total,
				},
			};
		} catch (error) {
			return {
				ok: false,
				message: extractErrorMessage(error, "Failed to load conversations."),
			};
		}
	},

	/**
	 * Rename a thread and/or toggle its pinned state.
	 * At least one of title/pinned must be provided.
	 */
	updateThread: async (
		id: string,
		body: { title?: string; pinned?: boolean },
	): Promise<ChatbotThreadApiResult<ChatbotThread>> => {
		try {
			const response = await chatbotAxios.patch<ChatbotThreadRaw>(
				`/threads/${id}`,
				body,
				withThreadConfig(),
			);
			return { ok: true, data: mapThread(response.data) };
		} catch (error) {
			return {
				ok: false,
				message: extractErrorMessage(error, "Failed to update conversation."),
			};
		}
	},

	/**
	 * Soft-delete a thread (HTTP 204 on success).
	 */
	deleteThread: async (id: string): Promise<ChatbotThreadApiResult<void>> => {
		try {
			await chatbotAxios.delete(`/threads/${id}`, withThreadConfig());
			return { ok: true, data: undefined };
		} catch (error) {
			return {
				ok: false,
				message: extractErrorMessage(error, "Failed to delete conversation."),
			};
		}
	},

	/**
	 * Export a thread as a PDF and trigger a browser file download.
	 * Calls GET /threads/{id}/export which returns raw PDF bytes.
	 *
	 * @param threadId
	 * @param threadTitle
	 * @param displayName
	 */
	exportThread: async (
		threadId: string,
		threadTitle: string,
		displayName: string,
	): Promise<ChatbotThreadApiResult<void>> => {
		try {
			// The backend returns JSON { filename, data: "<base64 PDF>" } rather
			// than a raw binary response. This sidesteps the API Gateway
			// binary_media_types requirement — without it, API Gateway forwards
			// Mangum's base64-encoded body as plain text, producing a corrupt file.
			const response = await chatbotAxios.get<{
				filename: string;
				data: string;
			}>(`/threads/${threadId}/export`, {
				params: { display_name: displayName || undefined },
				...withThreadConfig(),
			});

			const { filename: serverFilename, data: b64 } = response.data;
			const filename = serverFilename ?? buildExportFilename(threadTitle);

			const byteChars = atob(b64);
			const byteArray = new Uint8Array(byteChars.length);
			for (let i = 0; i < byteChars.length; i++) {
				byteArray[i] = byteChars.charCodeAt(i);
			}

			const blob = new Blob([byteArray], { type: "application/pdf" });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = filename;
			document.body.appendChild(anchor);
			anchor.click();
			document.body.removeChild(anchor);
			URL.revokeObjectURL(url);

			return { ok: true, data: undefined };
		} catch (error) {
			return {
				ok: false,
				message: extractErrorMessage(error, "Failed to export conversation."),
			};
		}
	},

	/**
	 * Return paginated messages for a thread, oldest-first within the page.
	 * Pass beforeId to load an older page (cursor-based pagination).
	 */
	getMessages: async (
		threadId: string,
		limit = 20,
		beforeId?: string,
	): Promise<ChatbotThreadApiResult<ChatbotThreadMessagesPageData>> => {
		try {
			const response = await chatbotAxios.get<{
				messages: ChatbotThreadMessageRaw[];
				has_more: boolean;
			}>(
				`/threads/${threadId}/messages`,
				withThreadConfig({
					params: {
						limit,
						...(beforeId ? { before_id: beforeId } : {}),
					},
				}),
			);
			return {
				ok: true,
				data: {
					messages: response.data.messages.map((m) => ({
						id: m.id,
						role: m.role,
						content: m.content,
						createdAt: m.created_at,
						followUpChipsWire: m.follow_up_chips,
					})),
					hasMore: response.data.has_more,
				},
			};
		} catch (error) {
			return {
				ok: false,
				message: extractErrorMessage(error, "Failed to load messages."),
			};
		}
	},
};
