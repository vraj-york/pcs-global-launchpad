import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ChatbotComposer,
	ChatbotConversation,
	ChatbotEmployeeProactiveEmpty,
	ChatbotEmptyState,
	ChatbotSidebar,
	ChatbotTopBar,
} from "@/components";
import {
	CHATBOT_GREETING_VARIANTS,
	CHATBOT_MOCK_EMPLOYEE_PROFILE,
	CHATBOT_PROACTIVE_EMPLOYEE_DATA_SOURCE,
	CHATBOT_PROACTIVE_EMPTY_THREAD_SESSION_KEY,
	COACH_CLIENTS,
	ROUTES,
} from "@/const";
import { useChatbotProactiveEmployeeIdle, useUserRoles } from "@/hooks";
import { captureFeatureUsed } from "@/lib";
import { useChatbotStore } from "@/store";

function greetingTextForIndex(greetingIndex: number) {
	const h = new Date().getHours();
	const timeOfDay =
		h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
	return CHATBOT_GREETING_VARIANTS[greetingIndex].replace(
		"{timeOfDay}",
		timeOfDay,
	);
}

export function ChatbotPage() {
	const navigate = useNavigate();
	const [hasFocusedProactiveComposer, setHasFocusedProactiveComposer] =
		useState(false);

	const {
		chatMessages: messages,
		question,
		searchMode,
		role,
		clientId,
		isChatLoading: isLoading,
		isThreadLoading,
		streamingStarted,
		streamingStatus,
		thinkingSteps,
		thinkingComplete,
		activeStreamingMessageId,
		greetingIndex,
		threads,
		fetchThreads,
		fetchProactiveEmployeePayload,
		newConversation,
		selectThread,
		setRole,
		setClientId,
		setQuestion,
		setComposerMentions,
		composerMentions,
		setSearchMode,
		sendMessage,
		openCompact,
		activeThreadId,
		proactiveEmployeePayload,
		renameThread,
		togglePinThread,
		deleteThread,
	} = useChatbotStore();

	const {
		isSuperAdmin,
		isCorporationAdmin,
		isCompanyAdmin,
		ready: rolesReady,
	} = useUserRoles();

	const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

	useEffect(() => {
		try {
			const key = "ph_feature_used_ai_chat";
			if (
				typeof sessionStorage !== "undefined" &&
				sessionStorage.getItem(key)
			) {
				return;
			}
			sessionStorage.setItem(key, "1");
		} catch {
			return;
		}
		captureFeatureUsed({ feature_key: "ai_chat" });
	}, []);

	useEffect(() => {
		void fetchThreads();
	}, [fetchThreads]);

	// Persona follows the logged-in user's real Cognito group — never chosen.
	useEffect(() => {
		if (!rolesReady) return;
		if (isSuperAdmin) setRole("superadmin");
		else if (isCorporationAdmin) setRole("corporation_admin");
		else if (isCompanyAdmin) setRole("company_admin");
		else setRole("employee");
	}, [isSuperAdmin, isCorporationAdmin, isCompanyAdmin, rolesReady, setRole]);

	const greeting = useMemo(
		() => greetingTextForIndex(greetingIndex),
		[greetingIndex],
	);

	const handleNewConversation = () => {
		newConversation();
	};

	const handleThreadSelect = (thread: Parameters<typeof selectThread>[0]) => {
		void selectThread(thread);
	};

	const handleClose = () => {
		newConversation();
		const routerHistoryIndex = (window.history.state as { idx?: number } | null)
			?.idx;
		if (routerHistoryIndex && routerHistoryIndex > 0) {
			navigate(-1);
			return;
		}
		navigate(ROUTES.dashboard.root);
	};

	const handleExpand = () => {
		const routerHistoryIndex = (window.history.state as { idx?: number } | null)
			?.idx;
		if (routerHistoryIndex && routerHistoryIndex > 0) {
			navigate(-1);
		} else {
			navigate(ROUTES.dashboard.root);
		}
		openCompact();
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void sendMessage();
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			void sendMessage();
		}
	};

	const showEmptyState = messages.length === 0 && !isThreadLoading;

	const employeeProactiveEnabled = showEmptyState && role === "employee";

	const peerMentionsEnabled = role === "employee";

	/**
	 * Temporary plug-and-play switch.
	 * - "mock" => constants only
	 * - "api"  => fetch backend payload, fallback to constants on any failure
	 */
	const useApiProactivePayload =
		role === "employee" && CHATBOT_PROACTIVE_EMPLOYEE_DATA_SOURCE === "api";

	useEffect(() => {
		setHasFocusedProactiveComposer(false);
	}, [role, activeThreadId]);

	useEffect(() => {
		if (question.trim().length > 0) {
			setHasFocusedProactiveComposer(true);
		}
	}, [question]);

	useEffect(() => {
		void fetchProactiveEmployeePayload();
	}, [fetchProactiveEmployeePayload, useApiProactivePayload]);

	const proactivePhase = useChatbotProactiveEmployeeIdle({
		enabled: employeeProactiveEnabled,
		question,
		sessionKey: activeThreadId ?? CHATBOT_PROACTIVE_EMPTY_THREAD_SESSION_KEY,
		firstIdleMs: proactiveEmployeePayload?.nudge.firstIdleMs,
		secondIdleMs: proactiveEmployeePayload?.nudge.secondIdleMs,
		freezeProgression: hasFocusedProactiveComposer,
	});

	const proactiveDisplayName =
		proactiveEmployeePayload?.context.displayName ??
		CHATBOT_MOCK_EMPLOYEE_PROFILE.displayName;

	const proactiveStageData =
		proactiveEmployeePayload?.stages.find(
			(stage) => stage.phase === proactivePhase,
		) ?? undefined;

	const handleProactiveSuggestion = (query: string) => {
		void sendMessage(query);
	};

	const handleProactiveComposerFocus = () => {
		setHasFocusedProactiveComposer(true);
	};

	return (
		<div className="h-svh overflow-hidden bg-background">
			<ChatbotSidebar
				activeThreadId={activeThreadId}
				onNewConversation={handleNewConversation}
				onThreadSelect={handleThreadSelect}
			>
				<div className="flex h-full min-w-0 flex-col overflow-hidden bg-background">
					<ChatbotTopBar
						clientId={clientId}
						clientOptions={COACH_CLIENTS}
						showClientSelect={role === "coach"}
						isLoading={isLoading}
						onClientChange={setClientId}
						onClose={handleClose}
						onExpand={handleExpand}
						activeThread={activeThread}
						onRenameThread={renameThread}
						onTogglePinThread={togglePinThread}
						onDeleteThread={deleteThread}
					/>

					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
						{showEmptyState ? (
							employeeProactiveEnabled ? (
								<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
									<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pt-8 pb-6">
										<div className="mx-auto flex w-full max-w-5xl flex-col items-center">
											<ChatbotEmployeeProactiveEmpty
												phase={proactivePhase}
												displayName={proactiveDisplayName}
												stageData={proactiveStageData}
												onSuggestionSelect={handleProactiveSuggestion}
											/>
										</div>
									</div>
									<div className="flex shrink-0 justify-center px-8 pb-10">
										<ChatbotComposer
											question={question}
											searchMode={searchMode}
											isLoading={isLoading}
											mentionsEnabled={peerMentionsEnabled}
											composerMentions={composerMentions}
											onQuestionChange={setQuestion}
											onComposerMentionsChange={setComposerMentions}
											onSearchModeChange={setSearchMode}
											onSubmit={handleSubmit}
											onKeyDown={handleKeyDown}
											onComposerFocus={handleProactiveComposerFocus}
										/>
									</div>
								</div>
							) : (
								<div className="flex flex-1 items-center justify-center px-8 pt-8 pb-10">
									<div className="flex w-full max-w-5xl flex-col items-center gap-6">
										<ChatbotEmptyState greeting={greeting} />
										<div className="flex w-full justify-center">
											<ChatbotComposer
												question={question}
												searchMode={searchMode}
												isLoading={isLoading}
												mentionsEnabled={peerMentionsEnabled}
												composerMentions={composerMentions}
												onQuestionChange={setQuestion}
												onComposerMentionsChange={setComposerMentions}
												onSearchModeChange={setSearchMode}
												onSubmit={handleSubmit}
												onKeyDown={handleKeyDown}
											/>
										</div>
									</div>
								</div>
							)
						) : (
							<>
								<ChatbotConversation
									messages={messages}
									isChatLoading={isLoading}
									isThreadLoading={isThreadLoading}
									streamingStarted={streamingStarted}
									streamingStatus={streamingStatus}
									thinkingSteps={thinkingSteps}
									thinkingComplete={thinkingComplete}
									activeStreamingMessageId={activeStreamingMessageId}
									onFollowUpSelect={(query) => void sendMessage(query)}
								/>
								<div className="px-space-xl pt-2 pb-10">
									<div className="mx-auto w-full max-w-3xl">
										<ChatbotComposer
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
								</div>
							</>
						)}
					</div>
				</div>
			</ChatbotSidebar>
		</div>
	);
}
