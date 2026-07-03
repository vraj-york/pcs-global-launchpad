// Figma layer: "Dashboard" (PCS Global Coach Persona) — node 4:20240
/*
 * SEMANTIC ANALYSIS
 * Route: rendered inside AppLayout (sidebar + header provided by shell)
 * - Welcome header + "Schedule Session" primary button → action button
 * - Today's Sessions card → mapped list of upcoming sessions, each with
 *   Reschedule / Join / more-actions buttons (interactive)
 * - Client Activity card → mapped activity feed with divider rows
 * - This Month Insight card → gradient KPI card with 3 stat tiles
 * - Your Availability card → key/value rows + "Manage Availability" button
 */
import {
	ArrowRight,
	CalendarDays,
	CalendarFold,
	CalendarSync,
	CalendarX2,
	CircleCheckBig,
	EllipsisVertical,
	Hourglass,
	type LucideIcon,
	Plus,
	Settings2,
	TrendingUp,
	Users,
	Video,
	Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	COACH_AVAILABILITY,
	COACH_CLIENT_ACTIVITY,
	COACH_DASHBOARD_CONTENT,
	COACH_INSIGHT_STATS,
	COACH_SESSIONS,
	type CoachClientActivity,
	type CoachInsightStat,
	type CoachSession,
} from "@/const";
import { cn } from "@/lib/utils";
import { ComingSoon } from "./ComingSoon";
import { Resources } from "./Resources";

const C = COACH_DASHBOARD_CONTENT;

const INSIGHT_STAT_ICONS: Record<CoachInsightStat["icon"], LucideIcon> = {
	"calendar-fold": CalendarFold,
	users: Users,
	hourglass: Hourglass,
};

function SessionRow({
	session,
	onQuickPrep,
	onCancel,
}: {
	session: CoachSession;
	onQuickPrep: (session: CoachSession) => void;
	onCancel: (session: CoachSession) => void;
}) {
	return (
		<div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
			<Avatar size="lg" className="size-10 shrink-0">
				{session.avatar ? (
					<AvatarImage src={session.avatar} alt={session.name} />
				) : null}
				<AvatarFallback className="bg-muted text-small font-semibold text-text-foreground">
					{session.initials}
				</AvatarFallback>
			</Avatar>

			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-small font-semibold text-text-foreground">
						{session.name}
					</span>
					<Badge
						variant={session.badgeVariant}
						className="rounded-lg font-semibold"
					>
						{session.badge}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-mini font-medium text-text-secondary">
						{session.time}
					</span>
					<span className="size-1 shrink-0 rounded-full bg-muted-foreground" />
					<span className="text-mini text-muted-foreground">
						{session.relativeTime}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" icon={CalendarSync}>
					{C.todaysSessions.reschedule}
				</Button>
				<Button size="sm" icon={Video}>
					{C.todaysSessions.join}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							icon={EllipsisVertical}
							aria-label={C.todaysSessions.moreActionsLabel}
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="min-w-40 rounded-lg border border-border bg-background p-0.5 shadow-xl"
					>
						<DropdownMenuItem
							onClick={() => onQuickPrep(session)}
							className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small text-text-foreground"
						>
							<Zap className="size-5" aria-hidden />
							<span>{C.todaysSessions.quickPrep}</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							onClick={() => onCancel(session)}
							className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small"
						>
							<CalendarX2 className="size-5" aria-hidden />
							<span>{C.todaysSessions.cancelSession}</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

function ActivityRow({
	activity,
	isLast,
}: {
	activity: CoachClientActivity;
	isLast: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-4",
				!isLast && "border-b border-border pb-4",
			)}
		>
			<Avatar size="lg" className="size-10 shrink-0">
				{activity.avatar ? (
					<AvatarImage src={activity.avatar} alt={activity.name} />
				) : null}
				<AvatarFallback className="bg-muted text-small font-semibold text-text-foreground">
					{activity.initials}
				</AvatarFallback>
			</Avatar>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="text-small font-semibold text-text-foreground">
					{activity.name}
				</span>
				<span className="text-mini text-text-secondary">{activity.detail}</span>
			</div>

			<span className="shrink-0 text-small text-muted-foreground">
				{activity.timestamp}
			</span>
		</div>
	);
}

function InsightStatTile({ stat }: { stat: CoachInsightStat }) {
	const Icon = INSIGHT_STAT_ICONS[stat.icon];
	return (
		<div
			className={cn(
				"flex flex-col gap-4 rounded-[14px] bg-white/10 p-5",
				stat.wide && "col-span-2",
			)}
		>
			<Icon className="size-6 text-white/50" aria-hidden />
			<div className="flex flex-col">
				<span className="text-heading-3 font-semibold text-white">
					{stat.value}
				</span>
				<span className="text-small text-white">{stat.label}</span>
			</div>
		</div>
	);
}

