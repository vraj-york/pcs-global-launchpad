import { toast } from "sonner";
import { create } from "zustand";
import {
	chatbotApi,
	chatbotAssessmentTriggerApi,
	chatbotProactiveApi,
	chatbotThreadsApi,
} from "@/api";
import type { ChatbotRole, ChatbotSearchMode } from "@/const";
import {
	CHATBOT_ASSESSMENT_TRIGGER_CONTENT,
	CHATBOT_ASSESSMENT_TRIGGER_SESSION_KEY,
	CHATBOT_DEFAULT_ROLE,
	CHATBOT_GREETING_VARIANTS,
	CHATBOT_PAGE_CONTENT,
	CHATBOT_PROACTIVE_EMPLOYEE_DATA_SOURCE,
	CHATBOT_SEARCH_MODES,
	CHATBOT_THREAD_CONTENT,
} from "@/const";
import { syncMentionsWithText } from "@/lib";
import type {
	BootstrapAssessmentTriggerOutcome,
	ChatbotAssessmentTriggerPayload,
	ChatbotAssessmentTriggerStatus,
	ChatbotFollowUpChip,
	ChatbotMessage,
	ChatbotMessageFollowUps,
	ChatbotMessageRole,
	ChatbotPeerMention,
	ChatbotStore,
	ChatbotThinkingStep,
	ChatbotThread,
} from "@/types";

const MAX_HISTORY_ITEMS = 10;

/** Minimum visible dwell per thinking step, so the progression is perceivable. */
const THINKING_STEP_PACE_MS = 350;

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Append the error as a note when partial text exists; else use the error alone. */
function withErrorNote(existingContent: string, errorText: string): string {
	return existingContent.trim()
		? `${existingContent}\n\n${errorText}`
		: errorText;
}

/** Freeze live thinking steps for display on a completed message: all done, keep label. */
function finalizeThinkingSteps(
	steps: ChatbotThinkingStep[],
): ChatbotThinkingStep[] {
	return steps.map((step) => ({
		key: step.key,
		status: "done" as const,
		...(step.label ? { label: step.label } : {}),
	}));
}

export function parseFollowUpChipsFromWire(
	raw: unknown,
): ChatbotFollowUpChip[] {
	if (!Array.isArray(raw)) return [];
	const out: ChatbotFollowUpChip[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const o = item as Record<string, unknown>;
		const display = typeof o.display === "string" ? o.display.trim() : "";
		const submit = typeof o.submit === "string" ? o.submit.trim() : "";
		if (display && submit) out.push({ display, submit });
		if (out.length >= 2) break;
	}
	return out;
}

/** Build store followUps from API wire when loading thread history. */
export function followUpsFromWire(
	role: string,
	rawChips: ChatbotFollowUpChip[] | null | undefined,
): ChatbotMessageFollowUps | undefined {
	if (role !== "assistant") return undefined;
	const chips = parseFollowUpChipsFromWire(rawChips);
	if (chips.length === 0) return undefined;
	return { status: "ready", chips };
}

/**
 * Zustand selector: id of the latest assistant message (only that bubble shows follow-up chips).
 * Derived from `chatMessages` — no separate state to keep in sync.
 */
export function selectLastAssistantMessageId(state: {
	chatMessages: ChatbotMessage[];
}): string | null {
	for (let i = state.chatMessages.length - 1; i >= 0; i--) {
		if (state.chatMessages[i].role === "assistant") {
			return state.chatMessages[i].id;
		}
	}
	return null;
}

/** Stable order when API timestamps tie (user before assistant). */
function sortMessagesChronological(
	messages: ChatbotMessage[],
): ChatbotMessage[] {
	const roleOrder = (r: ChatbotMessageRole) => (r === "user" ? 0 : 1);
	return [...messages].sort((a, b) => {
		const t = a.createdAt.localeCompare(b.createdAt);
		if (t !== 0) return t;
		return roleOrder(a.role) - roleOrder(b.role);
	});
}

let streamAbortController: AbortController | null = null;
let streamGeneration = 0;
let threadsFetchGeneration = 0;
let threadsAutoRetryCount = 0;
let threadsAutoRetryTimer: ReturnType<typeof setTimeout> | null = null;
let proactiveEmployeeFetchGeneration = 0;
let assessmentTriggerGeneration = 0;

