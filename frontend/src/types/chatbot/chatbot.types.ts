import type { LucideIcon } from "lucide-react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import type { ChatbotRole, ChatbotSearchMode } from "@/const";
import type { ChatbotPeerMention } from "@/types";
import type {
	BootstrapAssessmentTriggerOutcome,
	ChatbotAssessmentTriggerPayload,
	ChatbotAssessmentTriggerStatus,
} from "./chatbot-assessment-trigger.types";
import type {
	ChatbotProactiveEmployeePayload,
	ChatbotProactiveStage,
} from "./chatbot-proactive.api.types";
import type { ChatbotProactiveEmployeePhase } from "./chatbot-proactive.types";
export type ChatbotMessageRole = "user" | "assistant";

export type ChatbotThinkingStepStatus = "active" | "done";

/** A thinking-timeline row: `key` is a fixed phase or tool id; `label` is tool fallback copy. */
export type ChatbotThinkingStep = {
	key: string;
	status: ChatbotThinkingStepStatus;
	label?: string;
};

export type ChatbotFollowUpChip = {
	display: string;
	submit: string;
};

export type ChatbotMessageFollowUps =
	| { status: "loading" }
	| { status: "ready"; chips: ChatbotFollowUpChip[] };

export type ChatbotFollowUpChipsProps = {
	followUps: ChatbotMessageFollowUps;
	onSelectQuery: (query: string) => void;
	/** Full view: row of chips. Compact: stacked column. */
	variant?: "default" | "compact";
};

export type FollowUpChipClickPayload = {
	event: "follow_up_chip_click";
	isSummarize: boolean;
	queryCharLength: number;
};

export type FollowUpTelemetryHandler = (
	payload: FollowUpChipClickPayload,
) => void;

export type ChatbotMessage = {
	id: string;
	role: ChatbotMessageRole;
	content: string;
	createdAt: string;
	followUps?: ChatbotMessageFollowUps;
	/** Frozen thinking timeline shown above this assistant answer (live session only). */
	thinkingSteps?: ChatbotThinkingStep[];
};

export type ChatbotThread = {
	id: string;
	title: string;
	pinned: boolean;
	persona: string;
	chatMode: string;
	coachClientId: string | null;
	createdAt: string;
	updatedAt: string;
	lastMessageAt: string | null;
};

export type ChatbotStore = {
	threads: ChatbotThread[];
	titleRevealThreadId: string | null;
	titleRevealToken: number;
	titleGeneratingThreadId: string | null;
	activeThreadId: string | null;
	threadsLoading: boolean;
	threadsError: string | null;
	isCompactOpen: boolean;
	isCompactHistoryOpen: boolean;
	chatMessages: ChatbotMessage[];
	question: string;
	composerMentions: ChatbotPeerMention[];
	searchMode: ChatbotSearchMode;
	role: ChatbotRole;
	clientId: string;
	sessionId: string | null;
	isChatLoading: boolean;
	isThreadLoading: boolean;
	streamingStarted: boolean;
	streamingStatus: string | null;
	thinkingSteps: ChatbotThinkingStep[];
	thinkingComplete: boolean;
	activeStreamingMessageId: string | null;
	greetingIndex: number;
	threadLocalSnapshots: Record<string, ChatbotMessage[]>;
	proactiveEmployeePayload: ChatbotProactiveEmployeePayload | null;
	assessmentTriggerStatus: ChatbotAssessmentTriggerStatus;
	isAssessmentCoachingSession: boolean;
	fetchThreads: () => Promise<void>;
	prependThread: (thread: ChatbotThread) => void;
	setActiveThreadId: (id: string | null) => void;
	updateThreadTitle: (id: string, title: string) => void;
	setTitleGeneratingThreadId: (id: string | null) => void;
	setQuestion: (value: string) => void;
	setComposerMentions: (mentions: ChatbotPeerMention[]) => void;
	setSearchMode: (value: ChatbotSearchMode) => void;
	setRole: (value: ChatbotRole) => void;
	setClientId: (value: string) => void;
	openCompactHistory: () => void;
	closeCompactHistory: () => void;
	toggleCompactHistory: () => void;
	newConversation: () => void;
	resetSessionForNewRole: () => void;
	renameThread: (id: string, title: string) => Promise<boolean>;
	togglePinThread: (id: string, pinned: boolean) => Promise<boolean>;
	deleteThread: (id: string) => Promise<boolean>;
	selectThread: (thread: ChatbotThread) => Promise<void>;
	fetchProactiveEmployeePayload: () => Promise<void>;
	bootstrapAssessmentTrigger: (
		payload: ChatbotAssessmentTriggerPayload,
	) => Promise<BootstrapAssessmentTriggerOutcome>;
	sendMessage: (contentOverride?: string) => Promise<void>;
	openCompact: () => void;
	closeCompact: (options?: { resetSession?: boolean }) => void;
	reset: () => void;
};

