import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHATBOT_BOT_NAME, CHATBOT_COMPACT_CONTENT } from "@/const";
import { cn } from "@/lib/utils";
import { useChatbotStore } from "@/store";

/** Opens the compact chatbot panel; feature-scoped so `ChatButton` stays route-only. */
export function ChatbotCompactOpenButton() {
	const { openCompact } = useChatbotStore();

	const handleClick = () => {
		openCompact();
	};

	return (
		<Button
			onClick={handleClick}
			icon={MessageSquare}
			aria-label={CHATBOT_COMPACT_CONTENT.openButtonLabel}
			className={cn(
				"fixed bottom-3 right-6 z-50",
				"px-4 py-3 h-12",
				"rounded-full",
				"bg-primary text-light-same",
				"shadow-md",
				"flex items-center gap-2",
				"font-medium text-small",
				"transition-all duration-200",
				"hover:scale-105 active:scale-95",
			)}
		>
			<span className="whitespace-nowrap">{CHATBOT_BOT_NAME}</span>
		</Button>
	);
}