function assessmentTriggerStorageKey(assessmentId: string) {
	return `${CHATBOT_ASSESSMENT_TRIGGER_SESSION_KEY}:${assessmentId}`;
}

function hasAssessmentTriggerCompleted(assessmentId: string) {
	try {
		return (
			sessionStorage.getItem(assessmentTriggerStorageKey(assessmentId)) === "1"
		);
	} catch {
		return false;
	}
}

function markAssessmentTriggerCompleted(assessmentId: string) {
	try {
		sessionStorage.setItem(assessmentTriggerStorageKey(assessmentId), "1");
	} catch {
		// Ignore storage failures; in-memory guard still applies.
	}
}

function clearAssessmentTriggerCompleted(assessmentId: string) {
	try {
		sessionStorage.removeItem(assessmentTriggerStorageKey(assessmentId));
	} catch {
		// Ignore storage failures.
	}
}

function hasReadyAssessmentCoachingContent(state: {
	isAssessmentCoachingSession: boolean;
	activeThreadId: string | null;
	assessmentTriggerStatus: ChatbotAssessmentTriggerStatus;
	chatMessages: ChatbotMessage[];
}): boolean {
	return (
		state.isAssessmentCoachingSession &&
		Boolean(state.activeThreadId) &&
		state.assessmentTriggerStatus === "ready" &&
		state.chatMessages.length > 0
	);
}

function shouldSkipAssessmentTriggerBootstrap(
	assessmentId: string,
	state: {
		isAssessmentCoachingSession: boolean;
		activeThreadId: string | null;
		assessmentTriggerStatus: ChatbotAssessmentTriggerStatus;
		chatMessages: ChatbotMessage[];
	},
): boolean {
	if (hasReadyAssessmentCoachingContent(state)) {
		return true;
	}
	if (hasAssessmentTriggerCompleted(assessmentId)) {
		clearAssessmentTriggerCompleted(assessmentId);
		return false;
	}
	return false;
}

function abortActiveStream() {
	streamAbortController?.abort();
	streamAbortController = null;
}

function fireTitleGenerate(
	threadId: string,
	userMessage: string,
	assistantReply: string,
	updateThreadTitle: (id: string, title: string) => void,
	setTitleGeneratingThreadId: (id: string | null) => void,
) {
	void chatbotThreadsApi
		.generateTitle(threadId, userMessage, assistantReply)
		.then((result) => {
			if (result.ok) {
				updateThreadTitle(threadId, result.data.title);
			} else if (import.meta.env.DEV) {
				// Not shown to users; check Network for POST /generate-title (OPTIONS 204 is normal)
				console.warn("[chatbot] generateTitle failed", result.message, {
					threadId,
				});
			}
		})
		.finally(() => {
			setTitleGeneratingThreadId(null);
		});
}

function getNextGreetingIndex(previousIndex?: number) {
	if (CHATBOT_GREETING_VARIANTS.length <= 1) return 0;
	let nextIndex = Math.floor(Math.random() * CHATBOT_GREETING_VARIANTS.length);
	while (nextIndex === previousIndex) {
		nextIndex = Math.floor(Math.random() * CHATBOT_GREETING_VARIANTS.length);
	}
	return nextIndex;
}

/**
 * When a stream is interrupted, the client may have more message rows than the
 * server. Merge API messages with a stashed local copy for re-open UX.
 */
function mergeServerWithStashedLocal(
	server: ChatbotMessage[],
	stashed: ChatbotMessage[] | undefined,
): ChatbotMessage[] {
	if (!stashed || stashed.length === 0) {
		return server;
	}
	if (server.length === 0) {
		return stashed;
	}
	if (stashed.length > server.length) {
		return stashed;
	}
	if (stashed.length < server.length) {
		return server;
	}
	const srvLast = server[server.length - 1];
	const stLast = stashed[stashed.length - 1];
	if (
		srvLast.role === "assistant" &&
		stLast.role === "assistant" &&
		stLast.content.length > srvLast.content.length
	) {
		return [...server.slice(0, -1), { ...srvLast, content: stLast.content }];
	}
	return server;
}

