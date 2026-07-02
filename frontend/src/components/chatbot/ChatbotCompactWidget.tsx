import {
	ArrowUp,
	Bot,
	Copy,
	History,
	Maximize2,
	Mic,
	Paperclip,
	Pin,
	Plus,
	Search,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
	X,
	Zap,
} from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ChatbotEmptyState,
	ChatbotFollowUpChips,
	ChatbotMentionTextarea,
	ChatbotThinkingTimeline,
	ChatbotThreadList,
	MarkdownRenderer,
	MessageTimestampLabel,
} from "@/components";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
	CHATBOT_ASSESSMENT_TRIGGER_CONTENT,
	CHATBOT_BOT_NAME,
	CHATBOT_COMPACT_CONTENT,
	CHATBOT_GREETING_VARIANTS,
	CHATBOT_PAGE_CONTENT,
	CHATBOT_THREAD_CONTENT,
	FORM_PLACEHOLDERS,
	ROUTES,
} from "@/const";
import { useStickToBottom } from "@/hooks";
import { cn } from "@/lib/utils";
import { selectLastAssistantMessageId, useChatbotStore } from "@/store";
import type {
	ChatbotCompactComposerProps,
	ChatbotMessage,
	ChatbotThinkingStep,
	ChatbotThread,
} from "@/types";
import { copyClipboard } from "@/utils";

function CompactConversationSkeleton() {
	return (
		<div className="flex w-full max-w-56 flex-col gap-2">
			<Skeleton className="h-2.5 w-3/4" />
			<Skeleton className="h-2.5 w-full" />
			<Skeleton className="h-2.5 w-2/3" />
		</div>
	);
}

function greetingTextForIndex(greetingIndex: number) {
	const h = new Date().getHours();
	const timeOfDay =
		h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
	return CHATBOT_GREETING_VARIANTS[greetingIndex].replace(
		"{timeOfDay}",
		timeOfDay,
	);
}

function CompactComposer({
	question,
	searchMode,
	isLoading,
	mentionsEnabled,
	composerMentions,
	onQuestionChange,
	onComposerMentionsChange,
	onSearchModeChange,
	onSubmit,
	onKeyDown,
}: ChatbotCompactComposerProps) {
	const modeButtonClass = (isActive: boolean) =>
		cn(
			"inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-small font-semibold transition-colors",
			isActive
				? "bg-background text-link shadow-xs"
				: "text-text-secondary hover:text-text-foreground",
		);

	return (
		<form
			onSubmit={onSubmit}
			className="flex flex-col gap-3 border-t border-border-muted bg-background px-3 pt-3 pb-3"
		>
			<ChatbotMentionTextarea
				value={question}
				onChange={onQuestionChange}
				onKeyDown={onKeyDown}
				disabled={isLoading}
				mentionsEnabled={mentionsEnabled}
				selectedMentions={composerMentions}
				onMentionsChange={onComposerMentionsChange}
				rows={2}
				className="min-h-10 text-small leading-small"
				ariaLabel={FORM_PLACEHOLDERS.askAnything}
				placeholder={FORM_PLACEHOLDERS.askAnything}
			/>
			<div className="flex items-center justify-between">
				<div className="flex h-8 items-center gap-0.5 rounded-lg bg-muted p-0.5">
					<button
						type="button"
						onClick={() => onSearchModeChange("quick")}
						className={`${modeButtonClass(searchMode === "quick")} cursor-pointer`}
						aria-pressed={searchMode === "quick"}
					>
						<Zap className="size-3" />
						<span>{CHATBOT_PAGE_CONTENT.quickMode}</span>
					</button>
					<button
						type="button"
						onClick={() => onSearchModeChange("deep_dive")}
						className={`${modeButtonClass(searchMode === "deep_dive")} cursor-pointer`}
						aria-pressed={searchMode === "deep_dive"}
					>
						<Sparkles className="size-3" />
						<span>{CHATBOT_PAGE_CONTENT.deepDiveMode}</span>
					</button>
				</div>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						disabled
						icon={Paperclip}
						className="size-7 rounded-md text-brand-secondary"
						aria-label={CHATBOT_PAGE_CONTENT.attachmentButtonLabel}
						title={CHATBOT_PAGE_CONTENT.attachmentButtonLabel}
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						disabled
						icon={Mic}
						className="size-7 rounded-md text-brand-secondary"
						aria-label={CHATBOT_PAGE_CONTENT.voiceInputButtonLabel}
						title={CHATBOT_PAGE_CONTENT.voiceInputButtonLabel}
					/>
					<Button
						type="submit"
						size="icon-xs"
						disabled={!question.trim()}
						isLoading={isLoading}
						icon={ArrowUp}
						className="size-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
						aria-label={CHATBOT_PAGE_CONTENT.sendButton}
					/>
				</div>
			</div>
		</form>
	);
}

