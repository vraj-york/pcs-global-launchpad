// Figma layer: "Sessions - Upcoming" — node 4:21082
/*
 * SEMANTIC ANALYSIS
 * Route: /coach-sessions (rendered inside AppLayout — sidebar + header shell)
 * - Page title + "Schedule Session" primary button → action button
 * - Segmented tabs "All Requests" / "All Sessions" → useState(activeTab)
 * - "All Sessions": two-column master-detail
 *   · Left: collapsible Upcoming / Past session cards (client avatar + name),
 *     Reschedule / Join / more-actions (Quick Prep / Cancel Session) or View Notes
 *   · Selecting a card → highlights it and shows the Session Details panel
 *   · Right: Session Details (Title / Date / Time / Duration / Client / Description)
 *     + footer actions (Reschedule / Quick Prep / Cancel Session / Join)
 * - "All Requests": empty state (no requests designed yet)
 */
import {
	CalendarSync,
	CalendarX2,
	ChevronDown,
	ClipboardPen,
	EllipsisVertical,
	Plus,
	Video,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	COACH_DASHBOARD_CONTENT,
	COACH_SCHEDULED_SESSIONS,
	type CoachScheduledSession,
} from "@/const";
import { cn } from "@/lib/utils";

const C = COACH_DASHBOARD_CONTENT.sessionsPage;

type SessionsTabId = "allRequests" | "allSessions";

const UPCOMING = COACH_SCHEDULED_SESSIONS.filter((s) => s.scope === "upcoming");
const PAST = COACH_SCHEDULED_SESSIONS.filter((s) => s.scope === "past");

function ClientAvatar({
	session,
	size = "sm",
	className,
}: {
	session: CoachScheduledSession;
	size?: "sm" | "lg";
	className?: string;
}) {
	return (
		<Avatar size={size} className={className}>
			{session.clientAvatar ? (
				<AvatarImage src={session.clientAvatar} alt={session.clientName} />
			) : null}
			<AvatarFallback className="bg-muted font-semibold text-text-foreground">
				{session.clientInitials}
			</AvatarFallback>
		</Avatar>
	);
}

function SessionMeta({ session }: { session: CoachScheduledSession }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-1">
			<span className="truncate text-small font-semibold text-text-foreground">
				{session.title}
			</span>
			<div className="flex flex-wrap items-center gap-2">
				<ClientAvatar session={session} className="size-5" />
				<span className="text-mini font-medium text-text-secondary">
					{session.clientName}
				</span>
				<span className="size-1 shrink-0 rounded-full bg-muted-foreground" />
				<span className="text-mini text-muted-foreground">{session.date}</span>
				<span className="size-1 shrink-0 rounded-full bg-muted-foreground" />
				<span className="text-mini text-muted-foreground">
					{session.timeRange}
				</span>
			</div>
		</div>
	);
}

function SectionHeader({
	label,
	count,
	open,
}: {
	label: string;
	count: number;
	open: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-2.5">
			<span className="text-base font-semibold text-muted-foreground">
				{label} ({count})
			</span>
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					className="bg-secondary text-muted-foreground hover:bg-secondary/70"
					aria-label={label}
				>
					<ChevronDown
						className={cn("size-5 transition-transform", !open && "-rotate-90")}
						aria-hidden
					/>
				</Button>
			</CollapsibleTrigger>
		</div>
	);
}

