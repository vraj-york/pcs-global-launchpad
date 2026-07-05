// Figma layer: "Settings - Calendar Sync" — node 4:22046
/*
 * SEMANTIC ANALYSIS
 * Coach Settings → Calendar Sync tab.
 * - Two integration cards (Outlook Calendar, Zoom Workplace), each with a brand
 *   logo, title + description, and a primary "Connect" button (left icon).
 * - Connect buttons call the stubbed local-dev integration endpoints.
 */
import { CalendarDays, type LucideIcon, Video } from "lucide-react";
import { useEffect } from "react";
import outlookLogo from "@/assets/coach-dashboard/outlook-calendar.svg";
import zoomLogo from "@/assets/coach-dashboard/zoom-workplace.svg";
import { Button } from "@/components/ui/button";
import { COACH_CALENDAR_SYNC_SETTINGS } from "@/const";
import { useCoachDashboardStore } from "@/store";

const C = COACH_CALENDAR_SYNC_SETTINGS;

function IntegrationCard({
	logo,
	title,
	description,
	connectLabel,
	connected,
	icon,
	onConnect,
}: {
	logo: string;
	title: string;
	description: string;
	connectLabel: string;
	connected?: boolean;
	icon: LucideIcon;
	onConnect: () => void;
}) {
	return (
		<div className="flex w-full flex-col justify-center gap-6 rounded-2xl border border-border bg-background p-6 sm:w-[360px]">
			<img src={logo} alt="" className="size-20" aria-hidden />
			<div className="flex flex-col gap-1.5">
				<h3 className="text-heading-4 font-semibold text-text-foreground">
					{title}
				</h3>
				<p className="text-small text-text-secondary">{description}</p>
				<p className="text-mini text-muted-foreground">
					{connected ? "Connected" : "Not connected"}
				</p>
			</div>
			<Button
				type="button"
				size="lg"
				icon={icon}
				className="w-full"
				onClick={onConnect}
			>
				{connected ? "Disconnect" : connectLabel}
			</Button>
		</div>
	);
}

export function CoachCalendarSyncTab() {
	const { integrations, fetchContent, connectIntegration, disconnectIntegration } =
		useCoachDashboardStore();

	useEffect(() => {
		if (integrations.length === 0) {
			void fetchContent();
		}
	}, [fetchContent, integrations.length]);

	const outlook = integrations.find((item) => item.provider === "outlook");
	const zoom = integrations.find((item) => item.provider === "zoom");

	return (
		<div className="flex flex-col gap-4 sm:flex-row">
			<IntegrationCard
				logo={outlookLogo}
				title={C.outlook.title}
				description={C.outlook.description}
				connectLabel={C.outlook.connect}
				connected={outlook?.connected}
				icon={CalendarDays}
				onConnect={() =>
					void (outlook?.connected
						? disconnectIntegration("outlook")
						: connectIntegration("outlook"))
				}
			/>
			<IntegrationCard
				logo={zoomLogo}
				title={C.zoom.title}
				description={C.zoom.description}
				connectLabel={C.zoom.connect}
				connected={zoom?.connected}
				icon={Video}
				onConnect={() =>
					void (zoom?.connected
						? disconnectIntegration("zoom")
						: connectIntegration("zoom"))
				}
			/>
		</div>
	);
}
