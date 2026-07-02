import { useEffect, useState } from "react";
import { CHATBOT_PAGE_CONTENT } from "@/const";
import { cn } from "@/lib/utils";
import type { ChatbotEmptyStateProps } from "@/types";

const TYPEWRITER_MS = { default: 28, compact: 20 } as const;
const TYPEWRITER_START_MS = { default: 80, compact: 50 } as const;

export function ChatbotEmptyState({
	greeting,
	variant = "default",
}: ChatbotEmptyStateProps) {
	const [visibleGreeting, setVisibleGreeting] = useState("");

	const isCompact = variant === "compact";
	const perChar = isCompact ? TYPEWRITER_MS.compact : TYPEWRITER_MS.default;
	const startDelay = isCompact
		? TYPEWRITER_START_MS.compact
		: TYPEWRITER_START_MS.default;

	useEffect(() => {
		setVisibleGreeting("");

		if (!greeting) return;

		let timeoutId: number | undefined;
		let currentIndex = 0;

		const typeNextCharacter = () => {
			currentIndex += 1;
			setVisibleGreeting(greeting.slice(0, currentIndex));

			if (currentIndex < greeting.length) {
				timeoutId = window.setTimeout(typeNextCharacter, perChar);
			}
		};

		timeoutId = window.setTimeout(typeNextCharacter, startDelay);

		return () => {
			if (timeoutId) window.clearTimeout(timeoutId);
		};
	}, [greeting, perChar, startDelay]);

	return (
		<div
			className={cn(
				"flex w-full flex-col items-center text-center",
				isCompact ? "max-w-full gap-1.5 px-0.5" : "max-w-3xl gap-2",
			)}
		>
			<h1
				className={cn(
					"font-semibold text-text-foreground",
					isCompact
						? "text-base leading-6"
						: "text-heading-1 leading-heading-1",
				)}
				aria-live="polite"
			>
				{visibleGreeting}
				<span
					className={cn(
						"ml-1 inline-block w-0.5 animate-pulse bg-primary align-middle",
						isCompact ? "h-4" : "h-8",
					)}
					aria-hidden="true"
				/>
			</h1>
			<p
				className={cn(
					"text-brand-secondary",
					isCompact
						? "text-small font-medium leading-small"
						: "text-regular font-medium",
				)}
			>
				{CHATBOT_PAGE_CONTENT.heroPrompt}
			</p>
		</div>
	);
}
