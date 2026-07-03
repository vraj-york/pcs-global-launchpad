// Figma layer: "Settings - Calendar Sync" — node 4:22046
/*
 * SEMANTIC ANALYSIS
 * Coach Settings → Calendar Sync tab.
 * - Two integration cards (Outlook Calendar, Zoom Workplace), each with a brand
 *   logo, title + description, and a primary "Connect" button (left icon).
 * - Connect buttons kick off the OAuth connect flow (placeholder until wired).
 */
import { CalendarDays, type LucideIcon, Video } from "lucide-react";
import { toast } from "sonner";
import outlookLogo from "@/assets/coach-dashboard/outlook-calendar.svg";
import zoomLogo from "@/assets/coach-dashboard/zoom-workplace.svg";
import { Button } from "@/components/ui/button";
import { COACH_CALENDAR_SYNC_SETTINGS } from "@/const";

const C = COACH_CALENDAR_SYNC_SETTINGS;

function IntegrationCard({
	logo,
	title,
	description,
	connectLabel,
	icon,
	onConnect,
}: {
	logo: string;
	title: string;
	description: string;
	connectLabel: string;
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
			</div>
			<Button
				type="button"
				size="lg"
				icon={icon}
				className="w-full"
				onClick={onConnect}
			>
				{connectLabel}
			</Button>
		</div>
	);
}

export function CoachCalendarSyncTab() {
	// Placeholder until the OAuth connect endpoints are wired up.
	const handleConnect = (provider: string) => {
		toast.info(`Connecting ${provider}…`);
	};

	return (
		<div className="flex flex-col gap-4 sm:flex-row">
			<IntegrationCard
				logo={outlookLogo}
				title={C.outlook.title}
				description={C.outlook.description}
				connectLabel={C.outlook.connect}
				icon={CalendarDays}
				onConnect={() => handleConnect(C.outlook.title)}
			/>
			<IntegrationCard
				logo={zoomLogo}
				title={C.zoom.title}
				description={C.zoom.description}
				connectLabel={C.zoom.connect}
				icon={Video}
				onConnect={() => handleConnect(C.zoom.title)}
			/>
		</div>
	);
}
