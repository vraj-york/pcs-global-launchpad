// Figma layer: "View Client Details - Sessions & Notes" — node 4:20808
/*
 * SEMANTIC ANALYSIS
 * - "Session Info." tab content for a coach's client
 * - Left column: collapsible "Upcoming Sessions" + "Past Sessions" lists
 *   → useState(open) per section (Collapsible), each row has Reschedule / Join /
 *     more-actions (Quick Prep / Cancel Session) or "View Notes"
 * - Selecting a past session → highlights it and opens the Session Notes panel
 * - Right column: Session Notes editor → controlled Textarea + Close / Save Notes
 *   (loading state), empty state when no past session is selected
 */
import {
	CalendarSync,
	CalendarX2,
	ChevronDown,
	ClipboardPen,
	EllipsisVertical,
	Video,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
	COACH_DASHBOARD_CONTENT,
	COACH_PAST_SESSIONS,
	COACH_UPCOMING_SESSIONS,
	type CoachClientSession,
} from "@/const";
import { cn } from "@/lib/utils";

const C = COACH_DASHBOARD_CONTENT.sessionInfo;

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
						className={cn(
							"size-5 transition-transform",
							!open && "-rotate-90",
						)}
						aria-hidden
					/>
				</Button>
			</CollapsibleTrigger>
		</div>
	);
}

function SessionMeta({ session }: { session: CoachClientSession }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-1">
			<span className="truncate text-small font-semibold text-text-foreground">
				{session.title}
			</span>
			<span className="text-mini text-muted-foreground">
				{session.dateTime}
			</span>
		</div>
	);
}

function UpcomingSessionCard({ session }: { session: CoachClientSession }) {
	return (
		<Card className="flex w-full flex-row items-center gap-4 rounded-[10px] border border-border bg-background p-4 shadow-none">
			<SessionMeta session={session} />
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
		</Card>
	);
}

function PastSessionCard({
	session,
	selected,
	onViewNotes,
}: {
	session: CoachClientSession;
	selected: boolean;
	onViewNotes: (session: CoachClientSession) => void;
}) {
	return (
		<Card
			className={cn(
				"flex w-full flex-row items-center gap-4 rounded-[10px] border border-border bg-background p-4",
				selected
					? "border-l-4 border-info shadow-lg"
					: "shadow-none",
			)}
		>
			<SessionMeta session={session} />
			<Button
				variant="outline"
				size="sm"
				icon={ClipboardPen}
				className="shrink-0"
				onClick={() => onViewNotes(session)}
			>
				{C.viewNotes}
			</Button>
		</Card>
	);
}

export function SessionsAndNotes() {
	const [upcomingOpen, setUpcomingOpen] = useState(true);
	const [pastOpen, setPastOpen] = useState(true);
	const [selectedId, setSelectedId] = useState<string | null>(
		COACH_PAST_SESSIONS[0]?.id ?? null,
	);
	const selectedSession = useMemo(
		() => COACH_PAST_SESSIONS.find((s) => s.id === selectedId) ?? null,
		[selectedId],
	);
	const [notes, setNotes] = useState(selectedSession?.notes ?? "");
	const [saving, setSaving] = useState(false);

	const handleViewNotes = useCallback((session: CoachClientSession) => {
		setSelectedId(session.id);
		setNotes(session.notes ?? "");
	}, []);

	const handleClose = useCallback(() => {
		setSelectedId(null);
	}, []);

	const handleSave = useCallback(() => {
		setSaving(true);
		// Placeholder async action until the session-notes API is wired up.
		setTimeout(() => setSaving(false), 1000);
	}, []);

	return (
		<div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
			{/* Sessions list */}
			<div className="flex w-full flex-col gap-4 lg:w-[640px] lg:shrink-0">
				<Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
					<SectionHeader
						label={C.upcomingTitle}
						count={COACH_UPCOMING_SESSIONS.length}
						open={upcomingOpen}
					/>
					<CollapsibleContent className="mt-4">
						<div className="flex flex-col gap-4">
							{COACH_UPCOMING_SESSIONS.length === 0 ? (
								<p className="text-small text-muted-foreground">
									{C.emptyUpcoming}
								</p>
							) : (
								COACH_UPCOMING_SESSIONS.map((session) => (
									<UpcomingSessionCard key={session.id} session={session} />
								))
							)}
						</div>
					</CollapsibleContent>
				</Collapsible>

				<Collapsible open={pastOpen} onOpenChange={setPastOpen}>
					<SectionHeader
						label={C.pastTitle}
						count={COACH_PAST_SESSIONS.length}
						open={pastOpen}
					/>
					<CollapsibleContent className="mt-4">
						<div className="flex flex-col gap-4">
							{COACH_PAST_SESSIONS.length === 0 ? (
								<p className="text-small text-muted-foreground">
									{C.emptyPast}
								</p>
							) : (
								COACH_PAST_SESSIONS.map((session) => (
									<PastSessionCard
										key={session.id}
										session={session}
										selected={session.id === selectedId}
										onViewNotes={handleViewNotes}
									/>
								))
							)}
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>

			{/* Session Notes panel */}
			<Card className="flex min-w-0 flex-1 flex-col gap-0 rounded-[10px] border border-border bg-background p-0 shadow-none">
				<header className="flex h-14 shrink-0 items-center gap-1 border-b border-border p-4">
					<h3 className="flex-1 text-base font-medium text-text-secondary">
						{C.notesTitle}
					</h3>
					{selectedSession ? (
						<Button
							variant="ghost"
							size="icon-sm"
							icon={X}
							aria-label={C.close}
							onClick={handleClose}
						/>
					) : null}
				</header>

				{selectedSession ? (
					<>
						<div className="flex flex-1 flex-col p-4">
							<Textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder={C.notesPlaceholder}
								className="min-h-64 flex-1 resize-none rounded-lg border-border bg-background text-small text-text-secondary shadow-none"
							/>
						</div>
						<footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-4">
							<Button variant="outline" onClick={handleClose}>
								{C.close}
							</Button>
							<Button
								icon={ClipboardPen}
								isLoading={saving}
								onClick={handleSave}
							>
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
		</div>
	);
}
