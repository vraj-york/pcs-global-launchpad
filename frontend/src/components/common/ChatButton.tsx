import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CHATBOT_BOT_NAME, ROUTES } from "@/const";
import { cn } from "@/lib/utils";

export function ChatButton() {
	const navigate = useNavigate();

	const handleClick = () => {
		navigate(ROUTES.chatbot.root);
	};

	return (
		<Button
			onClick={handleClick}
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
				"[&_svg]:h-4! [&_svg]:w-4!",
			)}
		>
			<MessageSquare className="shrink-0" strokeWidth={2.5} />
			<span className="whitespace-nowrap">{CHATBOT_BOT_NAME}</span>
		</Button>
	);
}
