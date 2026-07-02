import { Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { InviteManagementContent } from "@/components";
import { Button } from "@/components/ui/button";
import { INVITE_MANAGEMENT_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

const C = INVITE_MANAGEMENT_PAGE_CONTENT;

export function InviteManagementPage() {
	const navigate = useNavigate();

	return (
		<AppLayout
			breadcrumbs={[
				{
					label: C.breadcrumbsTitle,
					path: ROUTES.inviteManagement.root,
				},
			]}
		>
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 className="text-heading-4 font-semibold text-text-foreground">
							{C.managementTitle}
						</h1>
						<p className="text-small text-text-secondary">
							{C.managementSubtitle}
						</p>
					</div>
					<Button
						type="button"
						icon={Send}
						onClick={() => navigate(ROUTES.inviteManagement.sendInvite)}
					>
						{C.sendInviteButton}
					</Button>
				</div>

				<InviteManagementContent />
			</div>
		</AppLayout>
	);
}
