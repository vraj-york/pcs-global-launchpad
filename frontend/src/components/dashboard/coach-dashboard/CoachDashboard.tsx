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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
	COACH_DASHBOARD_CONTENT,
} from "@/const";
import { cn } from "@/lib/utils";
import { useCoachDashboardStore, useCoachSessionsStore } from "@/store";
import type {
	CoachClientActivity,
	CoachInsightStat,
	CoachSession,
	CoachClientSession,
} from "@/types";
import { CancelSessionModal } from "./CancelSessionModal";
import { ComingSoon } from "./ComingSoon";
import { QuickPrepModal } from "./QuickPrepModal";
import { Resources } from "./Resources";
import { ScheduleSessionModal } from "./ScheduleSessionModal";
import { SessionsAndNotes } from "./SessionsAndNotes";
import { WelcomeBanner } from "./WelcomeBanner";
import { WhatLaunched } from "./WhatLaunched";

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
	onJoin,
	onReschedule,
}: {
	session: CoachSession;
	onQuickPrep: (session: CoachSession) => void;
	onCancel: (session: CoachSession) => void;
	onJoin: (session: CoachSession) => void;
	onReschedule: (session: CoachSession) => void;
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
				<Button
					variant="outline"
					size="sm"
					icon={CalendarSync}
					onClick={() => onReschedule(session)}
				>
					{C.todaysSessions.reschedule}
				</Button>
				<Button size="sm" icon={Video} onClick={() => onJoin(session)}>
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
						className="min-w-48 rounded-lg border border-border bg-background p-0.5 shadow-xl"
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
	const navigate = useNavigate();
	const {
		sessions,
		activity,
		insight,
		availability,
		resources,
		launchUpdates,
		earlyAccessFeatures,
		quickPrep,
		loading,
		actionLoading,
		fetchDashboard,
		fetchContent,
		fetchQuickPrep,
		scheduleSession,
		cancelSession,
		joinSession,
	} = useCoachDashboardStore();
	const {
		upcomingSessions,
		pastSessions,
		fetchSessionsPage,
		saveNotes,
	} = useCoachSessionsStore();
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<CoachSession | null>(null);
	const [quickPrepOpen, setQuickPrepOpen] = useState(false);

	useEffect(() => {
		void fetchDashboard();
		void fetchContent();
		void fetchSessionsPage();
	}, [fetchContent, fetchDashboard, fetchSessionsPage]);

	const handleScheduleSession = useCallback(() => {
		setScheduleOpen(true);
	}, []);

	const handleQuickPrep = useCallback(
		async (session: CoachSession) => {
			const data = await fetchQuickPrep(session.id);
			if (data) {
				setQuickPrepOpen(true);
			}
		},
		[fetchQuickPrep],
	);

	const handleCancelSession = useCallback((session: CoachSession) => {
		setCancelTarget(session);
	}, []);

	const handleJoin = useCallback(
		async (session: CoachSession) => {
			const meetingUrl = await joinSession(session.id);
			if (meetingUrl) {
				window.open(meetingUrl, "_blank", "noopener,noreferrer");
			}
		},
		[joinSession],
	);

	const mappedUpcomingSessions = useMemo<CoachClientSession[]>(
		() =>
			upcomingSessions.map((session) => ({
				id: session.id,
				title: session.title,
				dateTime: `${session.date} • ${session.timeRange}`,
				notes: session.notes,
			})),
		[upcomingSessions],
	);

	const mappedPastSessions = useMemo<CoachClientSession[]>(
		() =>
			pastSessions.map((session) => ({
				id: session.id,
				title: session.title,
				dateTime: `${session.date} • ${session.timeRange}`,
				notes: session.notes,
			})),
		[pastSessions],
	);

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
					isLoading={actionLoading}
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
							{loading ? (
								<p className="text-small text-muted-foreground">Loading…</p>
							) : sessions.length === 0 ? (
								<p className="text-small text-muted-foreground">
									{C.emptyStates.sessions}
								</p>
							) : (
								sessions.map((session) => (
									<SessionRow
										key={session.id}
										session={session}
										onQuickPrep={handleQuickPrep}
										onCancel={handleCancelSession}
										onJoin={handleJoin}
										onReschedule={() => navigate("/coach-sessions")}
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
							{loading ? (
								<p className="text-small text-muted-foreground">Loading…</p>
							) : activity.length === 0 ? (
								<p className="text-small text-muted-foreground">
									{C.emptyStates.activity}
								</p>
							) : (
								activity.map((activity, index, rows) => (
									<ActivityRow
										key={activity.id}
										activity={activity}
										isLast={index === rows.length - 1}
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
							{insight.map((stat) => (
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
							{(availability?.summary ?? []).map((row, index, rows) => (
								<div
									key={row.id}
									className={cn(
										"flex items-center justify-between gap-4",
										index !== rows.length - 1 &&
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

						<Button
							variant="outline"
							icon={Settings2}
							className="w-full"
							onClick={() => navigate("/coach-settings")}
						>
							{C.availability.manage}
						</Button>
					</section>
				</div>
			</div>

			{/* Welcome / coaching toolkit — Figma node 4:19414 */}
			<WelcomeBanner />

			{/* What's coming soon — Figma node 4:19398 */}
			<ComingSoon
				features={earlyAccessFeatures}
				onRequestEarlyAccess={() => {
					void useCoachDashboardStore.getState().requestEarlyAccess(
						earlyAccessFeatures[0]?.featureKey,
					);
				}}
			/>

			{/* What launched — Figma node 4:19407 */}
			<WhatLaunched updates={launchUpdates} />

			{/* Resources — Figma node 4:19379 */}
			<Resources resources={resources} />

			{/* Client sessions & notes ("Session Info." tab) — Figma node 4:20808 */}
			<SessionsAndNotes
				upcomingSessions={mappedUpcomingSessions}
				pastSessions={mappedPastSessions}
				onSaveNotes={saveNotes}
			/>

			<ScheduleSessionModal
				open={scheduleOpen}
				onOpenChange={setScheduleOpen}
				onConfirm={async (values) => {
					const success = await scheduleSession(values);
					if (success) {
						setScheduleOpen(false);
						void fetchSessionsPage();
					}
					return success;
				}}
			/>
			<QuickPrepModal
				open={quickPrepOpen}
				onOpenChange={setQuickPrepOpen}
				data={quickPrep ?? undefined}
				onJoin={() => {
					if (quickPrep?.clientName) {
						const session = sessions.find((item) => item.name === quickPrep.clientName);
						if (session) {
							void handleJoin(session);
						}
					}
				}}
			/>
			<CancelSessionModal
				open={!!cancelTarget}
				onOpenChange={(open) => {
					if (!open) setCancelTarget(null);
				}}
				onConfirm={async (values) => {
					if (!cancelTarget) return false;
					const success = await cancelSession(cancelTarget.id, values);
					if (success) {
						setCancelTarget(null);
						void fetchSessionsPage();
					}
					return success;
				}}
			/>
		</div>
	);
}
