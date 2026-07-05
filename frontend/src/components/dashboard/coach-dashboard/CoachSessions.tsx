// Figma layer: "Sessions - Upcoming" (node 4:21082) / "Sessions - Past" (node 4:20999)
/*
 * SEMANTIC ANALYSIS
 * Route: /coach-sessions (rendered inside AppLayout — sidebar + header shell)
 * - Page title + "Schedule Session" primary button → action button
 * - Segmented tabs "All Requests" / "All Sessions" → useState(activeTab)
 * - "All Sessions": two-column master-detail
 *   · Left: collapsible Upcoming / Past session cards (client avatar + name),
 *     Reschedule / Join / more-actions (Quick Prep / Cancel Session) or View Notes
 *   · Selecting a card → highlights it; the right panel depends on the scope:
 *     - Upcoming session → Session Details panel (node 4:21082):
 *       Title / Date / Time / Duration / Client / Description + footer actions
 *       (Reschedule / Quick Prep / Cancel Session / Join)
 *     - Past session ("View Notes") → Session Notes editor (node 4:20999):
 *       textarea seeded with saved notes + footer Close / Save Notes
 * - "All Requests" (Figma node 4:20887): "Session Requests" list with Status /
 *   Employee filters and per-request actions (Accept / Propose Slots / Edit
 *   Slots / Remind / Cancel Request / View Reason); proposed slots show a tooltip
 */
import {
	Bell,
	CalendarClock,
	CalendarCog,
	CalendarSync,
	CalendarX2,
	Check,
	ChevronDown,
	EllipsisVertical,
	Eye,
	type LucideIcon,
	NotepadText,
	Plus,
	Save,
	Video,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	COACH_DASHBOARD_CONTENT,
	type CoachRequestActionId,
	type CoachRequestStatus,
} from "@/const";
import { cn } from "@/lib/utils";
import { useCoachDashboardStore, useCoachSessionsStore } from "@/store";
import type { CoachScheduledSession, CoachSessionRequest } from "@/types";
import { CancelSessionModal } from "./CancelSessionModal";
import { QuickPrepModal } from "./QuickPrepModal";
import { ScheduleSessionModal } from "./ScheduleSessionModal";
import { ViewReasonModal } from "./ViewReasonModal";

const C = COACH_DASHBOARD_CONTENT.sessionsPage;
const R = C.requests;

type SessionsTabId = "allRequests" | "allSessions";

const REQUEST_BADGE_VARIANT: Record<
	CoachRequestStatus,
	"blue" | "yellow" | "destructive"
> = {
	new: "blue",
	proposed: "yellow",
	cancelled: "destructive",
};

const REQUEST_ACTIONS: Record<
	CoachRequestActionId,
	{
		label: string;
		icon: LucideIcon;
		variant: "default" | "outline" | "ghost";
		className?: string;
	}
