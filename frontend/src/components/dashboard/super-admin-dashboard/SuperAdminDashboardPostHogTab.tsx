import { ExternalLink } from "lucide-react";
import { WhiteBox } from "@/components";
import { Button } from "@/components/ui/button";
import { SUPER_ADMIN_DASHBOARD_PAGE as C } from "@/const";

const dashboardUrl = import.meta.env.VITE_POSTHOG_DASHBOARD_URL?.trim() ?? "";

export function SuperAdminDashboardPostHogTab() {
	return (
		<WhiteBox className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0 flex-col gap-2">
				<h2 className="text-base font-semibold text-text-foreground">
					{C.posthogTab}
				</h2>
				<p className="text-small text-muted-foreground">
					{C.posthogDescription}
				</p>
			</div>
			{dashboardUrl ? (
				<Button asChild className="shrink-0">
					<a
						href={dashboardUrl}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={C.posthogOpenDashboardAriaLabel}
					>
						{C.posthogOpenDashboardLabel}
						<ExternalLink className="size-4" aria-hidden />
					</a>
				</Button>
			) : (
				<p className="shrink-0 text-small text-muted-foreground">
					{C.posthogMissingDashboardUrl}
				</p>
			)}
		</WhiteBox>
	);
}
