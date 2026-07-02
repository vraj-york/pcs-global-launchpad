import { Bot, Copy, ThumbsDown, ThumbsUp, User } from "lucide-react";
import {
	ChatbotFollowUpChips,
	ChatbotThinkingTimeline,
	MarkdownRenderer,
	MessageTimestampLabel,
} from "@/components";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CHATBOT_PAGE_CONTENT } from "@/const";
import { useStickToBottom } from "@/hooks";
import { selectLastAssistantMessageId, useChatbotStore } from "@/store";
import type {
	ChatbotConversationProps,
	ChatbotMessage,
	ChatbotThinkingStep,
} from "@/types";
import { copyClipboard } from "@/utils";

function ChatbotAssistantActions({ content }: { content: string }) {
	return (
		<div className="flex items-center gap-2 text-brand-secondary">
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				icon={Copy}
				aria-label={CHATBOT_PAGE_CONTENT.copyButtonLabel}
				className="size-5 rounded-sm p-1 text-brand-secondary hover:bg-muted hover:text-text-foreground"
				onClick={() =>
					void copyClipboard(
						content,
						CHATBOT_PAGE_CONTENT.copySuccessMessage,
						CHATBOT_PAGE_CONTENT.copyErrorMessage,
					)
				}
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				disabled
				icon={ThumbsUp}
				aria-label={CHATBOT_PAGE_CONTENT.positiveFeedbackButtonLabel}
				className="size-5 rounded-sm p-1 text-brand-secondary"
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				disabled
				icon={ThumbsDown}
				aria-label={CHATBOT_PAGE_CONTENT.negativeFeedbackButtonLabel}
				className="size-5 rounded-sm p-1 text-brand-secondary"
			/>
		</div>
	);
}

function UserMessage({ message }: { message: ChatbotMessage }) {
	return (
		<div className="ml-auto flex w-full max-w-lg flex-col items-end gap-2">
			<div className="flex items-start gap-4">
				<div className="w-full rounded-t-xl rounded-bl-xl rounded-br-sm bg-primary px-4 py-4 text-primary-foreground shadow-sm">
					<MarkdownRenderer content={message.content} />
				</div>
				<Avatar size="lg" className="mt-0.5">
					<AvatarFallback className="bg-primary text-primary-foreground">
						<User className="size-4" />
					</AvatarFallback>
				</Avatar>
			</div>
			{/* mr-14 = avatar (size-10 = 2.5rem) + gap-4 (1rem) = 3.5rem, aligns under the bubble */}
			<div className="mr-14 flex items-center gap-4 text-mini font-medium text-brand-secondary">
				<MessageTimestampLabel
					createdAt={message.createdAt}
					className="text-mini text-right"
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					icon={Copy}
					aria-label={CHATBOT_PAGE_CONTENT.copyButtonLabel}
					className="size-5 rounded-sm p-1 text-brand-secondary hover:bg-muted hover:text-text-foreground"
					onClick={() =>
						void copyClipboard(
							message.content,
							CHATBOT_PAGE_CONTENT.copySuccessMessage,
							CHATBOT_PAGE_CONTENT.copyErrorMessage,
						)
					}
				/>
			</div>
		</div>
	);
}

function AssistantMessage({
	message,
	isAnimating,
	onFollowUpSelect,
	showFollowUps,
	thinkingSteps,
	isProcessing,
}: {
	message: ChatbotMessage;
	isAnimating: boolean;
	onFollowUpSelect?: (query: string) => void;
	showFollowUps: boolean;
	thinkingSteps: ChatbotThinkingStep[];
	isProcessing: boolean;
}) {
	return (
		<div className="flex items-start gap-4">
			<Avatar size="lg" className="mt-0.5">
				<AvatarFallback className="bg-background text-brand-primary">
					<Bot className="size-4" />
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1 space-y-2">
				{thinkingSteps.length > 0 ? (
					<ChatbotThinkingTimeline
						steps={thinkingSteps}
						isProcessing={isProcessing}
					/>
				) : null}
				<MarkdownRenderer content={message.content} isAnimating={isAnimating} />
				{message.followUps && onFollowUpSelect && showFollowUps ? (
					<div className="mt-2 border-t border-border-muted pt-3">
						<ChatbotFollowUpChips
							followUps={message.followUps}
							onSelectQuery={onFollowUpSelect}
							variant="default"
						/>
					</div>
				) : null}
				<div className="flex items-center gap-4 text-mini font-medium text-brand-secondary">
					<MessageTimestampLabel
						createdAt={message.createdAt}
						className="text-mini"
					/>
					<ChatbotAssistantActions content={message.content} />
				</div>
			</div>
		</div>
	);
}

export function ChatbotConversation({
	messages,
	isChatLoading,
	isThreadLoading,
	streamingStarted,
	streamingStatus,
	thinkingSteps,
	thinkingComplete,
	activeStreamingMessageId,
	onFollowUpSelect,
}: ChatbotConversationProps) {
	const lastAssistantMessageId = useChatbotStore(selectLastAssistantMessageId);
	const { containerRef, handleScroll } = useStickToBottom([
		messages,
		isChatLoading,
		thinkingSteps,
	]);

	// While switching threads, messages are cleared in the store — show a single
	// full-area placeholder instead of stacking a bar above the old thread.
	if (isThreadLoading) {
		return (
			<div
				className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-8 py-12"
				role="status"
				aria-live="polite"
			>
				<div className="flex w-full max-w-md flex-col gap-3">
					<div className="h-3 w-3/4 animate-pulse rounded-md bg-muted" />
					<div className="h-3 w-full animate-pulse rounded-md bg-muted" />
					<div className="h-3 w-5/6 animate-pulse rounded-md bg-muted" />
				</div>
				<p className="text-small text-text-secondary">
					{CHATBOT_PAGE_CONTENT.threadLoadingMessage}
				</p>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
			className="flex-1 overflow-y-auto px-8 py-8"
		>
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
				{messages.map((message) => {
					const isAnimating =
						isChatLoading &&
						!isThreadLoading &&
						message.id === activeStreamingMessageId;

					if (message.role === "user") {
						return <UserMessage key={message.id} message={message} />;
					}

					return (
						<AssistantMessage
							key={message.id}
							message={message}
							isAnimating={isAnimating}
							onFollowUpSelect={onFollowUpSelect}
							showFollowUps={message.id === lastAssistantMessageId}
							thinkingSteps={message.thinkingSteps ?? []}
							isProcessing={false}
						/>
					);
				})}

				{isChatLoading && !streamingStarted && (
					<div className="flex items-start gap-4">
						<Avatar size="lg" className="mt-0.5">
							<AvatarFallback className="bg-background text-brand-primary">
								<Bot className="size-4" />
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
		</div>
	);
}