export function CoachDashboard() {
	const [scheduling, setScheduling] = useState(false);

	const handleScheduleSession = useCallback(() => {
		setScheduling(true);
		// Placeholder async action until the scheduling flow API is wired up.
		setTimeout(() => setScheduling(false), 1000);
	}, []);

	const handleQuickPrep = useCallback((_session: CoachSession) => {
		// Placeholder until the Quick Prep flow API is wired up.
	}, []);

	const handleCancelSession = useCallback((_session: CoachSession) => {
		// Placeholder until the cancel-session API is wired up.
	}, []);

	return (
		<div className="flex flex-col gap-6">
			{/* Title */}
			<div className="flex flex-col items-start gap-6 pt-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{C.welcomeTitle}
					</h1>
					<p className="text-small text-text-secondary">{C.welcomeSubtitle}</p>
				</div>
				<Button
					icon={Plus}
					isLoading={scheduling}
					onClick={handleScheduleSession}
					className="shrink-0"
				>
					{C.scheduleSession}
				</Button>
			</div>

			{/* Body */}
			<div className="flex flex-col gap-4 lg:flex-row lg:items-start">
				{/* Left column */}
				<div className="flex min-w-0 flex-1 flex-col gap-2.5">
					{/* Today's Sessions */}
					<section className="flex flex-col gap-6 rounded-xl bg-background p-6">
						<header className="flex items-center gap-4">
							<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-yellow">
								<CalendarDays className="size-7 text-white" aria-hidden />
							</div>
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<h2 className="text-heading-4 font-semibold text-text-foreground">
									{C.todaysSessions.title}
								</h2>
								<p className="text-small text-muted-foreground">
									{C.todaysSessions.subtitle}
								</p>
							</div>
							<Button
								variant="ghost"
								icon={ArrowRight}
								iconPosition="end"
								className="bg-info-bg text-info hover:bg-info-bg/70 hover:text-info"
							>
								{C.todaysSessions.viewAll}
							</Button>
						</header>

						<div className="flex flex-col gap-3">
							{COACH_SESSIONS.length === 0 ? (
								<p className="text-small text-muted-foreground">
									{C.emptyStates.sessions}
								</p>
							) : (
								COACH_SESSIONS.map((session) => (
									<SessionRow
										key={session.id}
										session={session}
										onQuickPrep={handleQuickPrep}
										onCancel={handleCancelSession}
									/>
								))
							)}
						</div>
					</section>

					{/* Client Activity */}
					<section className="flex flex-col gap-8 rounded-xl bg-background p-6">
						<header className="flex items-center gap-4">
							<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-green">
								<CircleCheckBig className="size-7 text-white" aria-hidden />
							</div>
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<h2 className="text-heading-4 font-semibold text-text-foreground">
									{C.clientActivity.title}
								</h2>
								<p className="text-small text-muted-foreground">
									{C.clientActivity.subtitle}
								</p>
							</div>
						</header>

						<div className="flex flex-col gap-4">
							{COACH_CLIENT_ACTIVITY.length === 0 ? (
								<p className="text-small text-muted-foreground">
									{C.emptyStates.activity}
								</p>
							) : (
								COACH_CLIENT_ACTIVITY.map((activity, index) => (
									<ActivityRow
										key={activity.id}
										activity={activity}
										isLast={index === COACH_CLIENT_ACTIVITY.length - 1}
									/>
								))
							)}
						</div>
					</section>
				</div>

				{/* Right column */}
				<div className="flex w-full shrink-0 flex-col gap-2.5 lg:w-[376px]">
					{/* This Month Insight */}
					<section className="flex flex-col justify-center gap-4 rounded-2xl bg-[linear-gradient(134deg,var(--bspBlueBase)_20%,var(--bspBlue800)_100%)] p-6">
						<div className="flex items-center gap-2.5">
							<TrendingUp className="size-6 text-white" aria-hidden />
							<h2 className="text-heading-4 font-semibold text-white">
								{C.insight.title}
							</h2>
						</div>
						<div className="grid grid-cols-2 gap-2">
							{COACH_INSIGHT_STATS.map((stat) => (
								<InsightStatTile key={stat.id} stat={stat} />
							))}
						</div>
					</section>

					{/* Your Availability */}
					<section className="flex flex-col gap-8 rounded-xl bg-background p-6">
						<header className="flex flex-col gap-0.5">
							<h2 className="text-heading-4 font-semibold text-text-foreground">
								{C.availability.title}
							</h2>
							<p className="text-small text-muted-foreground">
								{C.availability.subtitle}
							</p>
						</header>

						<div className="flex flex-col gap-4">
							{COACH_AVAILABILITY.map((row, index) => (
								<div
									key={row.id}
									className={cn(
										"flex items-center justify-between gap-4",
										index !== COACH_AVAILABILITY.length - 1 &&
											"border-b border-border pb-4",
									)}
								>
									<span className="text-small text-muted-foreground">
										{row.label}
									</span>
									<span className="shrink-0 text-small font-semibold text-text-foreground">
										{row.value}
									</span>
								</div>
							))}
						</div>

						<Button variant="outline" icon={Settings2} className="w-full">
							{C.availability.manage}
						</Button>
					</section>
				</div>
			</div>

			{/* What's coming soon — Figma node 4:19398 */}
			<ComingSoon />

			{/* Resources — Figma node 4:19379 */}
			<Resources />
		</div>
	);
}
