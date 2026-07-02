import { useLocation } from "react-router-dom";
import {
	ChatbotCompactOpenButton,
	ChatbotCompactWidget,
	Header,
	Sidebar,
} from "@/components";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ROUTES } from "@/const";
import {
	useCompanyAdminPaymentGate,
	useIndividualPaymentGate,
	useSubscriptionAccess,
	useUserRoles,
} from "@/hooks";
import { useChatbotStore } from "@/store";
import type { AppLayoutWithBreadcrumbProps } from "@/types";

export function AppLayout({
	children,
	breadcrumbs = [],
	showSidebar: showSidebarProp,
}: AppLayoutWithBreadcrumbProps) {
	const { pathname } = useLocation();
	const { isCompactOpen } = useChatbotStore();
	const { canAccessChatbot } = useSubscriptionAccess();
	const { isCompanyAdmin } = useUserRoles();
	const { paymentRequired: companyPaymentRequired } =
		useCompanyAdminPaymentGate();
	const { paymentRequired: individualPaymentRequired } =
		useIndividualPaymentGate();
	const isOnChatbotPage = pathname === ROUTES.chatbot.root;
	const showChatbot = canAccessChatbot && !isOnChatbotPage;

	const hideSidebarForUnpaidCheckout =
		(isCompanyAdmin && companyPaymentRequired) || individualPaymentRequired;
	const showSidebar =
		showSidebarProp !== undefined
			? showSidebarProp
			: !hideSidebarForUnpaidCheckout;
	const headerLeading = hideSidebarForUnpaidCheckout ? "none" : "breadcrumbs";
	const headerBreadcrumbs = hideSidebarForUnpaidCheckout ? [] : breadcrumbs;

	return (
		<SidebarProvider>
			{showSidebar ? <Sidebar /> : null}
			<SidebarInset className="bg-content-bg flex h-svh min-h-0 flex-1 flex-col overflow-hidden">
				<Header breadcrumbs={headerBreadcrumbs} leading={headerLeading} />
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
					{children}
				</div>
				{showChatbot && !isCompactOpen && <ChatbotCompactOpenButton />}
				{showChatbot && isCompactOpen && <ChatbotCompactWidget />}
			</SidebarInset>
		</SidebarProvider>
	);
}
