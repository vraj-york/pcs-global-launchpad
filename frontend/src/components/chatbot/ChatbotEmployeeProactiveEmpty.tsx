import {
	Bot,
	Compass,
	Headphones,
	HeartPulse,
	LayoutDashboard,
	Lightbulb,
	Sparkles,
	TrendingUp,
	UserCog,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	CHATBOT_PROACTIVE_CARD_KEYS,
	CHATBOT_PROACTIVE_CARD_PRESS_DURATION_MS,
	CHATBOT_PROACTIVE_EMPLOYEE_CONTENT,
	proactiveEmployeeCardAriaLabel,
} from "@/const";
import { cn } from "@/lib/utils";
import type { ChatbotEmployeeProactiveEmptyProps } from "@/types";

const proactivePhaseEnterClass =
	"animate-in fade-in-0 slide-in-from-bottom-2 duration-500 motion-reduce:animate-none";
const proactiveWaitingHintPillClass =
	"inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-border-muted bg-muted/20 px-3 py-1.5 motion-safe:animate-pulse";
const proactiveListeningAccentClass =
	"mx-auto h-0.5 w-12 shrink-0 rounded-full bg-primary/30 motion-safe:animate-pulse";
const proactiveInteractivePressBaseClass =
	"transition-all duration-150 ease-out active:scale-95 active:opacity-90 motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-100";
const proactiveInteractivePressedRingClass =
	"scale-95 ring-2 ring-ring ring-offset-2 ring-offset-background";

function WaitingDots() {
	return (
		<div className="flex items-center gap-1" aria-hidden>
			<span className="size-1 animate-pulse rounded-full bg-brand-secondary/50" />
			<span className="size-1 animate-pulse rounded-full bg-brand-secondary/70 delay-150" />
			<span className="size-1 animate-pulse rounded-full bg-brand-secondary delay-300" />
		</div>
	);
}

function ProactiveWaitingHintPill({ message }: { message: string }) {
	return (
		<div
			className={proactiveWaitingHintPillClass}
			role="status"
			aria-live="polite"
		>
			<WaitingDots />
			<span className="text-mini font-normal text-muted-foreground">
				{message}
			</span>
		</div>
	);
}

function ProactiveListeningAccent() {
	return <div className={proactiveListeningAccentClass} aria-hidden />;
}

function cnProactiveInteractive(
	isPressed: boolean,
	...classes: Parameters<typeof cn>
) {
	return cn(
		proactiveInteractivePressBaseClass,
		isPressed && proactiveInteractivePressedRingClass,
		...classes,
	);
}

