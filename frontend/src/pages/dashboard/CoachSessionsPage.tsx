import { CoachSessions } from "@/components";
import { COACH_DASHBOARD_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

const breadcrumbs = [
	{
		label: COACH_DASHBOARD_CONTENT.sessionsPage.breadcrumbLabel,
		path: ROUTES.coachSessions.root,
	},
];

export function CoachSessionsPage() {
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<CoachSessions />
		</AppLayout>
	);
}
