import { LayoutDashboard } from "lucide-react";
import { PlaceholderCard } from "@/components/user-dashboard";
import { DASHBOARD_PAGE_CONTENT } from "@/const";

const C = DASHBOARD_PAGE_CONTENT;

export function DashboardAccessPlaceholder() {
	return (
		<div className="flex min-h-80 flex-1 items-center justify-center p-6">
			<PlaceholderCard
				icon={LayoutDashboard}
				title={C.dashboardAccessRestrictedTitle}
				description={C.dashboardAccessRestrictedDescription}
				className="w-full max-w-lg"
			/>
		</div>
	);
}