const initialState = {
	threads: [] as ChatbotThread[],
	titleRevealThreadId: null as string | null,
	titleRevealToken: 0,
	titleGeneratingThreadId: null as string | null,
	activeThreadId: null as string | null,
	threadsLoading: false,
	threadsError: null as string | null,
	isCompactOpen: false,
	isCompactHistoryOpen: false,
	// Shared chat session (full + compact)
	chatMessages: [] as ChatbotMessage[],
	question: "",
	composerMentions: [] as ChatbotPeerMention[],
	searchMode: CHATBOT_SEARCH_MODES.quick as ChatbotSearchMode,
	role: CHATBOT_DEFAULT_ROLE as ChatbotRole,
	clientId: "",
	sessionId: null as string | null,
	isChatLoading: false,
	isThreadLoading: false,
	streamingStarted: false,
	streamingStatus: null as string | null,
	thinkingSteps: [] as ChatbotThinkingStep[],
	thinkingComplete: false,
	activeStreamingMessageId: null as string | null,
	greetingIndex: getNextGreetingIndex(),
	threadLocalSnapshots: {} as Record<string, ChatbotMessage[]>,
	proactiveEmployeePayload: null,
	assessmentTriggerStatus: "idle" as const,
	isAssessmentCoachingSession: false,
};

/** Sort threads: pinned first, then by last activity descending. */
function sortThreads(threads: ChatbotThread[]): ChatbotThread[] {
	return [...threads].sort((a, b) => {
		if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
		const aTime = a.lastMessageAt ?? a.updatedAt;
		const bTime = b.lastMessageAt ?? b.updatedAt;
		return bTime.localeCompare(aTime);
	});
}

