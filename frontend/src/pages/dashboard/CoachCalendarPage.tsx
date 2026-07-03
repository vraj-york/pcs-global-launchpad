import { CoachCalendar } from "@/components";
import { COACH_DASHBOARD_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

const breadcrumbs = [
	{
		label: COACH_DASHBOARD_CONTENT.calendarPage.breadcrumbLabel,
		path: ROUTES.coachCalendar.root,
	},
];

export function CoachCalendarPage() {
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<CoachCalendar />
		</AppLayout>
	);
}