> = {
	cancelRequest: {
		label: R.actions.cancelRequest,
		icon: CalendarX2,
		variant: "ghost",
		className:
			"bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive",
	},
	proposeSlots: { label: R.actions.proposeSlots, icon: CalendarClock, variant: "outline" },
	accept: { label: R.actions.accept, icon: Check, variant: "default" },
	editSlots: { label: R.actions.editSlots, icon: CalendarCog, variant: "outline" },
	remind: { label: R.actions.remind, icon: Bell, variant: "outline" },
	viewReason: { label: R.actions.viewReason, icon: Eye, variant: "outline" },
};

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
	onQuickPrep,
	onCancelSession,
}: {
	session: CoachScheduledSession;
	selected: boolean;
	onSelect: (session: CoachScheduledSession) => void;
	onQuickPrep: (session: CoachScheduledSession) => void;
	onCancelSession: (session: CoachScheduledSession) => void;
}) {
	const isPast = session.scope === "past";
	return (
		<Card
			onClick={() => onSelect(session)}
			className={cn(
				"flex w-full cursor-pointer flex-row items-center gap-4 rounded-[10px] border border-border bg-background p-4",
				selected ? "border-l-4 border-info" : "",
			)}
		>
			<SessionMeta session={session} />
			{isPast ? (
				<Button
					variant="outline"
					size="sm"
					icon={NotepadText}
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
							className="min-w-48 rounded-lg border border-border bg-background p-0.5 shadow-none ring-0"
						>
							<DropdownMenuItem
								className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small text-text-foreground"
								onSelect={() => onQuickPrep(session)}
							>
								<Zap className="size-5" aria-hidden />
								<span>{C.quickPrep}</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small"
								onSelect={() => onCancelSession(session)}
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
	onQuickPrep,
	onCancelSession,
}: {
	session: CoachScheduledSession | null;
	onClose: () => void;
	onQuickPrep: (session: CoachScheduledSession) => void;
	onCancelSession: (session: CoachScheduledSession) => void;
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
						<Button
							variant="outline"
							icon={Zap}
							onClick={() => onQuickPrep(session)}
						>
							{C.quickPrep}
						</Button>
						<Button
							variant="outline"
							icon={CalendarX2}
							className="border-border text-destructive hover:bg-destructive/10 hover:text-destructive"
							onClick={() => onCancelSession(session)}
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

function SessionNotesPanel({
	session,
	notes,
	onNotesChange,
	onClose,
	onSave,
	saving,
}: {
	session: CoachScheduledSession | null;
	notes: string;
	onNotesChange: (value: string) => void;
	onClose: () => void;
	onSave: () => void;
	saving: boolean;
}) {
	return (
		<Card className="flex min-w-0 flex-1 flex-col gap-0 rounded-[10px] border border-border bg-background p-0 shadow-none">
			<header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border py-4 pr-2.5 pl-4">
				<h3 className="flex-1 text-base font-medium text-text-secondary">
					{C.notesTitle}
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
					<div className="flex flex-1 flex-col p-4">
						<Textarea
							value={notes}
							onChange={(event) => onNotesChange(event.target.value)}
							placeholder={C.notesPlaceholder}
							className="min-h-64 flex-1 resize-none rounded-lg border-border bg-background text-small text-text-foreground shadow-none"
						/>
					</div>
					<footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-4">
						<Button variant="outline" onClick={onClose}>
							{C.close}
						</Button>
						<Button icon={Save} isLoading={saving} onClick={onSave}>
							{C.save}
						</Button>
					</footer>
				</>
			) : (
				<div className="flex flex-1 items-center justify-center p-4">
					<p className="text-small text-muted-foreground">{C.notesEmpty}</p>
				</div>
			)}
		</Card>
	);
}

function RequestActions({
	request,
	onAction,
	onViewReason,
}: {
	request: CoachSessionRequest;
	onAction?: (actionId: CoachRequestActionId, request: CoachSessionRequest) => void;
	onViewReason?: () => void;
}) {
	return (
		<div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
			{request.actions.map((actionId) => {
				const action = REQUEST_ACTIONS[actionId];
				return (
					<Button
						key={actionId}
						variant={action.variant}
						size="sm"
						icon={action.icon}
						className={action.className}
						onClick={() =>
							actionId === "viewReason"
								? onViewReason?.()
								: onAction?.(actionId, request)
						}
					>
						{action.label}
					</Button>
				);
			})}
		</div>
	);
}

function RequestMeta({ request }: { request: CoachSessionRequest }) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{request.clientName ? (
				<Avatar size="sm" className="size-5">
					{request.clientAvatar ? (
						<AvatarImage src={request.clientAvatar} alt={request.clientName} />
					) : null}
					<AvatarFallback className="bg-muted text-mini font-semibold text-text-foreground">
						{request.clientInitials}
					</AvatarFallback>
				</Avatar>
			) : null}
			<p className="text-mini text-muted-foreground">
				{request.clientName ? (
					<span className="font-medium text-text-secondary">
						{request.clientName}{" "}
					</span>
				) : null}
				{request.metaText}
				{request.linkLabel ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								className="cursor-pointer font-medium text-info underline underline-offset-2"
							>
								{request.linkLabel}
							</button>
						</TooltipTrigger>
						<TooltipContent className="flex flex-col gap-1">
							{request.tooltipLines?.map((line) => (
								<span key={line}>{line}</span>
							))}
						</TooltipContent>
					</Tooltip>
				) : null}
			</p>
		</div>
	);
}

function RequestCard({
	request,
	onAction,
	onViewReason,
}: {
	request: CoachSessionRequest;
	onAction?: (actionId: CoachRequestActionId, request: CoachSessionRequest) => void;
	onViewReason?: () => void;
}) {
	return (
		<Card className="flex w-full flex-row items-center gap-4 rounded-[10px] border border-border bg-background p-4 shadow-none">
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-small font-semibold text-text-foreground">
						{request.title}
					</span>
					<Badge
						variant={REQUEST_BADGE_VARIANT[request.status]}
						className="rounded-lg font-semibold"
					>
						{request.statusLabel}
					</Badge>
				</div>
				<RequestMeta request={request} />
			</div>
			<RequestActions
				request={request}
				onAction={onAction}
				onViewReason={onViewReason}
			/>
		</Card>
	);
}

