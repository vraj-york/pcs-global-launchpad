import { InviteUserContent } from "@/components";
import { INVITE_USER_PAGE, ROUTES, USER_DIRECTORY_PAGE_CONTENT } from "@/const";
import { AppLayout } from "@/layout";

export function InviteUserPage() {
	const breadcrumbs = [
		{
			label: USER_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.userDirectory.root,
		},
		{
			label: INVITE_USER_PAGE.breadcrumbCurrent,
			path: ROUTES.userDirectory.invite,
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<h1 className="text-heading-4 font-semibold text-text-foreground">
				{INVITE_USER_PAGE.title}
			</h1>
			<p className="text-small text-text-secondary">
				{INVITE_USER_PAGE.subtitle}
			</p>
			<InviteUserContent />
		</AppLayout>
	);
}
