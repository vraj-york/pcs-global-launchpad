import { UserDirectoryContent } from "@/components";
import { ROUTES, USER_DIRECTORY_PAGE_CONTENT } from "@/const";
import { AppLayout } from "@/layout";

export const UserDirectoryPage = () => {
	const breadcrumbs = [
		{
			label: USER_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.userDirectory.root,
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="mb-6">
				<h1 className="text-heading-4 font-semibold text-text-foreground">
					{USER_DIRECTORY_PAGE_CONTENT.title}
				</h1>
				<p className="text-small text-text-secondary">
					{USER_DIRECTORY_PAGE_CONTENT.subtitle}
				</p>
			</div>
			<UserDirectoryContent />
		</AppLayout>
	);
};