function SessionRequests({
	requests,
	onAction,
	onFetchReason,
}: {
	requests: CoachSessionRequest[];
	onAction: (actionId: CoachRequestActionId, request: CoachSessionRequest) => void;
	onFetchReason: (request: CoachSessionRequest) => Promise<string | null>;
}) {
	const [status, setStatus] = useState("all");
	const [employee, setEmployee] = useState("all");
	const [reasonRequest, setReasonRequest] =
		useState<CoachSessionRequest | null>(null);

	const employeeOptions = useMemo(
		() =>
			Array.from(
				new Set(
					requests.map((r) => r.clientName).filter(
						(name): name is string => Boolean(name),
					),
				),
			),
		[requests],
	);

	const filtered = useMemo(
		() =>
			requests.filter(
				(request) =>
					(status === "all" || request.status === status) &&
					(employee === "all" || request.clientName === employee),
			),
		[employee, requests, status],
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
				<h2 className="flex-1 text-base font-semibold text-muted-foreground">
					{R.title}
				</h2>
				<div className="flex flex-wrap items-center gap-3">
					<Select value={status} onValueChange={setStatus}>
						<SelectTrigger className="h-9 w-[180px]">
							<SelectValue placeholder={R.statusFilterLabel} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{R.statusFilterLabel}</SelectItem>
							{R.statusOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={employee} onValueChange={setEmployee}>
						<SelectTrigger className="h-9 w-[300px]">
							<SelectValue placeholder={R.employeeFilterLabel} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{R.employeeFilterLabel}</SelectItem>
							{employeeOptions.map((name) => (
								<SelectItem key={name} value={name}>
									{name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{filtered.length === 0 ? (
				<Card className="flex items-center justify-center rounded-[10px] border border-border bg-background p-16 shadow-none">
					<p className="text-small text-muted-foreground">
						{C.allRequestsEmpty}
					</p>
				</Card>
			) : (
				<div className="flex flex-col gap-4">
					{filtered.map((request) => (
						<RequestCard
							key={request.id}
							request={request}
							onAction={onAction}
							onViewReason={async () => {
								const reason = await onFetchReason(request);
								setReasonRequest(
									reason ? { ...request, reason } : request,
								);
							}}
						/>
					))}
				</div>
			)}

			<ViewReasonModal
				open={reasonRequest !== null}
				onOpenChange={(open) => {
					if (!open) setReasonRequest(null);
				}}
				reason={reasonRequest?.reason ?? ""}
			/>
		</div>
	);
}

export function CoachSessions() {
	const {
		upcomingSessions,
		pastSessions,
		sessionRequests,
		loading,
		notesSaving,
		fetchSessionsPage,
		fetchSessionRequests,
		saveNotes,
		acceptRequest,
		declineRequest,
		proposeSlots,
		editSlots,
		remindRequest,
		cancelRequest,
		fetchRequestReason,
	} = useCoachSessionsStore();
	const {
		quickPrep,
		actionLoading,
		fetchQuickPrep,
		scheduleSession,
		cancelSession,
		joinSession,
	} = useCoachDashboardStore();
	const [activeTab, setActiveTab] = useState<SessionsTabId>("allSessions");
	const [upcomingOpen, setUpcomingOpen] = useState(true);
	const [pastOpen, setPastOpen] = useState(true);
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [notes, setNotes] = useState("");
	const [quickPrepOpen, setQuickPrepOpen] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<CoachScheduledSession | null>(
		null,
	);

	useEffect(() => {
		void fetchSessionsPage();
		void fetchSessionRequests();
	}, [fetchSessionRequests, fetchSessionsPage]);

	useEffect(() => {
		if (!selectedId && upcomingSessions[0]) {
			setSelectedId(upcomingSessions[0].id);
			return;
		}
		if (selectedId) {
			const current = [...upcomingSessions, ...pastSessions].find(
				(session) => session.id === selectedId,
			);
			setNotes(current?.notes ?? "");
		}
	}, [pastSessions, selectedId, upcomingSessions]);

	const selectedSession = useMemo(
		() =>
			[...upcomingSessions, ...pastSessions].find((s) => s.id === selectedId) ??
			null,
		[pastSessions, selectedId, upcomingSessions],
	);

	const handleQuickPrep = useCallback(
		async (session: CoachScheduledSession) => {
			const data = await fetchQuickPrep(session.id);
			if (data) setQuickPrepOpen(true);
		},
		[fetchQuickPrep],
	);

	const handleCancelSession = useCallback(
		(session: CoachScheduledSession) => setCancelTarget(session),
		[],
	);

	const handleScheduleSession = useCallback(() => {
		setScheduleOpen(true);
	}, []);

	const handleSelectSession = useCallback((session: CoachScheduledSession) => {
		setSelectedId(session.id);
		setNotes(session.notes ?? "");
	}, []);

	const handleCloseDetail = useCallback(() => setSelectedId(null), []);

	const handleSaveNotes = useCallback(async () => {
		if (!selectedSession) return;
		await saveNotes(selectedSession.id, notes);
	}, [notes, saveNotes, selectedSession]);

	const handleJoin = useCallback(
		async (session: CoachScheduledSession) => {
			const meetingUrl = await joinSession(session.id);
			if (meetingUrl) {
				window.open(meetingUrl, "_blank", "noopener,noreferrer");
			}
		},
		[joinSession],
	);

	const handleRequestAction = useCallback(
		async (actionId: CoachRequestActionId, request: CoachSessionRequest) => {
			if (actionId === "accept") {
				await acceptRequest(request.id);
				return;
			}
			if (actionId === "remind") {
				await remindRequest(request.id);
				return;
			}
			if (actionId === "cancelRequest") {
				await cancelRequest(request.id, request.reason);
				return;
			}
			if (actionId === "proposeSlots" || actionId === "editSlots") {
				const nextSlots =
					request.tooltipLines && request.tooltipLines.length > 0
						? request.tooltipLines
						: ["Mon 10:00 AM - 10:15 AM", "Wed 2:30 PM - 2:45 PM"];
				if (actionId === "proposeSlots") {
					await proposeSlots(request.id, nextSlots);
				} else {
					await editSlots(request.id, nextSlots);
				}
				return;
			}
			if (actionId === "viewReason") {
				await fetchRequestReason(request.id);
				return;
			}
			await declineRequest(request.id);
		},
		[
			acceptRequest,
			cancelRequest,
			declineRequest,
			editSlots,
			fetchRequestReason,
			proposeSlots,
			remindRequest,
		],
	);

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
					isLoading={actionLoading}
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
								count={upcomingSessions.length}
								open={upcomingOpen}
							/>
							<CollapsibleContent className="mt-4">
								<div className="flex flex-col gap-4">
									{loading ? (
										<p className="text-small text-muted-foreground">
											Loading…
										</p>
									) : upcomingSessions.length === 0 ? (
										<p className="text-small text-muted-foreground">
											{C.emptyUpcoming}
										</p>
									) : (
										upcomingSessions.map((session) => (
											<SessionCard
												key={session.id}
												session={session}
												selected={session.id === selectedId}
												onSelect={handleSelectSession}
												onQuickPrep={handleQuickPrep}
												onCancelSession={handleCancelSession}
											/>
										))
									)}
								</div>
							</CollapsibleContent>
						</Collapsible>

						<Collapsible open={pastOpen} onOpenChange={setPastOpen}>
							<SectionHeader
								label={C.pastTitle}
								count={pastSessions.length}
								open={pastOpen}
							/>
							<CollapsibleContent className="mt-4">
								<div className="flex flex-col gap-4">
									{loading ? (
										<p className="text-small text-muted-foreground">
											Loading…
										</p>
									) : pastSessions.length === 0 ? (
										<p className="text-small text-muted-foreground">
											{C.emptyPast}
										</p>
									) : (
										pastSessions.map((session) => (
											<SessionCard
												key={session.id}
												session={session}
												selected={session.id === selectedId}
												onSelect={handleSelectSession}
												onQuickPrep={handleQuickPrep}
												onCancelSession={handleCancelSession}
											/>
										))
									)}
								</div>
							</CollapsibleContent>
						</Collapsible>
					</div>

					{/* Right panel: past sessions show the Session Notes editor
					    (node 4:20999); upcoming sessions show Session Details
					    (node 4:21082). */}
					{selectedSession?.scope === "past" ? (
						<SessionNotesPanel
							session={selectedSession}
							notes={notes}
							onNotesChange={setNotes}
							onClose={handleCloseDetail}
							onSave={handleSaveNotes}
							saving={notesSaving}
						/>
					) : (
						<SessionDetailsPanel
							session={selectedSession}
							onClose={handleCloseDetail}
							onQuickPrep={handleQuickPrep}
							onCancelSession={handleCancelSession}
						/>
					)}
				</div>
			) : (
				<SessionRequests
					requests={sessionRequests}
					onAction={handleRequestAction}
					onFetchReason={(request) => fetchRequestReason(request.id)}
				/>
			)}

			<ScheduleSessionModal
				open={scheduleOpen}
				onOpenChange={setScheduleOpen}
				onConfirm={async (values) => {
					const success = await scheduleSession(values);
					if (success) {
						await fetchSessionsPage();
					}
					return success;
				}}
			/>
			<QuickPrepModal
				open={quickPrepOpen}
				onOpenChange={setQuickPrepOpen}
				data={quickPrep ?? undefined}
				onJoin={() => {
					if (selectedSession) {
						void handleJoin(selectedSession);
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
						await fetchSessionsPage();
						setCancelTarget(null);
					}
					return success;
				}}
			/>
		</div>
	);
}
