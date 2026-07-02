import { SendAssessmentInviteContent } from "@/components";
import { INVITE_MANAGEMENT_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

const C = INVITE_MANAGEMENT_PAGE_CONTENT;

export function SendAssessmentInvitePage() {
	const breadcrumbs = [
		{
			label: C.breadcrumbsTitle,
			path: ROUTES.inviteManagement.root,
		},
		{
			label: C.sendInviteBreadcrumb,
			path: ROUTES.inviteManagement.sendInvite,
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<h1 className="text-heading-4 font-semibold text-text-foreground">
				{C.sendInviteTitle}
			</h1>
			<p className="text-small text-text-secondary">{C.sendInviteSubtitle}</p>
			<SendAssessmentInviteContent />
		</AppLayout>
	);
}
