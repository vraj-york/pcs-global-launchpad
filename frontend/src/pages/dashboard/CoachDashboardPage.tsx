import { CoachDashboard } from "@/components";
import { COACH_DASHBOARD_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

const breadcrumbs = [
	{
		label: COACH_DASHBOARD_CONTENT.breadcrumbLabel,
		path: ROUTES.coachDashboard.root,
	},
];

export function CoachDashboardPage() {
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<CoachDashboard />
		</AppLayout>
	);
}