function MessageActions({ content }: { content: string }) {
	return (
		<div className="flex items-center gap-1.5">
			<button
				type="button"
				onClick={() =>
					void copyClipboard(
						content,
						CHATBOT_PAGE_CONTENT.copySuccessMessage,
						CHATBOT_PAGE_CONTENT.copyErrorMessage,
					)
				}
				className="inline-flex size-5 items-center justify-center rounded text-brand-secondary transition-colors hover:bg-muted hover:text-text-foreground cursor-pointer"
				aria-label={CHATBOT_PAGE_CONTENT.copyButtonLabel}
			>
				<Copy className="size-3.5" />
			</button>
			<button
				type="button"
				disabled
				className="inline-flex size-5 items-center justify-center rounded text-brand-secondary opacity-50 cursor-not-allowed"
				aria-label={CHATBOT_PAGE_CONTENT.positiveFeedbackButtonLabel}
			>
				<ThumbsUp className="size-3.5" />
			</button>
			<button
				type="button"
				disabled
				className="inline-flex size-5 items-center justify-center rounded text-brand-secondary opacity-50 cursor-not-allowed"
				aria-label={CHATBOT_PAGE_CONTENT.negativeFeedbackButtonLabel}
			>
				<ThumbsDown className="size-3.5" />
			</button>
		</div>
	);
}

type CompactMessageProps = {
	message: ChatbotMessage;
	isAnimating: boolean;
	onFollowUpSelect?: (query: string) => void;
	showFollowUps: boolean;
	thinkingSteps: ChatbotThinkingStep[];
	isProcessing: boolean;
};