export type ChatbotTopBarOption = {
	label: string;
	value: string;
};

export type ChatbotMentionTextareaProps = {
	value: string;
	onChange: (value: string) => void;
	onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
	onFocus?: () => void;
	disabled?: boolean;
	mentionsEnabled?: boolean;
	selectedMentions: ChatbotPeerMention[];
	onMentionsChange: (mentions: ChatbotPeerMention[]) => void;
	className?: string;
	rows?: number;
	ariaLabel: string;
	placeholder: string;
};

export type ChatbotComposerProps = {
	question: string;
	searchMode: ChatbotSearchMode;
	isLoading: boolean;
	mentionsEnabled?: boolean;
	composerMentions: ChatbotPeerMention[];
	disclaimerAlign?: "center" | "left";
	onQuestionChange: (value: string) => void;
	onComposerMentionsChange: (mentions: ChatbotPeerMention[]) => void;
	onSearchModeChange: (value: ChatbotSearchMode) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
	onComposerFocus?: () => void;
};

export type ChatbotConversationProps = {
	messages: ChatbotMessage[];
	isChatLoading: boolean;
	isThreadLoading: boolean;
	streamingStarted: boolean;
	streamingStatus: string | null;
	thinkingSteps: ChatbotThinkingStep[];
	thinkingComplete: boolean;
	activeStreamingMessageId: string | null;
	onFollowUpSelect?: (query: string) => void;
};

export type ChatbotThinkingTimelineProps = {
	steps: ChatbotThinkingStep[];
	/** True while still processing — drives header tense, dots, and Done row. */
	isProcessing: boolean;
	/** Expanded on mount (live, in-progress block) vs collapsed (settled message). */
	defaultExpanded?: boolean;
};

/** A resolved thinking-timeline row ready to render. */
export type ChatbotThinkingTimelineRow = {
	id: string;
	icon: LucideIcon;
	label: string;
};

export type ChatbotEmptyStateProps = {
	greeting: string;
	variant?: "default" | "compact";
};

export type ChatbotEmployeeProactiveEmptyProps = {
	phase: ChatbotProactiveEmployeePhase;
	displayName: string;
	onSuggestionSelect: (query: string) => void;
	stageData?: ChatbotProactiveStage;
};

export type ChatbotSidebarProps = {
	activeThreadId: string | null;
	onNewConversation: () => void;
	onThreadSelect: (thread: ChatbotThread) => void;
	children: ReactNode;
};

export type ChatbotTopBarProps = {
	clientId: string;
	clientOptions: readonly ChatbotTopBarOption[];
	showClientSelect: boolean;
	isLoading: boolean;
	onClientChange: (value: string) => void;
	onClose: () => void;
	onExpand: () => void;
	activeThread?: ChatbotThread | null;
	onRenameThread?: (id: string, title: string) => Promise<boolean>;
	onTogglePinThread?: (id: string, pinned: boolean) => Promise<boolean>;
	onDeleteThread?: (id: string) => Promise<boolean>;
};

export type ChatbotThreadListProps = {
	threads: ChatbotThread[];
	activeThreadId: string | null;
	isLoading: boolean;
	titleRevealThreadId: string | null;
	titleRevealToken: number;
	titleGeneratingThreadId: string | null;
	onThreadSelect: (thread: ChatbotThread) => void;
	onRenameThread: (id: string, title: string) => Promise<boolean>;
	onTogglePinThread: (id: string, pinned: boolean) => Promise<boolean>;
	onDeleteThread: (id: string) => Promise<boolean>;
	uiVariant?: "default" | "compact";
};

export type ChatbotThreadItemProps = {
	thread: ChatbotThread;
	isActive: boolean;
	isRefreshing: boolean;
	isTitleGenerating: boolean;
	shouldRevealTitle: boolean;
	titleRevealToken: number;
	uiVariant: "default" | "compact";
	onSelect: () => void;
	onRenameStart: () => void;
	onTogglePin: () => void;
	onDeleteStart: () => void;
	onExportStart: () => void;
};

export type ChatbotExportModalProps = {
	thread: ChatbotThread | null;
	onClose: () => void;
};

export type ChatbotThreadRenameInputProps = {
	thread: ChatbotThread;
	onConfirm: (title: string) => void;
	onCancel: () => void;
};

export type ChatbotCompactComposerProps = {
	question: string;
	searchMode: ChatbotSearchMode;
	isLoading: boolean;
	mentionsEnabled?: boolean;
	composerMentions: ChatbotPeerMention[];
	onQuestionChange: (value: string) => void;
	onComposerMentionsChange: (mentions: ChatbotPeerMention[]) => void;
	onSearchModeChange: (value: ChatbotSearchMode) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export type MessageTimestampLabelProps = {
	createdAt: string;
	className?: string;
};