export const useChatbotStore = create<ChatbotStore>()((set, get) => {
	/** Stash the current in-flight view before navigating away; merged on re-open. */
	const stashStreamingStateForCurrentThread = () => {
		const s = get();
		if (!s.isChatLoading || !s.activeThreadId) {
			return;
		}
		const tid = s.activeThreadId;
		const snapshot = s.chatMessages.map((m) => ({ ...m }));
		set((state) => ({
			threadLocalSnapshots: {
				...state.threadLocalSnapshots,
				[tid]: snapshot,
			},
		}));
	};

	return {
		...initialState,

		fetchThreads: async () => {
			const fetchGeneration = ++threadsFetchGeneration;
			set({ threadsLoading: true, threadsError: null });
			const result = await chatbotThreadsApi.listThreads();
			// Ignore stale responses from older in-flight requests.
			if (fetchGeneration !== threadsFetchGeneration) {
				return;
			}
			if (!result.ok) {
				set({ threadsLoading: false, threadsError: result.message });
				// First-open requests can fail while auth/session is still warming up.
				// Retry a couple of times when no list is available yet.
				const shouldAutoRetry =
					get().threads.length === 0 && threadsAutoRetryCount < 2;
				if (shouldAutoRetry) {
					threadsAutoRetryCount += 1;
					if (threadsAutoRetryTimer) {
						clearTimeout(threadsAutoRetryTimer);
					}
					threadsAutoRetryTimer = setTimeout(() => {
						void get().fetchThreads();
					}, 1200);
				}
				return;
			}
			threadsAutoRetryCount = 0;
			if (threadsAutoRetryTimer) {
				clearTimeout(threadsAutoRetryTimer);
				threadsAutoRetryTimer = null;
			}
			set({
				threads: sortThreads(result.data.threads),
				threadsLoading: false,
				threadsError: null,
			});
		},

		prependThread: (thread: ChatbotThread) => {
			set((state) => ({
				threads: sortThreads([thread, ...state.threads]),
			}));
		},

		setActiveThreadId: (id: string | null) => {
			set({ activeThreadId: id });
		},

		updateThreadTitle: (id: string, title: string) => {
			set((state) => ({
				threads: state.threads.map((t) => (t.id === id ? { ...t, title } : t)),
				titleRevealThreadId: id,
				titleRevealToken: state.titleRevealToken + 1,
				titleGeneratingThreadId:
					state.titleGeneratingThreadId === id
						? null
						: state.titleGeneratingThreadId,
			}));
		},
		setTitleGeneratingThreadId: (id: string | null) =>
			set({ titleGeneratingThreadId: id }),

		fetchProactiveEmployeePayload: async () => {
			const gen = ++proactiveEmployeeFetchGeneration;
			const useApiProactive =
				get().role === "employee" &&
				CHATBOT_PROACTIVE_EMPLOYEE_DATA_SOURCE === "api";
			if (!useApiProactive) {
				set({ proactiveEmployeePayload: null });
				return;
			}
			try {
				const result = await chatbotProactiveApi.getEmployeePayload();
				if (gen !== proactiveEmployeeFetchGeneration) {
					return;
				}
				set({
					proactiveEmployeePayload: result.ok ? result.data : null,
				});
			} catch {
				if (gen !== proactiveEmployeeFetchGeneration) {
					return;
				}
				set({ proactiveEmployeePayload: null });
			}
		},

		bootstrapAssessmentTrigger: async (
			payload: ChatbotAssessmentTriggerPayload,
		): Promise<BootstrapAssessmentTriggerOutcome> => {
			const assessmentId = payload.assessmentId.trim();
			if (!assessmentId) {
				return "invalid";
			}
			if (shouldSkipAssessmentTriggerBootstrap(assessmentId, get())) {
				if (!get().isCompactOpen) {
					get().openCompact();
				}
				return "skipped_duplicate";
			}

			const gen = ++assessmentTriggerGeneration;
			abortActiveStream();
			get().openCompact();
			set({
				role: "employee",
				assessmentTriggerStatus: "loading",
				isAssessmentCoachingSession: true,
				isChatLoading: false,
				isThreadLoading: false,
				streamingStarted: false,
				streamingStatus: null,
				thinkingSteps: [],
				thinkingComplete: false,
				activeStreamingMessageId: null,
				chatMessages: [],
				activeThreadId: null,
				sessionId: crypto.randomUUID(),
				question: "",
				composerMentions: [],
			});

			const result = await chatbotAssessmentTriggerApi.createSession(payload);
			if (gen !== assessmentTriggerGeneration) {
				return "aborted";
			}

			if (!result.ok) {
				set({ assessmentTriggerStatus: "error" });
				toast.error(
					result.message ||
						CHATBOT_ASSESSMENT_TRIGGER_CONTENT.sessionStartError,
				);
				return "error";
			}

			markAssessmentTriggerCompleted(assessmentId);

			const { thread, openingMessage } = result.data;
			const followUps: ChatbotMessageFollowUps | undefined =
				openingMessage.followUpChips.length > 0
					? { status: "ready", chips: openingMessage.followUpChips }
					: undefined;

			const assistantMessage: ChatbotMessage = {
				id: openingMessage.id,
				role: "assistant",
				content: openingMessage.content,
				createdAt: openingMessage.createdAt,
				followUps,
			};

			set((state) => ({
				threads: sortThreads([thread, ...state.threads]),
				activeThreadId: thread.id,
				chatMessages: [assistantMessage],
				assessmentTriggerStatus: "ready",
				isAssessmentCoachingSession: true,
				isCompactOpen: true,
			}));
			return "success";
		},

		setQuestion: (value: string) =>
			set((state) => ({
				question: value,
				composerMentions: syncMentionsWithText(value, state.composerMentions),
			})),
		setComposerMentions: (mentions: ChatbotPeerMention[]) =>
			set({ composerMentions: mentions }),
		setSearchMode: (value: ChatbotSearchMode) => set({ searchMode: value }),
		setRole: (value: ChatbotRole) => set({ role: value }),
		setClientId: (value: string) => set({ clientId: value }),

		openCompactHistory: () => set({ isCompactHistoryOpen: true }),
		closeCompactHistory: () => set({ isCompactHistoryOpen: false }),
		toggleCompactHistory: () =>
			set((s) => ({ isCompactHistoryOpen: !s.isCompactHistoryOpen })),

		newConversation: () => {
			stashStreamingStateForCurrentThread();
			abortActiveStream();
			const prev = get().greetingIndex;
			set({
				activeThreadId: null,
				chatMessages: [],
				question: "",
				composerMentions: [],
				sessionId: null,
				isChatLoading: false,
				isThreadLoading: false,
				streamingStarted: false,
				streamingStatus: null,
				thinkingSteps: [],
				thinkingComplete: false,
				activeStreamingMessageId: null,
				greetingIndex: getNextGreetingIndex(prev),
				isCompactHistoryOpen: false,
				assessmentTriggerStatus: "idle",
				isAssessmentCoachingSession: false,
			});
		},

		/** When role changes: reset chat and clear active thread (from full view). */
		resetSessionForNewRole: () => {
			stashStreamingStateForCurrentThread();
			abortActiveStream();
			const prev = get().greetingIndex;
			set({
				activeThreadId: null,
				chatMessages: [],
				question: "",
				composerMentions: [],
				clientId: "",
				sessionId: null,
				isChatLoading: false,
				isThreadLoading: false,
				streamingStarted: false,
				streamingStatus: null,
				thinkingSteps: [],
				thinkingComplete: false,
				activeStreamingMessageId: null,
				greetingIndex: getNextGreetingIndex(prev),
			});
		},

		renameThread: async (id: string, title: string): Promise<boolean> => {
			const prevThreads = get().threads;
			set((state) => ({
				threads: state.threads.map((t) => (t.id === id ? { ...t, title } : t)),
			}));
			const result = await chatbotThreadsApi.updateThread(id, { title });
			if (!result.ok) {
				set({ threads: prevThreads });
				toast.error(result.message);
				return false;
			}
			return true;
		},

		togglePinThread: async (id: string, pinned: boolean): Promise<boolean> => {
			const prevThreads = get().threads;
			set((state) => ({
				threads: sortThreads(
					state.threads.map((t) => (t.id === id ? { ...t, pinned } : t)),
				),
			}));
			const result = await chatbotThreadsApi.updateThread(id, { pinned });
			if (!result.ok) {
				set({ threads: prevThreads });
				toast.error(result.message);
				return false;
			}
			return true;
		},

		/**
		 * Delete a thread - pessimistic: the API call runs first; the UI only
		 * updates after the server confirms deletion. This prevents the background
		 * from switching to empty state while the confirmation modal is still open.
		 *
		 * If the thread is actively streaming when deletion is requested, the
		 * client-side stream is aborted before the API call to stop accumulating
		 * data for a thread that is about to be removed.
		 */
		deleteThread: async (id: string): Promise<boolean> => {
			const s = get();
			const { activeThreadId } = s;
			const wasActive = activeThreadId === id;

			if (wasActive && s.isChatLoading) {
				abortActiveStream();
			}

			const result = await chatbotThreadsApi.deleteThread(id);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}

			set((state) => ({
				threads: state.threads.filter((t) => t.id !== id),
				activeThreadId: wasActive ? null : state.activeThreadId,
			}));

			if (wasActive) {
				set({
					chatMessages: [],
					question: "",
					sessionId: null,
					isChatLoading: false,
					isThreadLoading: false,
					streamingStarted: false,
					streamingStatus: null,
					thinkingSteps: [],
					thinkingComplete: false,
					activeStreamingMessageId: null,
					greetingIndex: getNextGreetingIndex(s.greetingIndex),
				});
			}

			set((state) => {
				const next = { ...state.threadLocalSnapshots };
				delete next[id];
				return { threadLocalSnapshots: next };
			});

			return true;
		},

		/** Load a thread from the server into the shared session. */
		selectThread: async (thread: ChatbotThread) => {
			const { activeThreadId, isThreadLoading } = get();
			if (activeThreadId === thread.id || isThreadLoading) return;

			stashStreamingStateForCurrentThread();
			abortActiveStream();

			// Clear messages immediately so the UI does not stack a loader on top of the
			// previous thread (avoids the "pushed down" layout jump).
			set({
				chatMessages: [],
				question: "",
				sessionId: null,
				isChatLoading: false,
				streamingStarted: false,
				streamingStatus: null,
				thinkingSteps: [],
				thinkingComplete: false,
				activeStreamingMessageId: null,
				activeThreadId: thread.id,
				role: thread.persona as ChatbotRole,
				isThreadLoading: true,
				isCompactHistoryOpen: false,
			});

			const result = await chatbotThreadsApi.getMessages(thread.id, 20);
			set({ isThreadLoading: false });

			if (!result.ok) {
				toast.error(CHATBOT_THREAD_CONTENT.loadMessagesError);
				return;
			}

			const loadedMessages: ChatbotMessage[] = result.data.messages.map(
				(m) => ({
					id: m.id,
					role: m.role as ChatbotMessageRole,
					content: m.content,
					createdAt: m.createdAt,
					followUps: followUpsFromWire(m.role, m.followUpChipsWire),
				}),
			);

			const stashed = get().threadLocalSnapshots[thread.id];
			const merged = sortMessagesChronological(
				mergeServerWithStashedLocal(loadedMessages, stashed),
			);

			const prevGreeting = get().greetingIndex;
			set((state) => {
				const nextSnaps = { ...state.threadLocalSnapshots };
				if (stashed) {
					delete nextSnaps[thread.id];
				}
				return {
					chatMessages: merged,
					sessionId: null,
					greetingIndex: getNextGreetingIndex(prevGreeting),
					threadLocalSnapshots: nextSnaps,
				};
			});
		},

		/** One user turn + streaming response; shared by full and compact UIs. */
		sendMessage: async (contentOverride?: string) => {
			const draft = (contentOverride ?? get().question).trim();
			if (!draft) return;

			abortActiveStream();
			const myStreamGen = ++streamGeneration;
			streamAbortController = new AbortController();
			const signal = streamAbortController.signal;

			const s0 = get();
			const priorForHistory = s0.chatMessages.slice(-MAX_HISTORY_ITEMS);
			const history = priorForHistory.map(({ role: r, content: c }) => ({
				role: r,
				content: c,
			}));

			let {
				activeThreadId,
				sessionId,
				role,
				searchMode,
				clientId,
				composerMentions,
			} = s0;
			const mentionsForRequest =
				composerMentions.length > 0 ? composerMentions : undefined;

			const userMessage: ChatbotMessage = {
				id: crypto.randomUUID(),
				role: "user",
				content: draft,
				createdAt: new Date().toISOString(),
			};

			// Enter loading state synchronously (before the awaited thread
			// creation) so the composer disables and a rapid second Enter can't
			// double-send.
			set((state) => ({
				chatMessages: [
					...state.chatMessages.map((m) =>
						m.followUps ? { ...m, followUps: undefined } : m,
					),
					userMessage,
				],
				question: contentOverride ? state.question : "",
				composerMentions: contentOverride ? state.composerMentions : [],
				activeStreamingMessageId: null,
				streamingStarted: false,
				streamingStatus: null,
				thinkingSteps: [],
				thinkingComplete: false,
				isChatLoading: true,
			}));

			const isNewConversation = !activeThreadId;
			if (isNewConversation) {
				const createResult = await chatbotThreadsApi.createThread({
					persona: role,
					chatMode: searchMode,
					coachClientId: clientId.trim() || undefined,
				});
				if (createResult.ok) {
					activeThreadId = createResult.data.id;
					get().prependThread(createResult.data);
					set({ activeThreadId });
					// Start title-generation loading state immediately on first send.
					get().setTitleGeneratingThreadId(activeThreadId);
				}
			}

			let currentSessionId = sessionId ?? undefined;
			if (!currentSessionId) {
				currentSessionId = crypto.randomUUID();
				set({ sessionId: currentSessionId });
			}

			let localStatus: string | null = null;
			let firstAssistantText = "";
			let titleGenerated = false;
			let currentThreadId: string | null = activeThreadId;
			let streamingId: string | null = null;
			// Pacing is a minimum dwell: real backend latency counts toward it.
			let lastStepShownAt = Date.now();

			const paceStep = async () => {
				const remaining =
					THINKING_STEP_PACE_MS - (Date.now() - lastStepShownAt);
				if (remaining > 0) await sleep(remaining);
				lastStepShownAt = Date.now();
			};

			const doneTitleIfNeeded = () => {
				if (
					isNewConversation &&
					currentThreadId &&
					firstAssistantText &&
					!titleGenerated
				) {
					titleGenerated = true;
					fireTitleGenerate(
						currentThreadId,
						draft,
						firstAssistantText,
						get().updateThreadTitle,
						get().setTitleGeneratingThreadId,
					);
				}
			};

			try {
				for await (const event of chatbotApi.streamQuestion(
					{
						question: draft,
						searchMode,
						role,
						mentions: mentionsForRequest,
						conversationHistory: history.length > 0 ? history : undefined,
						clientId: clientId.trim() || undefined,
						sessionId: currentSessionId,
						threadId: currentThreadId || undefined,
					},
					{ signal },
				)) {
					if (signal.aborted) break;

					if (event.event === "thread_created") {
						currentThreadId = event.data.thread_id;
						const newThread: ChatbotThread = {
							id: event.data.thread_id,
							title: CHATBOT_PAGE_CONTENT.currentConversationFallbackTitle,
							pinned: false,
							persona: event.data.persona,
							chatMode: event.data.chat_mode,
							coachClientId: null,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
							lastMessageAt: null,
						};
						get().prependThread(newThread);
						set({ activeThreadId: currentThreadId });
						if (isNewConversation && !titleGenerated) {
							get().setTitleGeneratingThreadId(currentThreadId);
						}
					} else if (event.event === "token") {
						if (localStatus !== null) {
							localStatus = null;
							set({ streamingStatus: null });
						}
						const { text: tokenText } = event.data;
						firstAssistantText += tokenText;
						if (!streamingId) {
							// First token = processing done. Show the "Done" state
							// briefly, then freeze the timeline and stream the answer.
							if (get().thinkingSteps.length > 0) {
								set((state) => ({
									thinkingSteps: state.thinkingSteps.map((s) => ({
										...s,
										status: "done" as const,
									})),
									thinkingComplete: true,
								}));
								await paceStep();
								if (signal.aborted) break;
							}
							streamingId = crypto.randomUUID();
							const id = streamingId;
							// Freeze the timeline onto the message (collapsed above the answer).
							set((state) => {
								const frozenSteps = finalizeThinkingSteps(state.thinkingSteps);
								return {
									activeStreamingMessageId: id,
									streamingStarted: true,
									thinkingSteps: [],
									thinkingComplete: false,
									chatMessages: [
										...state.chatMessages,
										{
											id,
											role: "assistant" as const,
											content: tokenText,
											createdAt: new Date().toISOString(),
											thinkingSteps:
												frozenSteps.length > 0 ? frozenSteps : undefined,
										},
									],
								};
							});
						} else {
							const id = streamingId;
							set((state) => ({
								chatMessages: state.chatMessages.map((m) =>
									m.id === id ? { ...m, content: m.content + tokenText } : m,
								),
							}));
						}
					} else if (event.event === "tool_activity") {
						const { action, reset_stream } = event.data;
						if (reset_stream && streamingId) {
							set((state) => ({
								chatMessages: state.chatMessages.map((m) =>
									m.id === streamingId ? { ...m, content: "" } : m,
								),
							}));
							firstAssistantText = "";
						}
						localStatus = action;
						set({ streamingStatus: action });
					} else if (event.event === "thinking_step") {
						const { key, status, label } = event.data;
						set((state) => {
							const known = state.thinkingSteps.some((s) => s.key === key);
							if (!known) {
								return {
									thinkingSteps: [
										...state.thinkingSteps,
										{ key, status, label: label ?? undefined },
									],
								};
							}
							return {
								thinkingSteps: state.thinkingSteps.map((s) =>
									s.key === key
										? {
												...s,
												// Status is monotonic — never downgrade done → active.
												status: s.status === "done" ? "done" : status,
												label: label ?? s.label,
											}
										: s,
								),
							};
						});
						// Pace each new step so the progression is perceivable.
						if (status === "active") {
							await paceStep();
							if (signal.aborted) break;
						}
					} else if (event.event === "done") {
						doneTitleIfNeeded();
						if (currentThreadId) {
							set((state) => {
								const next = { ...state.threadLocalSnapshots };
								delete next[currentThreadId as string];
								return { threadLocalSnapshots: next };
							});
						}
						if (streamingId) {
							const sid = streamingId;
							set((state) => ({
								isChatLoading: false,
								streamingStatus: null,
								streamingStarted: false,
								thinkingSteps: [],
								thinkingComplete: false,
								chatMessages: state.chatMessages.map((m) =>
									m.id === sid ? { ...m, followUps: { status: "loading" } } : m,
								),
							}));
						} else {
							set({
								isChatLoading: false,
								streamingStatus: null,
								streamingStarted: false,
								thinkingSteps: [],
								thinkingComplete: false,
							});
						}
					} else if (event.event === "suggestions") {
						const sid = streamingId;
						if (sid) {
							const data = event.data as { chips?: unknown };
							const chips = parseFollowUpChipsFromWire(data.chips);
							set((state) => ({
								chatMessages: state.chatMessages.map((m) =>
									m.id === sid
										? {
												...m,
												followUps: {
													status: "ready",
													chips,
												},
											}
										: m,
								),
							}));
						}
					} else if (event.event === "error") {
						const errorText =
							event.data.message || CHATBOT_PAGE_CONTENT.errorMessage;
						if (streamingId) {
							const sid = streamingId;
							set((state) => ({
								chatMessages: state.chatMessages.map((m) =>
									m.id === sid
										? {
												...m,
												content: withErrorNote(m.content, errorText),
												followUps: undefined,
											}
										: m,
								),
							}));
						} else {
							set((state) => ({
								chatMessages: [
									...state.chatMessages,
									{
										id: crypto.randomUUID(),
										role: "assistant" as const,
										content: errorText,
										createdAt: new Date().toISOString(),
									},
								],
							}));
						}
					}
				}
			} catch {
				if (!signal.aborted) {
					const errorText = CHATBOT_PAGE_CONTENT.errorMessage;
					const asstId = get().activeStreamingMessageId;
					if (asstId) {
						set((state) => ({
							chatMessages: state.chatMessages.map((m) =>
								m.id === asstId
									? {
											...m,
											content: withErrorNote(m.content, errorText),
											followUps: undefined,
										}
									: m,
							),
						}));
					} else {
						set((state) => ({
							chatMessages: [
								...state.chatMessages,
								{
									id: crypto.randomUUID(),
									role: "assistant" as const,
									content: errorText,
									createdAt: new Date().toISOString(),
								},
							],
						}));
					}
				}
			} finally {
				// Fallback: name the thread even if the stream ended without a
				// `done` event, so a dropped stream doesn't lose the title.
				if (!signal.aborted && myStreamGen === streamGeneration) {
					doneTitleIfNeeded();
				}
				if (isNewConversation && !titleGenerated) {
					get().setTitleGeneratingThreadId(null);
				}
				if (streamAbortController?.signal === signal) {
					streamAbortController = null;
				}
				if (myStreamGen === streamGeneration) {
					set((state) => {
						const sid = streamingId;
						// If `suggestions` never arrived, settle stuck "loading" chips
						// to ready-empty so the Summarize action stays; clear if aborted.
						const settledFollowUps: ChatbotMessageFollowUps | undefined =
							signal.aborted ? undefined : { status: "ready", chips: [] };
						const cleared =
							sid !== null
								? state.chatMessages.map((m) =>
										m.id === sid && m.followUps?.status === "loading"
											? { ...m, followUps: settledFollowUps }
											: m,
									)
								: state.chatMessages;
						return {
							chatMessages: cleared,
							isChatLoading: false,
							streamingStatus: null,
							streamingStarted: false,
							thinkingSteps: [],
							thinkingComplete: false,
							activeStreamingMessageId: null,
						};
					});
				}
			}
		},

		openCompact: () => {
			void get().fetchThreads();
			set({ isCompactOpen: true });
		},

		closeCompact: (options?: { resetSession?: boolean }) => {
			const resetSession = options?.resetSession !== false;
			if (resetSession) {
				get().newConversation();
			}
			set({ isCompactOpen: false, isCompactHistoryOpen: false });
		},

		reset: () => {
			abortActiveStream();
			set(initialState);
		},
	};
});
