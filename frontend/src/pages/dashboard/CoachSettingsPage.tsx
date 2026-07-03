import { CoachSettings } from "@/components";
import { COACH_SETTINGS_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

const breadcrumbs = [
	{
		label: COACH_SETTINGS_CONTENT.breadcrumbLabel,
		path: ROUTES.coachSettings.root,
	},
];

export function CoachSettingsPage() {
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<CoachSettings />
		</AppLayout>
	);
}
