import { useLocation } from "react-router-dom";
import {
	ChatbotCompactOpenButton,
	ChatbotCompactWidget,
	Header,
} from "@/components";
import { ROUTES } from "@/const";
import { useSubscriptionAccess } from "@/hooks";
import { useChatbotStore } from "@/store";
import type { AppLayoutProps } from "@/types";

export function AssessmentLayout({ children }: AppLayoutProps) {
	const { pathname } = useLocation();
	const { isCompactOpen } = useChatbotStore();
	const { canAccessChatbot } = useSubscriptionAccess();
	const isOnChatbotPage = pathname === ROUTES.chatbot.root;
	const showChatbot = canAccessChatbot && !isOnChatbotPage;

	return (
		<div className="flex h-svh min-h-0 w-full flex-col overflow-hidden bg-card">
			<Header leading="logo" />
			<div
				data-assessment-scroll-root
				className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8 lg:px-16 xl:px-24"
			>
				{children}
			</div>
			{showChatbot && !isCompactOpen && <ChatbotCompactOpenButton />}
			{showChatbot && isCompactOpen && <ChatbotCompactWidget />}
		</div>
	);
}
