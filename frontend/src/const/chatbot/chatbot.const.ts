/**
 * Chatbot Page Content Constants
 */
import {
	BookOpen,
	Building2,
	CodeXml,
	LayoutGrid,
	type LucideIcon,
	NotebookPen,
	Search,
	UserRound,
} from "lucide-react";
import type { ThinkingStepKey } from "@/types";

export const CHATBOT_PAGE_CONTENT = {
	title: "BiSPy Bot",
	subtitle: "Ask questions and get intelligent responses",
	sendButton: "Send",
	searchModeLabel: "Search Mode",
	quickMode: "Quick",
	deepDiveMode: "Deep",
	clientIdLabel: "Client",
	loadingMessage: "Thinking...",
	threadLoadingMessage: "Loading conversation…",
	errorMessage: "Something went wrong. Please try again.",
	emptyResponseMessage: "No response received. Please try again.",
	newConversationButton: "New Conversation",
	heroPrompt: "How can I help you today?",
	disclaimer:
		"AI-generated insights based on BSP and other inputs. For guidance only — use your judgment.",
	closeButtonLabel: "Close chatbot",
	sidebarResizeHandleLabel: "Resize sidebar",
	collapseSidebarLabel: "Collapse sidebar",
	expandSidebarLabel: "Expand sidebar",
	searchChatsAriaLabel: "Search conversation history",
	menuButtonLabel: "Chat actions",
	expandButtonLabel: "Expand chatbot",
	attachmentButtonLabel: "Attachments are not available yet",
	voiceInputButtonLabel: "Voice input is not available yet",
	copyButtonLabel: "Copy message",
	positiveFeedbackButtonLabel: "Positive feedback coming soon",
	negativeFeedbackButtonLabel: "Negative feedback coming soon",
	copySuccessMessage: "Message copied.",
	copyErrorMessage: "Could not copy the message.",
	currentConversationFallbackTitle: "Current Conversation",
	summarizeConversationChipLabel: "Summarize Conversation",
	summarizeConversationUserQuery:
		"Please provide a concise summary of our conversation so far: main topics, key conclusions, and any open items.",
	followUpSuggestionsRegionLabel: "Suggested next steps",
} as const;

/**
 * Gemini-style "thinking" timeline copy. Phase labels are curated and stable;
 * their timing is driven by real backend `thinking_step` SSE events.
 */
export const CHATBOT_THINKING_CONTENT = {
	headerActive: "Processing your request…",
	headerDone: "Processed your request…",
	doneLabel: "Done",
	toggleLabel: "Toggle thinking steps",
	regionLabel: "Assistant thinking steps",
	steps: {
		parse_intent: "Parsing intent and identifying key inputs",
		scan_context: "Scanning past chats, files, and context",
		organize_output: "Organizing output for clarity and usefulness",
	},
} as const;

/** Display copy for dynamic tool steps, keyed by backend tool identifier. */
export const CHATBOT_THINKING_TOOL_LABELS: Record<string, string> = {
	search_knowledge_base: "Searching the knowledge base for relevant insights",
	get_client_snapshot: "Reviewing the client profile and current status",
	get_session_notes_history: "Reading through past session notes",
	get_corporations_list: "Gathering the list of corporations",
	get_corporation_details: "Pulling detailed corporation records",
};

/** Icons for the fixed thinking phases, keyed by phase. */
export const CHATBOT_THINKING_STEP_ICONS: Record<ThinkingStepKey, LucideIcon> =
	{
		parse_intent: CodeXml,
		scan_context: Search,
		organize_output: LayoutGrid,
	};

/** Icons for dynamic tool steps, keyed by backend tool identifier. */
export const CHATBOT_THINKING_TOOL_ICONS: Record<string, LucideIcon> = {
	search_knowledge_base: BookOpen,
	get_client_snapshot: UserRound,
	get_session_notes_history: NotebookPen,
	get_corporations_list: Building2,
	get_corporation_details: Building2,
};