export function ChatbotEmployeeProactiveEmpty({
	phase,
	displayName,
	onSuggestionSelect,
	stageData,
}: ChatbotEmployeeProactiveEmptyProps) {
	const C = CHATBOT_PROACTIVE_EMPLOYEE_CONTENT;
	const [pressedCardKey, setPressedCardKey] = useState<string | null>(null);
	const pressClearRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (pressClearRef.current) window.clearTimeout(pressClearRef.current);
		};
	}, []);

	const handleCardPress = (cardKey: string, submit: () => void) => {
		if (pressClearRef.current) window.clearTimeout(pressClearRef.current);
		setPressedCardKey(cardKey);
		submit();
		pressClearRef.current = window.setTimeout(() => {
			setPressedCardKey(null);
			pressClearRef.current = null;
		}, CHATBOT_PROACTIVE_CARD_PRESS_DURATION_MS);
	};

	const stageCards = stageData?.cards ?? [];
	const stageChoices = stageData?.bispyChoices ?? [];
	const stageMessages = stageData?.assistantMessages ?? [];

	const phase0CardTeam = stageCards[0];
	const phase0CardExplore = stageCards[1];
	const phase0ChoicePlatform = stageChoices[0];
	const phase0ChoiceAssessment = stageChoices[1];
	const phase0ChoiceStress = stageChoices[2];

	const phase1Message = stageMessages[0];
	const phase1MessageOptionPrimary = phase1Message?.options[0];
	const phase1MessageOptionSecondary = phase1Message?.options[1];

	const phase2MessagePrimary = stageMessages[0];
	const phase2MessageSecondary = stageMessages[1];
	const phase2MessageSecondaryOptionCoach = phase2MessageSecondary?.options[0];
	const phase2MessageSecondaryOptionSupport =
		phase2MessageSecondary?.options[1];

	const phase1Line1 =
		phase1Message?.lines[0] ?? C.proactiveGreetingLine(displayName);
	const phase1Line2 = phase1Message?.lines[1] ?? C.proactiveGreetingSubline;
	const phase2Line1 =
		phase2MessagePrimary?.lines[0] ?? C.proactiveGreetingLine(displayName);
	const phase2Line2 =
		phase2MessagePrimary?.lines[1] ?? C.proactiveGreetingSubline;

	if (phase === 0) {
		return (
			<div
				className={cn(
					"flex w-full max-w-5xl flex-col items-center gap-6 text-center",
					proactivePhaseEnterClass,
				)}
			>
				<ProactiveListeningAccent />
				<div className="flex w-full flex-col gap-2">
					<h1 className="text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-balance text-text-foreground">
						{stageData?.title ?? C.welcomeTitle(displayName)}
					</h1>
					<p className="text-regular font-medium leading-regular text-text-secondary">
						{stageData?.subtitle ?? C.welcomeSubtitle}
					</p>
				</div>

				<div className="flex w-full flex-col items-stretch justify-center gap-4 lg:flex-row lg:items-start">
					<div className="flex w-full flex-col gap-4 lg:max-w-sm">
						<button
							type="button"
							tabIndex={0}
							onClick={() =>
								handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p0Team, () =>
									onSuggestionSelect(
										phase0CardTeam?.submit ?? C.cardTeamDynamicsQuery,
									),
								)
							}
							className={cnProactiveInteractive(
								pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p0Team,
								"flex flex-col gap-1.5 rounded-xl border border-primary bg-background p-5 text-left shadow-sm",
								"hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
							)}
							aria-label={proactiveEmployeeCardAriaLabel(
								phase0CardTeam?.label ?? C.cardTeamDynamicsTitle,
								phase0CardTeam?.description ?? C.cardTeamDynamicsSubtitle,
							)}
						>
							<div className="flex items-center gap-2">
								<TrendingUp
									className="size-5 shrink-0 text-primary"
									aria-hidden
								/>
								<span className="text-regular font-semibold leading-regular text-text-foreground">
									{phase0CardTeam?.label ?? C.cardTeamDynamicsTitle}
								</span>
							</div>
							<p className="text-left text-small font-normal leading-small text-muted-foreground">
								{phase0CardTeam?.description ?? C.cardTeamDynamicsSubtitle}
							</p>
						</button>

						<button
							type="button"
							tabIndex={0}
							onClick={() =>
								handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p0Explore, () =>
									onSuggestionSelect(
										phase0CardExplore?.submit ?? C.cardExploreQuery,
									),
								)
							}
							className={cnProactiveInteractive(
								pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p0Explore,
								"flex flex-col gap-1.5 rounded-xl border border-primary bg-background p-5 text-left shadow-sm",
								"hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
							)}
							aria-label={proactiveEmployeeCardAriaLabel(
								phase0CardExplore?.label ?? C.cardExploreTitle,
								phase0CardExplore?.description ?? C.cardExploreSubtitle,
							)}
						>
							<div className="flex items-center gap-2">
								<Compass className="size-5 shrink-0 text-primary" aria-hidden />
								<span className="text-regular font-semibold leading-regular text-text-foreground">
									{phase0CardExplore?.label ?? C.cardExploreTitle}
								</span>
							</div>
							<p className="text-left text-small font-normal leading-small text-muted-foreground">
								{phase0CardExplore?.description ?? C.cardExploreSubtitle}
							</p>
						</button>
					</div>

					<div className="flex w-full flex-col gap-3 rounded-xl border border-primary bg-info-bg p-5 lg:max-w-sm">
						<div className="flex items-center gap-2">
							<Bot className="size-5 shrink-0 text-primary" aria-hidden />
							<span className="text-mini font-medium uppercase tracking-wide text-muted-foreground">
								{C.bispysChoiceLabel}
							</span>
						</div>
						<div className="flex flex-col gap-3">
							<button
								type="button"
								tabIndex={0}
								onClick={() =>
									handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p0Platform, () =>
										onSuggestionSelect(
											phase0ChoicePlatform?.submit ?? C.choicePlatformQuery,
										),
									)
								}
								className={cnProactiveInteractive(
									pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p0Platform,
									"flex h-12 items-center gap-1.5 rounded-full bg-background pl-2.5 pr-3.5 text-left",
									"hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
								)}
								aria-label={phase0ChoicePlatform?.label ?? C.choicePlatform}
							>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-bg text-success">
									<LayoutDashboard className="size-3.5" aria-hidden />
								</span>
								<span className="text-small font-medium leading-small text-text-foreground">
									{phase0ChoicePlatform?.label ?? C.choicePlatform}
								</span>
							</button>
							<button
								type="button"
								tabIndex={0}
								onClick={() =>
									handleCardPress(
										CHATBOT_PROACTIVE_CARD_KEYS.p0Assessment,
										() =>
											onSuggestionSelect(
												phase0ChoiceAssessment?.submit ??
													C.choiceAssessmentQuery,
											),
									)
								}
								className={cnProactiveInteractive(
									pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p0Assessment,
									"flex h-12 w-full items-center gap-1.5 rounded-full bg-background pl-2.5 pr-3.5 text-left",
									"hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
								)}
								aria-label={phase0ChoiceAssessment?.label ?? C.choiceAssessment}
							>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info-bg text-primary">
									<Sparkles className="size-3.5" aria-hidden />
								</span>
								<span className="text-small font-medium leading-small text-text-foreground">
									{phase0ChoiceAssessment?.label ?? C.choiceAssessment}
								</span>
							</button>
							<button
								type="button"
								tabIndex={0}
								onClick={() =>
									handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p0Stress, () =>
										onSuggestionSelect(
											phase0ChoiceStress?.submit ?? C.choiceStressQuery,
										),
									)
								}
								className={cnProactiveInteractive(
									pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p0Stress,
									"flex h-12 w-full items-center gap-1.5 rounded-full bg-background pl-2.5 pr-3.5 text-left",
									"hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
								)}
								aria-label={phase0ChoiceStress?.label ?? C.choiceStress}
							>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-error-bg text-destructive">
									<HeartPulse className="size-3.5" aria-hidden />
								</span>
								<span className="text-small font-medium leading-small text-text-foreground">
									{phase0ChoiceStress?.label ?? C.choiceStress}
								</span>
							</button>
						</div>
					</div>
				</div>

				<div className="flex w-full justify-center pt-2">
					<ProactiveWaitingHintPill message={C.proactivePhaseListeningFooter} />
				</div>
			</div>
		);
	}

	if (phase === 1) {
		return (
			<div
				className={cn(
					"flex w-full max-w-3xl flex-col gap-6",
					proactivePhaseEnterClass,
				)}
			>
				<ProactiveListeningAccent />
				<div className="flex gap-4">
					<Avatar size="lg" className="mt-0.5 shrink-0">
						<AvatarFallback className="bg-background text-brand-primary">
							<Bot className="size-4" aria-hidden />
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0 flex-1 space-y-4">
						<div className="space-y-2 text-text-foreground">
							<p className="text-heading-4 font-semibold leading-heading-4">
								{phase1Line1}
							</p>
							<p className="text-regular font-normal leading-regular">
								{phase1Line2}
							</p>
						</div>

						<div className="flex flex-col gap-4 sm:flex-row">
							<button
								type="button"
								tabIndex={0}
								onClick={() =>
									handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p1Peer, () =>
										onSuggestionSelect(
											phase1MessageOptionPrimary?.submit ?? C.cardPeerQuery,
										),
									)
								}
								className={cnProactiveInteractive(
									pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p1Peer,
									"flex w-full flex-col gap-1 rounded-2xl border border-border-muted bg-background px-3 py-4 text-left sm:w-72",
									"hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
								)}
								aria-label={proactiveEmployeeCardAriaLabel(
									phase1MessageOptionPrimary?.label ?? C.cardPeerTitle,
									phase1MessageOptionPrimary?.description ?? C.cardPeerSubtitle,
								)}
							>
								<UserCog className="size-6 text-primary" aria-hidden />
								<span className="text-regular font-semibold leading-regular text-text-foreground">
									{phase1MessageOptionPrimary?.label ?? C.cardPeerTitle}
								</span>
								<span className="text-mini font-normal leading-mini text-muted-foreground">
									{phase1MessageOptionPrimary?.description ??
										C.cardPeerSubtitle}
								</span>
							</button>
							<button
								type="button"
								tabIndex={0}
								onClick={() =>
									handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p1Comm, () =>
										onSuggestionSelect(
											phase1MessageOptionSecondary?.submit ?? C.cardCommQuery,
										),
									)
								}
								className={cnProactiveInteractive(
									pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p1Comm,
									"flex w-full flex-col gap-1 rounded-2xl border border-border-muted bg-background px-3 py-4 text-left sm:w-72",
									"hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
								)}
								aria-label={proactiveEmployeeCardAriaLabel(
									phase1MessageOptionSecondary?.label ?? C.cardCommTitle,
									phase1MessageOptionSecondary?.description ??
										C.cardCommSubtitle,
								)}
							>
								<Lightbulb className="size-6 text-primary" aria-hidden />
								<span className="text-regular font-semibold leading-regular text-text-foreground">
									{phase1MessageOptionSecondary?.label ?? C.cardCommTitle}
								</span>
								<span className="text-mini font-normal leading-mini text-muted-foreground">
									{phase1MessageOptionSecondary?.description ??
										C.cardCommSubtitle}
								</span>
							</button>
						</div>

						{(phase1Message?.showWaitingHint ?? true) ? (
							<ProactiveWaitingHintPill
								message={phase1Message?.waitingHint ?? C.waitingHint}
							/>
						) : null}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex w-full max-w-3xl flex-col gap-6",
				proactivePhaseEnterClass,
			)}
		>
			<ProactiveListeningAccent />
			<div className="flex gap-4">
				<Avatar size="lg" className="mt-0.5 shrink-0">
					<AvatarFallback className="bg-background text-brand-primary">
						<Bot className="size-4" aria-hidden />
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1 space-y-4">
					<div className="space-y-2 text-text-foreground">
						<p className="text-heading-4 font-semibold leading-heading-4">
							{phase2Line1}
						</p>
						<p className="text-regular font-normal leading-regular">
							{phase2Line2}
						</p>
					</div>

					<div className="flex flex-col gap-4 sm:flex-row">
						<button
							type="button"
							tabIndex={0}
							onClick={() =>
								handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p2Peer, () =>
									onSuggestionSelect(
										phase1MessageOptionPrimary?.submit ?? C.cardPeerQuery,
									),
								)
							}
							className={cnProactiveInteractive(
								pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p2Peer,
								"flex w-full flex-col gap-1 rounded-2xl border border-border-muted bg-background px-3 py-4 text-left sm:w-72",
								"hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
							)}
							aria-label={proactiveEmployeeCardAriaLabel(
								phase1MessageOptionPrimary?.label ?? C.cardPeerTitle,
								phase1MessageOptionPrimary?.description ?? C.cardPeerSubtitle,
							)}
						>
							<UserCog className="size-6 text-primary" aria-hidden />
							<span className="text-regular font-semibold leading-regular text-text-foreground">
								{phase1MessageOptionPrimary?.label ?? C.cardPeerTitle}
							</span>
							<span className="text-mini font-normal leading-mini text-muted-foreground">
								{phase1MessageOptionPrimary?.description ?? C.cardPeerSubtitle}
							</span>
						</button>
						<button
							type="button"
							tabIndex={0}
							onClick={() =>
								handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p2Comm, () =>
									onSuggestionSelect(
										phase1MessageOptionSecondary?.submit ?? C.cardCommQuery,
									),
								)
							}
							className={cnProactiveInteractive(
								pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p2Comm,
								"flex w-full flex-col gap-1 rounded-2xl border border-border-muted bg-background px-3 py-4 text-left sm:w-72",
								"hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
							)}
							aria-label={proactiveEmployeeCardAriaLabel(
								phase1MessageOptionSecondary?.label ?? C.cardCommTitle,
								phase1MessageOptionSecondary?.description ?? C.cardCommSubtitle,
							)}
						>
							<Lightbulb className="size-6 text-primary" aria-hidden />
							<span className="text-regular font-semibold leading-regular text-text-foreground">
								{phase1MessageOptionSecondary?.label ?? C.cardCommTitle}
							</span>
							<span className="text-mini font-normal leading-mini text-muted-foreground">
								{phase1MessageOptionSecondary?.description ??
									C.cardCommSubtitle}
							</span>
						</button>
					</div>
				</div>
			</div>

			<div className="flex gap-4">
				<Avatar size="lg" className="mt-0.5 shrink-0">
					<AvatarFallback className="bg-background text-brand-primary">
						<Bot className="size-4" aria-hidden />
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1 space-y-4">
					<div className="space-y-3 text-text-foreground">
						<p className="text-regular font-normal leading-regular">
							{phase2MessageSecondary?.lines[0] ?? C.followUpParagraph}
						</p>
						<p className="text-regular font-normal leading-regular">
							{phase2MessageSecondary?.lines[1] ?? C.followUpQuestion}
						</p>
					</div>

					<div className="flex flex-col gap-4 sm:flex-row">
						<button
							type="button"
							tabIndex={0}
							onClick={() =>
								handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p2Coach, () =>
									onSuggestionSelect(
										phase2MessageSecondaryOptionCoach?.submit ??
											C.actionCoachQuery,
									),
								)
							}
							className={cnProactiveInteractive(
								pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p2Coach,
								"flex w-full flex-col gap-1 rounded-xl border border-success bg-success-bg p-4 text-left sm:w-64",
								"hover:bg-success-bg/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
							)}
							aria-label={
								phase2MessageSecondaryOptionCoach?.label ?? C.actionCoach
							}
						>
							<Headphones className="size-6 text-success" aria-hidden />
							<span className="text-regular font-semibold leading-regular text-text-foreground">
								{phase2MessageSecondaryOptionCoach?.label ?? C.actionCoach}
							</span>
						</button>
						<button
							type="button"
							tabIndex={0}
							onClick={() =>
								handleCardPress(CHATBOT_PROACTIVE_CARD_KEYS.p2Support, () =>
									onSuggestionSelect(
										phase2MessageSecondaryOptionSupport?.submit ??
											C.actionSupportQuery,
									),
								)
							}
							className={cnProactiveInteractive(
								pressedCardKey === CHATBOT_PROACTIVE_CARD_KEYS.p2Support,
								"flex w-full flex-col gap-1 rounded-xl border border-primary bg-background p-4 text-left sm:w-64",
								"hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
							)}
							aria-label={
								phase2MessageSecondaryOptionSupport?.label ?? C.actionSupport
							}
						>
							<UserCog className="size-6 text-primary" aria-hidden />
							<span className="text-regular font-semibold leading-regular text-text-foreground">
								{phase2MessageSecondaryOptionSupport?.label ?? C.actionSupport}
							</span>
						</button>
					</div>

					<ProactiveWaitingHintPill message={C.proactivePhaseListeningFooter} />
				</div>
			</div>
		</div>
	);
}
