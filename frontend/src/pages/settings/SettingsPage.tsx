import { SettingsPageContent } from "@/components";
import { ROUTES, SETTINGS_PAGE_CONTENT } from "@/const";
import { AppLayout } from "@/layout";

const breadcrumbs = [
	{ label: SETTINGS_PAGE_CONTENT.breadcrumbTitle, path: ROUTES.settings.root },
];

export function SettingsPage() {
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<SettingsPageContent />
		</AppLayout>
	);
}