/**
 * BSPBadge `type` token for suggested next-step chips → Badge `followUpChip` variant.
 */
export const CHATBOT_BADGE_TYPE_FOLLOW_UP_CHIP = "follow_up_chip";

export const CHATBOT_GREETING_VARIANTS = [
	"{timeOfDay}!",
	"Ready when you are.",
	"Let's get into it.",
	"What are we tackling?",
	"I'm here and ready.",
] as const;

/**
 * Chatbot Search Modes
 */
export const CHATBOT_SEARCH_MODES = {
	quick: "quick",
	deepDive: "deep_dive",
} as const;

export type ChatbotSearchMode =
	(typeof CHATBOT_SEARCH_MODES)[keyof typeof CHATBOT_SEARCH_MODES];

export type ChatbotRole =
	| "employee"
	| "coach"
	| "company_admin"
	| "corporation_admin"
	| "superadmin";

export const CHATBOT_BOT_NAME = "BiSPy Bot";

/** Default chatbot sidebar width as a viewport-width percentage. */
export const CHATBOT_SIDEBAR_DEFAULT_WIDTH_VW = 18;

/** Maximum chatbot sidebar width as a viewport-width percentage. */
export const CHATBOT_SIDEBAR_MAX_WIDTH_VW = 32;

/**
 * Mock coach clients — maps display name to the client_id expected by the
 * chatbot backend. Replace with an API-backed list once the backend has a
 * GET /api/coach/clients endpoint.
 */
export const COACH_CLIENTS = [
	{ value: "client_0042", label: "Sarah Mitchell" },
	{ value: "client_0091", label: "James Okafor" },
] as const;

export const CHATBOT_DEFAULT_ROLE: ChatbotRole = "employee";

/**
 * Compact widget content strings
 */
export const CHATBOT_COMPACT_CONTENT = {
	headerPersonName: "Dr. John Mlinarik",
	headerPersonRole: "AI Coach",
	openButtonLabel: "Open BiSPy Bot",
	historyButtonLabel: "View conversation history",
	toggleHistoryLabel: "Toggle recent conversations",
	expandButtonLabel: "Open full chatbot",
	closeButtonLabel: "Close chatbot",
	newConversationWithPlus: "New Conversation",
} as const;

/**
 * Chatbot Thread / Conversation History Content
 */
export const CHATBOT_THREAD_CONTENT = {
	recentChats: "Recent Chats",
	pinnedChats: "Pinned Chats",
	togglePinnedChatsLabel: "Toggle pinned chats",
	toggleRecentChatsLabel: "Toggle recent chats",
	noPinnedChats: "No pinned chats yet.",
	noChatsFound: "No chats found.",
	rename: "Rename",
	delete: "Delete",
	pinChat: "Pin chat",
	unpinChat: "Unpin chat",
	saveAsPdf: "Save as PDF",
	deleteTitle: "Delete Conversation",
	deleteDescription:
		"This will permanently remove this conversation. This action cannot be undone.",
	deleteConfirmLabel: "Delete",
	deleteCancelLabel: "Cancel",
	emptyState: "No conversations yet. Start a new one.",
	generatingTitle: "Generating title",
	moreActionsLabel: "More options",
	loadMessagesError: "Failed to load conversation messages.",
	compactButtonLabel: "Compact view",
} as const;

export const CHATBOT_EXPORT_CONTENT = {
	modalTitle: "Export Conversation",
	modalDescription:
		"This export contains personal or coaching information. Please store & share it securely in accordance with your organization's data policy.",
	privacyNoteTitle: "Privacy Note",
	privacyNoteBody:
		"The PDF is generated from server-side, contain only your messages and is never stored. The download link is one-time use.",
	confirmLabel: "Download PDF",
	cancelLabel: "Cancel",
	loadingLabel: "Generating PDF…",
	successTitle: "Saved Successfully!",
	successDescription: "Your chat has been saved successfully.",
	errorTitle: "Export Failed",
	errorDescription: "Could not generate the PDF. Please try again.",
} as const;