function SessionCard({
	session,
	selected,
	onSelect,
}: {
	session: CoachScheduledSession;
	selected: boolean;
	onSelect: (session: CoachScheduledSession) => void;
}) {
	const isPast = session.scope === "past";
	return (
		<Card
			onClick={() => onSelect(session)}
			className={cn(
				"flex w-full cursor-pointer flex-row items-center gap-4 rounded-[10px] border border-border bg-background p-4",
				selected ? "border-l-4 border-info shadow-lg" : "shadow-none",
			)}
		>
			<SessionMeta session={session} />
			{isPast ? (
				<Button
					variant="outline"
					size="sm"
					icon={ClipboardPen}
					className="shrink-0"
					onClick={(e) => {
						e.stopPropagation();
						onSelect(session);
					}}
				>
					{C.viewNotes}
				</Button>
			) : (
				<div className="flex shrink-0 items-center gap-2">
					<Button variant="outline" size="sm" icon={CalendarSync}>
						{C.reschedule}
					</Button>
					<Button size="sm" icon={Video}>
						{C.join}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								icon={EllipsisVertical}
								aria-label={C.moreActionsLabel}
								onClick={(e) => e.stopPropagation()}
							/>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="min-w-48 rounded-lg border border-border bg-background p-0.5 shadow-xl"
						>
							<DropdownMenuItem className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small text-text-foreground">
								<Zap className="size-5" aria-hidden />
								<span>{C.quickPrep}</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small"
							>
								<CalendarX2 className="size-5" aria-hidden />
								<span>{C.cancelSession}</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}
		</Card>
	);
}

function DetailField({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-mini text-muted-foreground">{label}</span>
			<span className="text-small text-text-foreground">{value}</span>
		</div>
	);
}

function SessionDetailsPanel({
	session,
	onClose,
}: {
	session: CoachScheduledSession | null;
	onClose: () => void;
}) {
	return (
		<Card className="flex min-w-0 flex-1 flex-col gap-0 rounded-[10px] border border-border bg-background p-0 shadow-none">
			<header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border py-4 pr-2.5 pl-4">
				<h3 className="flex-1 text-base font-medium text-text-secondary">
					{C.detailsTitle}
				</h3>
				{session ? (
					<Button
						variant="ghost"
						size="icon-sm"
						icon={X}
						aria-label={C.close}
						className="bg-card hover:bg-card/70"
						onClick={onClose}
					/>
				) : null}
			</header>

			{session ? (
				<>
					<div className="flex flex-1 flex-col gap-6 p-4">
						<DetailField label={C.fieldLabels.title} value={session.title} />
						<DetailField label={C.fieldLabels.date} value={session.date} />
						<DetailField label={C.fieldLabels.time} value={session.timeRange} />
						<DetailField
							label={C.fieldLabels.duration}
							value={session.duration}
						/>
						<div className="flex flex-col gap-1">
							<span className="text-mini text-muted-foreground">
								{C.fieldLabels.client}
							</span>
							<div className="flex items-center gap-2.5">
								<ClientAvatar session={session} size="lg" />
								<div className="flex min-w-0 flex-col">
									<span className="truncate text-small font-semibold text-text-foreground">
										{session.clientName}
									</span>
									<span className="truncate text-mini text-muted-foreground">
										{session.clientEmail}
									</span>
								</div>
							</div>
						</div>
						<DetailField
							label={C.fieldLabels.description}
							value={session.description}
						/>
					</div>

					<footer className="grid grid-cols-2 gap-3 border-t border-border p-4">
						<Button variant="outline" icon={CalendarSync}>
							{C.reschedule}
						</Button>
						<Button variant="outline" icon={Zap}>
							{C.quickPrep}
						</Button>
						<Button
							variant="outline"
							icon={CalendarX2}
							className="border-border text-destructive hover:bg-destructive/10 hover:text-destructive"
						>
							{C.cancelSession}
						</Button>
						<Button icon={Video}>{C.join}</Button>
					</footer>
				</>
			) : (
				<div className="flex flex-1 items-center justify-center p-4">
					<p className="text-small text-muted-foreground">{C.emptyDetails}</p>
				</div>
			)}
		</Card>
	);
}

export function CoachSessions() {
	const [activeTab, setActiveTab] = useState<SessionsTabId>("allSessions");
	const [upcomingOpen, setUpcomingOpen] = useState(true);
	const [pastOpen, setPastOpen] = useState(true);
	const [scheduling, setScheduling] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(
		UPCOMING[0]?.id ?? null,
	);

	const selectedSession = useMemo(
		() => COACH_SCHEDULED_SESSIONS.find((s) => s.id === selectedId) ?? null,
		[selectedId],
	);

	const handleScheduleSession = useCallback(() => {
		setScheduling(true);
		// Placeholder async action until the scheduling flow API is wired up.
		setTimeout(() => setScheduling(false), 1000);
	}, []);

	const tabs: { id: SessionsTabId; label: string }[] = [
		{ id: "allRequests", label: C.tabs.allRequests },
		{ id: "allSessions", label: C.tabs.allSessions },
	];

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6">
			{/* Title */}
			<div className="flex flex-col items-start gap-6 pt-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{C.title}
					</h1>
					<p className="text-small text-text-secondary">{C.subtitle}</p>
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

			{/* Tabs */}
			<div className="flex h-11 min-h-11 w-full items-center rounded-xl bg-card-foreground p-1">
				<nav
					className="flex flex-1 flex-wrap items-center gap-4"
					aria-label={C.title}
				>
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={cn(
								"inline-flex h-8 min-h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors",
								activeTab === tab.id
									? "bg-background text-brand-primary"
									: "bg-transparent text-text-secondary hover:text-text-foreground",
							)}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Body */}
			{activeTab === "allSessions" ? (
				<div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
					{/* Sessions list */}
					<div className="flex w-full flex-col gap-4 lg:w-[640px] lg:shrink-0">
						<Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
							<SectionHeader
								label={C.upcomingTitle}
								count={UPCOMING.length}
								open={upcomingOpen}
							/>
							<CollapsibleContent className="mt-4">
								<div className="flex flex-col gap-4">
									{UPCOMING.length === 0 ? (
										<p className="text-small text-muted-foreground">
											{C.emptyUpcoming}
										</p>
									) : (
										UPCOMING.map((session) => (
											<SessionCard
												key={session.id}
												session={session}
												selected={session.id === selectedId}
												onSelect={(s) => setSelectedId(s.id)}
											/>
										))
									)}
								</div>
							</CollapsibleContent>
						</Collapsible>

						<Collapsible open={pastOpen} onOpenChange={setPastOpen}>
							<SectionHeader
								label={C.pastTitle}
								count={PAST.length}
								open={pastOpen}
							/>
							<CollapsibleContent className="mt-4">
								<div className="flex flex-col gap-4">
									{PAST.length === 0 ? (
										<p className="text-small text-muted-foreground">
											{C.emptyPast}
										</p>
									) : (
										PAST.map((session) => (
											<SessionCard
												key={session.id}
												session={session}
												selected={session.id === selectedId}
												onSelect={(s) => setSelectedId(s.id)}
											/>
										))
									)}
								</div>
							</CollapsibleContent>
						</Collapsible>
					</div>

					{/* Session Details */}
					<SessionDetailsPanel
						session={selectedSession}
						onClose={() => setSelectedId(null)}
					/>
				</div>
			) : (
				<Card className="flex flex-1 items-center justify-center rounded-[10px] border border-border bg-background p-16 shadow-none">
					<p className="text-small text-muted-foreground">
						{C.allRequestsEmpty}
					</p>
				</Card>
			)}
		</div>
	);
}