function CompactMessage({
	message,
	isAnimating,
	onFollowUpSelect,
	showFollowUps,
	thinkingSteps,
	isProcessing,
}: CompactMessageProps) {
	if (message.role === "user") {
		return (
			<div className="ml-auto flex max-w-xs flex-col items-end gap-1">
				<div className="rounded-t-xl rounded-bl-xl rounded-br-sm bg-primary px-3 py-2 text-small leading-small text-primary-foreground shadow-sm">
					<MarkdownRenderer content={message.content} />
				</div>
				<div className="mt-1 flex items-center gap-2">
					<MessageTimestampLabel
						createdAt={message.createdAt}
						className="text-mini text-right"
					/>
					<button
						type="button"
						onClick={() =>
							void copyClipboard(
								message.content,
								CHATBOT_PAGE_CONTENT.copySuccessMessage,
								CHATBOT_PAGE_CONTENT.copyErrorMessage,
							)
						}
						className="inline-flex size-5 shrink-0 items-center justify-center rounded text-brand-secondary transition-colors hover:bg-muted hover:text-text-foreground cursor-pointer"
						aria-label={CHATBOT_PAGE_CONTENT.copyButtonLabel}
					>
						<Copy className="size-3.5" />
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-start gap-2">
			<Avatar size="sm" className="mt-0.5 shrink-0">
				<AvatarFallback className="bg-muted text-brand-primary">
					<Bot className="size-3" />
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				{thinkingSteps.length > 0 ? (
					<div className="mb-2">
						<ChatbotThinkingTimeline
							steps={thinkingSteps}
							isProcessing={isProcessing}
						/>
					</div>
				) : null}
				<div className="rounded-lg text-small leading-small text-text-foreground">
					<MarkdownRenderer
						content={message.content}
						isAnimating={isAnimating}
					/>
				</div>
				{message.followUps && onFollowUpSelect && showFollowUps ? (
					<div className="mt-2 border-t border-border-muted pt-3">
						<ChatbotFollowUpChips
							followUps={message.followUps}
							onSelectQuery={onFollowUpSelect}
							variant="compact"
						/>
					</div>
				) : null}
				<div className="mt-2 flex items-center gap-2">
					<MessageTimestampLabel
						createdAt={message.createdAt}
						className="text-mini"
					/>
					<MessageActions content={message.content} />
				</div>
			</div>
		</div>
	);
}

export function ChatbotCompactWidget() {
	const navigate = useNavigate();
	const {
		chatMessages: messages,
		question,
		searchMode,
		isChatLoading: isLoading,
		isThreadLoading,
		streamingStarted,
		streamingStatus,
		thinkingSteps,
		thinkingComplete,
		activeStreamingMessageId,
		isCompactHistoryOpen,
		fetchThreads,
		closeCompact,
		toggleCompactHistory,
		newConversation,
		selectThread,
		sendMessage,
		setQuestion,
		setComposerMentions,
		composerMentions,
		role,
		setSearchMode,
		threads,
		threadsLoading,
		titleRevealThreadId,
		titleRevealToken,
		titleGeneratingThreadId,
		renameThread,
		togglePinThread,
		deleteThread,
		activeThreadId,
		greetingIndex,
		assessmentTriggerStatus,
	} = useChatbotStore();

	const greeting = useMemo(
		() => greetingTextForIndex(greetingIndex),
		[greetingIndex],
	);

	const [historySearchQuery, setHistorySearchQuery] = useState("");
	const [activeHistoryTab, setActiveHistoryTab] = useState<"recent" | "pinned">(
		"recent",
	);

	const { pinnedThreads, recentThreads } = useMemo(() => {
		const normalizedQuery = historySearchQuery.trim().toLowerCase();
		const filtered = normalizedQuery
			? threads.filter((thread) =>
					thread.title.toLowerCase().includes(normalizedQuery),
				)
			: threads;
		return {
			pinnedThreads: filtered.filter((thread) => thread.pinned),
			recentThreads: filtered.filter((thread) => !thread.pinned),
		};
	}, [threads, historySearchQuery]);

	const streamingIdRef = useRef<string | null>(null);
	streamingIdRef.current = activeStreamingMessageId;
	const lastAssistantMessageId = useChatbotStore(selectLastAssistantMessageId);
	const { containerRef, handleScroll } = useStickToBottom([
		messages,
		isLoading,
		thinkingSteps,
	]);

	useEffect(() => {
		void fetchThreads();
	}, [fetchThreads]);

	const handleOpenFull = () => {
		navigate(ROUTES.chatbot.root);
		closeCompact({ resetSession: false });
	};

	const handleNewConversation = () => {
		newConversation();
	};

	const handleSelectThread = (thread: ChatbotThread) => {
		void selectThread(thread);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void sendMessage();
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			void sendMessage();
		}
	};

	const peerMentionsEnabled = role === "employee";

	const isThreadsInitialLoading = threadsLoading && threads.length === 0;
	const activeHistoryThreads =
		activeHistoryTab === "pinned" ? pinnedThreads : recentThreads;
	const historyEmptyText =
		historySearchQuery.trim().length > 0
			? CHATBOT_THREAD_CONTENT.noChatsFound
			: activeHistoryTab === "pinned"
				? CHATBOT_THREAD_CONTENT.noPinnedChats
				: CHATBOT_THREAD_CONTENT.emptyState;

	const historyTabClass = (isActive: boolean) =>
		cn(
			"inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-small font-semibold transition-colors",
			isActive
				? "bg-background text-brand-primary shadow-xs"
				: "text-text-secondary hover:text-text-foreground",
		);

	return (
		<div
			role="dialog"
			aria-label={CHATBOT_BOT_NAME}
			className="fixed right-6 bottom-6 z-50 flex h-128 w-112 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
		>
			<div className="flex h-16 shrink-0 items-center justify-between bg-info px-4">
				<div className="flex items-center gap-2">
					<Bot
						className="size-7 shrink-0 text-primary-foreground"
						strokeWidth={2.25}
					/>
					<div className="flex min-w-0 flex-col gap-1">
						<span className="truncate text-heading-4 font-semibold leading-heading-4 text-primary-foreground">
							{CHATBOT_BOT_NAME}
						</span>
						<div className="flex items-center gap-1 text-primary-foreground/80">
							<span className="truncate text-mini font-medium leading-mini">
								{CHATBOT_COMPACT_CONTENT.headerPersonName}
							</span>
							<span
								aria-hidden
								className="size-1 shrink-0 rounded-full bg-current"
							/>
							<span className="truncate text-mini font-medium leading-mini">
								{CHATBOT_COMPACT_CONTENT.headerPersonRole}
							</span>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={toggleCompactHistory}
						className={cn(
							"inline-flex size-8 items-center justify-center rounded-lg text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground cursor-pointer",
							isCompactHistoryOpen && "bg-primary-foreground/15",
						)}
						aria-label={CHATBOT_COMPACT_CONTENT.toggleHistoryLabel}
						aria-pressed={isCompactHistoryOpen}
					>
						<History className="size-4" />
					</button>
					<button
						type="button"
						onClick={handleOpenFull}
						className="inline-flex size-8 items-center justify-center rounded-lg text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground cursor-pointer"
						aria-label={CHATBOT_COMPACT_CONTENT.expandButtonLabel}
					>
						<Maximize2 className="size-4" />
					</button>
					<button
						type="button"
						onClick={() => closeCompact()}
						className="inline-flex size-8 items-center justify-center rounded-lg text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground cursor-pointer"
						aria-label={CHATBOT_COMPACT_CONTENT.closeButtonLabel}
					>
						<X className="size-4" />
					</button>
				</div>
			</div>

			<div className="relative min-h-0 flex-1 overflow-hidden bg-background">
				<div
					className={cn(
						"flex h-full min-h-0 flex-col transition-transform duration-300 ease-out",
						isCompactHistoryOpen && "pointer-events-none translate-x-full",
					)}
					aria-hidden={isCompactHistoryOpen}
				>
					<div
						ref={containerRef}
						onScroll={handleScroll}
						className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
					>
						{isThreadLoading ? (
							<div
								className="flex min-h-full flex-col items-center justify-center gap-3 py-8"
								role="status"
								aria-live="polite"
							>
								<CompactConversationSkeleton />
								<p className="text-small text-text-secondary">
									{CHATBOT_PAGE_CONTENT.threadLoadingMessage}
								</p>
							</div>
						) : messages.length === 0 ? (
							<div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center px-2 py-4">
								{assessmentTriggerStatus === "loading" ? (
									<div
										className="flex flex-col items-center gap-3 py-8 text-center"
										role="status"
										aria-live="polite"
									>
										<CompactConversationSkeleton />
										<p className="text-small text-text-secondary">
											{CHATBOT_ASSESSMENT_TRIGGER_CONTENT.preparingSession}
										</p>
									</div>
								) : (
									<ChatbotEmptyState greeting={greeting} variant="compact" />
								)}
							</div>
						) : (
							<div className="flex flex-col gap-4">
								{messages.map((message) => {
									const isAnimating =
										isLoading &&
										!isThreadLoading &&
										message.id === streamingIdRef.current;
									return (
										<CompactMessage
											key={message.id}
											message={message}
											isAnimating={isAnimating}
											onFollowUpSelect={(query) => void sendMessage(query)}
											showFollowUps={message.id === lastAssistantMessageId}
											thinkingSteps={message.thinkingSteps ?? []}
											isProcessing={false}
										/>
									);
								})}
								{isLoading && !isThreadLoading && !streamingStarted && (
									<div className="flex items-start gap-2">
										<Avatar size="sm" className="mt-0.5 shrink-0">
											<AvatarFallback className="bg-muted text-brand-primary">
												<Bot className="size-3" />
											</AvatarFallback>
										</Avatar>
										{thinkingSteps.length > 0 ? (
											<div className="min-w-0 flex-1">
												<ChatbotThinkingTimeline
													steps={thinkingSteps}
													isProcessing={!thinkingComplete}
													defaultExpanded
												/>
											</div>
										) : (
											<span className="animate-pulse text-small text-brand-secondary">
												{streamingStatus ?? CHATBOT_PAGE_CONTENT.loadingMessage}
											</span>
										)}
									</div>
								)}
							</div>
						)}
					</div>
					<CompactComposer
						question={question}
						searchMode={searchMode}
						isLoading={isLoading || isThreadLoading}
						mentionsEnabled={peerMentionsEnabled}
						composerMentions={composerMentions}
						onQuestionChange={setQuestion}
						onComposerMentionsChange={setComposerMentions}
						onSearchModeChange={setSearchMode}
						onSubmit={handleSubmit}
						onKeyDown={handleKeyDown}
					/>
				</div>

				<div
					className={cn(
						"absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden border-border-muted bg-background transition-transform duration-300 ease-out",
						isCompactHistoryOpen
							? "translate-x-0"
							: "-translate-x-full pointer-events-none",
					)}
					aria-hidden={!isCompactHistoryOpen}
				>
					<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
						<Button
							type="button"
							onClick={handleNewConversation}
							variant="secondary"
							icon={Plus}
							className="w-full shrink-0 justify-center bg-info-bg text-link hover:bg-info-bg/70"
						>
							{CHATBOT_COMPACT_CONTENT.newConversationWithPlus}
						</Button>

						<InputGroup className="h-9 w-full shrink-0 bg-background">
							<InputGroupAddon align="inline-start">
								<Search className="size-4 text-muted-foreground" />
							</InputGroupAddon>
							<InputGroupInput
								type="search"
								placeholder={FORM_PLACEHOLDERS.searchChats}
								value={historySearchQuery}
								onChange={(event) => setHistorySearchQuery(event.target.value)}
								aria-label={CHATBOT_PAGE_CONTENT.searchChatsAriaLabel}
							/>
						</InputGroup>

						<div className="flex shrink-0 items-center gap-1 rounded-xl bg-card-foreground p-1">
							<button
								type="button"
								onClick={() => setActiveHistoryTab("recent")}
								aria-pressed={activeHistoryTab === "recent"}
								className={historyTabClass(activeHistoryTab === "recent")}
							>
								<History className="size-4" />
								<span>{CHATBOT_THREAD_CONTENT.recentChats}</span>
							</button>
							<button
								type="button"
								onClick={() => setActiveHistoryTab("pinned")}
								aria-pressed={activeHistoryTab === "pinned"}
								className={historyTabClass(activeHistoryTab === "pinned")}
							>
								<Pin className="size-4" />
								<span>{CHATBOT_THREAD_CONTENT.pinnedChats}</span>
							</button>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto">
							{activeHistoryThreads.length > 0 || isThreadsInitialLoading ? (
								<ChatbotThreadList
									threads={activeHistoryThreads}
									activeThreadId={activeThreadId}
									isLoading={threadsLoading}
									titleRevealThreadId={titleRevealThreadId}
									titleRevealToken={titleRevealToken}
									titleGeneratingThreadId={titleGeneratingThreadId}
									onThreadSelect={handleSelectThread}
									onRenameThread={renameThread}
									onTogglePinThread={togglePinThread}
									onDeleteThread={deleteThread}
									uiVariant="compact"
								/>
							) : (
								<p className="px-1 py-3 text-small font-medium text-brand-secondary">
									{historyEmptyText}
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
