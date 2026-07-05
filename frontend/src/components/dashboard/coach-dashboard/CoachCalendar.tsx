// Figma layer: "Calendar - Week View" (node 4:21292) / "Calendar - Month View" (node 4:21562)
/*
 * SEMANTIC ANALYSIS
 * Route: /coach-calendar (rendered inside AppLayout — sidebar + header shell)
 * - Page title + "Schedule Session" primary button → action button
 * - Calendar card header: month nav (prev/next + "May 2026"), a week-range
 *   pill (week view only), and a Week/Month segmented toggle → useState(view)
 * - Week view (node 4:21292): time gutter (8 AM–6 PM) + 5 weekday columns with
 *   an event overlay; each event block is positioned by its start time and is
 *   clickable → drives the "Session Details" side panel (Title / Time / Session
 *   Time / Client / Description + Join / Reschedule / Quick Prep / Cancel Session)
 * - Month view (node 4:21562): 7-column month grid (Mon-first) with per-day
 *   event chips; selecting a day → useState(selectedDate) drives a side panel
 *   ("<Weekday>, May D, 2026" + "N event(s) scheduled") listing that day's
 *   event cards (title / client / time + Join + more-actions dropdown:
 *   Reschedule / Quick Prep / Cancel Session)
 */
import {
	CalendarSync,
	CalendarX2,
	ChevronLeft,
	ChevronRight,
	Clock,
	EllipsisVertical,
	Plus,
	Video,
	Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	COACH_CALENDAR_GRID_END_MINUTES,
	COACH_CALENDAR_GRID_START_MINUTES,
	COACH_DASHBOARD_CONTENT,
} from "@/const";
import { cn } from "@/lib/utils";
import { useCoachCalendarStore, useCoachDashboardStore } from "@/store";
import type {
	CalendarEventAccent,
	CoachCalendarDay,
	CoachCalendarEvent,
	CoachCalendarMonthAccent,
	CoachCalendarMonthDay,
	CoachCalendarMonthEvent,
} from "@/types";
import { CancelSessionModal } from "./CancelSessionModal";
import { QuickPrepModal } from "./QuickPrepModal";
import { RescheduleSessionModal } from "./RescheduleSessionModal";
import { ScheduleSessionModal } from "./ScheduleSessionModal";

const C = COACH_DASHBOARD_CONTENT.calendarPage;
const M = C.monthView;

type CalendarViewId = "week" | "month";

const MONTH_EVENT_ACCENT: Record<
	CoachCalendarMonthAccent,
	{ border: string; text: string }
> = {
	error: { border: "border-destructive", text: "text-destructive" },
	success: { border: "border-success", text: "text-success" },
	warning: { border: "border-warning", text: "text-warning" },
};

const HOUR_HEIGHT = 56;
const GRID_COLUMNS = "3.5rem repeat(5, minmax(0, 1fr))";

const HOURS = Array.from(
	{ length: (COACH_CALENDAR_GRID_END_MINUTES - COACH_CALENDAR_GRID_START_MINUTES) / 60 + 1 },
	(_, i) => COACH_CALENDAR_GRID_START_MINUTES / 60 + i,
);

const EVENT_ACCENT: Record<CalendarEventAccent, string> = {
	blue: "bg-info text-background border-info",
	warning: "bg-secondary text-warning border-l-[3px] border-warning",
	success: "bg-secondary text-success border-l-[3px] border-success",
};

function formatHour(hour: number): string {
	const period = hour >= 12 ? "PM" : "AM";
	const normalized = hour % 12 === 0 ? 12 : hour % 12;
	return `${normalized}:00 ${period}`;
}

function formatDateParam(date: Date) {
	return date.toISOString().slice(0, 10);
}

function startOfWeekMonday(date: Date) {
	const next = new Date(date);
	const day = next.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	next.setDate(next.getDate() + diff);
	next.setHours(0, 0, 0, 0);
	return next;
}

function startOfMonth(date: Date) {
	const next = new Date(date.getFullYear(), date.getMonth(), 1);
	next.setHours(0, 0, 0, 0);
	return next;
}

function addDays(date: Date, amount: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + amount);
	return next;
}

function addMonths(date: Date, amount: number) {
	const next = new Date(date);
	next.setMonth(next.getMonth() + amount);
	return next;
}

function ClientAvatar({
	event,
	size = "lg",
}: {
	event: CoachCalendarEvent;
	size?: "sm" | "lg";
}) {
	return (
		<Avatar size={size}>
			{event.clientAvatar ? (
				<AvatarImage src={event.clientAvatar} alt={event.clientName} />
			) : null}
			<AvatarFallback className="bg-muted font-semibold text-text-foreground">
				{event.clientInitials}
			</AvatarFallback>
		</Avatar>
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

function WeekGrid({
	days,
	events,
	selectedId,
	onSelect,
}: {
	days: CoachCalendarDay[];
	events: CoachCalendarEvent[];
	selectedId: string | null;
	onSelect: (event: CoachCalendarEvent) => void;
}) {
	return (
		<div className="min-w-0 flex-1 px-4 pt-4 pb-6">
			{/* Day headers */}
			<div className="grid" style={{ gridTemplateColumns: GRID_COLUMNS }}>
				<div />
				{days.map((day) => (
					<div
						key={day.id}
						className={cn(
							"flex h-12 items-center justify-center rounded-lg text-small font-semibold text-text-foreground",
							day.highlighted && "bg-info-bg text-brand-primary",
						)}
					>
						{day.label} {day.date}
					</div>
				))}
			</div>

			{/* Time grid + event overlay */}
			<div className="relative mt-2">
				{HOURS.map((hour) => (
					<div
						key={hour}
						className="grid"
						style={{ gridTemplateColumns: GRID_COLUMNS, height: HOUR_HEIGHT }}
					>
						<div className="relative -top-2 pr-2 text-right text-mini text-muted-foreground">
							{formatHour(hour)}
						</div>
						{days.map((day) => (
							<div key={day.id} className="border-t border-l border-border" />
						))}
					</div>
				))}

				{/* Events */}
				<div
					className="pointer-events-none absolute inset-0 grid"
					style={{ gridTemplateColumns: GRID_COLUMNS }}
				>
					<div />
					{days.map((day, dayIndex) => (
						<div key={day.id} className="relative">
							{events
								.filter((event) => event.dayIndex === dayIndex)
								.map((event) => {
								const top =
									((event.startMinutes - COACH_CALENDAR_GRID_START_MINUTES) /
										60) *
									HOUR_HEIGHT;
								return (
									<button
										key={event.id}
										type="button"
										onClick={() => onSelect(event)}
										style={{ top }}
										className={cn(
											"pointer-events-auto absolute right-1 left-1 flex cursor-pointer flex-col justify-center gap-1 rounded px-2 py-1 text-left text-mini font-semibold shadow-lg outline-none",
											EVENT_ACCENT[event.accent],
											selectedId === event.id && "ring-2 ring-ring",
										)}
									>
										<span className="truncate">{event.title}</span>
									</button>
								);
								})}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function SessionDetailsPanel({
	event,
	onJoin,
	onReschedule,
	onQuickPrep,
	onCancelSession,
}: {
	event: CoachCalendarEvent | null;
	onJoin?: () => void;
	onReschedule?: () => void;
	onQuickPrep?: () => void;
	onCancelSession?: () => void;
}) {
	if (!event) {
		return (
			<div className="flex min-w-0 flex-1 items-center justify-center border-l border-border p-6">
				<p className="text-small text-muted-foreground">{C.emptyDetails}</p>
			</div>
		);
	}

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-8 border-l border-border p-6">
			<div className="flex flex-col gap-1.5">
				<h3 className="text-heading-4 font-semibold text-text-foreground">
					{C.detailsTitle}
				</h3>
				<p className="text-small text-text-secondary">{event.dateLabel}</p>
			</div>

			<div className="flex flex-col gap-6">
				<DetailField label={C.fieldLabels.title} value={event.title} />
				<DetailField label={C.fieldLabels.time} value={event.timeRange} />
				<DetailField
					label={C.fieldLabels.sessionTime}
					value={event.duration}
				/>
				<div className="flex flex-col gap-1">
					<span className="text-mini text-muted-foreground">
						{C.fieldLabels.client}
					</span>
					<div className="flex items-center gap-2.5">
						<ClientAvatar event={event} size="lg" />
						<div className="flex min-w-0 flex-col">
							<span className="truncate text-small font-semibold text-text-foreground">
								{event.clientName}
							</span>
							<span className="truncate text-mini text-muted-foreground">
								{event.clientEmail}
							</span>
						</div>
					</div>
				</div>
				<DetailField
					label={C.fieldLabels.description}
					value={event.description}
				/>
			</div>

			<div className="flex flex-col gap-3">
				<Button icon={Video} className="w-full" onClick={onJoin}>
					{C.join}
				</Button>
				<Button
					variant="outline"
					icon={CalendarSync}
					className="w-full"
					onClick={onReschedule}
				>
					{C.reschedule}
				</Button>
				<Button
					variant="outline"
					icon={Zap}
					className="w-full"
					onClick={onQuickPrep}
				>
					{C.quickPrep}
				</Button>
				<Button
					variant="outline"
					icon={CalendarX2}
					className="w-full border-border text-destructive hover:bg-destructive/10 hover:text-destructive"
					onClick={onCancelSession}
				>
					{C.cancelSession}
				</Button>
			</div>
		</div>
	);
}

function MonthGrid({
	weeks,
	selectedDate,
	onSelectDate,
}: {
	weeks: CoachCalendarMonthDay[][];
	selectedDate: number | null;
	onSelectDate: (date: number) => void;
}) {
	const days = useMemo(() => weeks.flat(), [weeks]);
	return (
		<div className="min-w-0 flex-1 px-4 pt-4 pb-6">
			{/* Weekday headers */}
			<div className="grid grid-cols-7">
				{M.weekdayLabels.map((label) => (
					<div
						key={label}
						className="flex h-12 items-center justify-center text-small font-semibold text-text-foreground"
					>
						{label}
					</div>
				))}
			</div>

			{/* Day cells */}
			<div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border">
				{days.map((day, index) => {
					const isSelected = day.inMonth && day.date === selectedDate;
					const isLastRow = index >= days.length - 7;
					const isLastCol = (index + 1) % 7 === 0;
					return (
						<button
							key={`${day.date}-${index}`}
							type="button"
							disabled={!day.inMonth}
							onClick={() => onSelectDate(day.date)}
							className={cn(
								"flex min-h-[120px] flex-col items-stretch gap-1 border-border p-3 text-left outline-none",
								!isLastCol && "border-r",
								!isLastRow && "border-b",
								isSelected ? "bg-info-bg" : "bg-background",
								day.inMonth ? "cursor-pointer" : "cursor-default",
							)}
						>
							<span
								className={cn(
									"text-small",
									isSelected
										? "font-semibold text-brand-primary"
										: day.inMonth
											? "font-semibold text-text-foreground"
											: "font-normal text-muted-foreground",
								)}
							>
								{day.date}
							</span>
							{day.events?.map((event) => {
								const accent = MONTH_EVENT_ACCENT[event.accent];
								return (
									<span
										key={event.id}
										className={cn(
											"truncate rounded border-l-[3px] py-1 pr-1.5 pl-2 text-mini font-semibold shadow-sm",
											accent.border,
											accent.text,
											isSelected ? "bg-background" : "bg-secondary",
										)}
									>
										{event.title}
									</span>
								);
							})}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function MonthEventActions({
	onReschedule,
	onQuickPrep,
	onCancelSession,
}: {
	onReschedule?: () => void;
	onQuickPrep?: () => void;
	onCancelSession?: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="icon-sm"
					icon={EllipsisVertical}
					aria-label={M.moreActionsLabel}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="min-w-40 rounded-lg border border-border bg-background p-0.5 shadow-xl"
			>
				<DropdownMenuItem
					onSelect={onReschedule}
					className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small text-text-foreground"
				>
					<CalendarSync className="size-5" aria-hidden />
					<span>{C.reschedule}</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={onQuickPrep}
					className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small text-text-foreground"
				>
					<Zap className="size-5" aria-hidden />
					<span>{C.quickPrep}</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator className="bg-border" />
				<DropdownMenuItem
					variant="destructive"
					onSelect={onCancelSession}
					className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small"
				>
					<CalendarX2 className="size-5" aria-hidden />
					<span>{C.cancelSession}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function DayEventCard({
	event,
	onJoin,
	onReschedule,
	onQuickPrep,
	onCancelSession,
}: {
	event: CoachCalendarMonthEvent;
	onJoin?: () => void;
	onReschedule?: () => void;
	onQuickPrep?: () => void;
	onCancelSession?: () => void;
}) {
	return (
		<Card className="flex flex-col gap-6 rounded-xl border border-border bg-background p-4 shadow-none">
			<div className="flex flex-col gap-2">
				<h4 className="text-base font-semibold text-text-foreground">
					{event.title}
				</h4>
				<div className="flex items-center gap-1.5">
					<Avatar size="sm" className="size-5">
						{event.clientAvatar ? (
							<AvatarImage src={event.clientAvatar} alt={event.clientName} />
						) : null}
						<AvatarFallback className="bg-muted text-[8px] font-semibold text-text-foreground">
							{event.clientInitials}
						</AvatarFallback>
					</Avatar>
					<span className="text-mini text-text-secondary">
						{event.clientName}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<Clock className="size-3.5 text-muted-foreground" aria-hidden />
					<span className="text-mini text-text-secondary">
						{event.timeRange}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-1.5">
				<Button icon={Video} size="sm" className="flex-1" onClick={onJoin}>
					{C.join}
				</Button>
				<MonthEventActions
					onReschedule={onReschedule}
					onQuickPrep={onQuickPrep}
					onCancelSession={onCancelSession}
				/>
			</div>
		</Card>
	);
}

function DayEventsPanel({
	dateLabel,
	events,
	onJoin,
	onReschedule,
	onQuickPrep,
	onCancelSession,
}: {
	dateLabel: string;
	events: CoachCalendarMonthEvent[];
	onJoin?: (event: CoachCalendarMonthEvent) => void;
	onReschedule?: (event: CoachCalendarMonthEvent) => void;
	onQuickPrep?: (event: CoachCalendarMonthEvent) => void;
	onCancelSession?: (event: CoachCalendarMonthEvent) => void;
}) {
	const count = events.length;
	const countLabel =
		count === 0
			? M.noEvents
			: `${count} ${count === 1 ? M.eventScheduledSingular : M.eventScheduledPlural}`;
	return (
		<div className="flex w-full flex-col border-t border-border lg:w-[272px] lg:shrink-0 lg:border-t-0 lg:border-l">
			<div className="flex flex-col gap-1.5 px-6 pt-6 pb-4">
				<h3 className="text-base font-semibold text-text-foreground">
					{dateLabel}
				</h3>
				<p className="text-small text-muted-foreground">{countLabel}</p>
			</div>
			<div className="flex flex-1 flex-col gap-2.5 bg-secondary p-4">
				{count === 0 ? (
					<div className="flex flex-1 items-center justify-center">
						<p className="text-small text-muted-foreground">{M.noEvents}</p>
					</div>
				) : (
					events.map((event) => (
						<DayEventCard
							key={event.id}
							event={event}
							onJoin={() => onJoin?.(event)}
							onReschedule={() => onReschedule?.(event)}
							onQuickPrep={() => onQuickPrep?.(event)}
							onCancelSession={() => onCancelSession?.(event)}
						/>
					))
				)}
			</div>
		</div>
	);
}

export function CoachCalendar() {
	const {
		weekDays,
		weekEvents,
		monthLabel,
		monthWeeks,
		selectedDate,
		loading,
		fetchCalendar,
		setSelectedDate,
	} = useCoachCalendarStore();
	const {
		quickPrep,
		actionLoading,
		fetchQuickPrep,
		scheduleSession,
		rescheduleSession,
		cancelSession,
		joinSession,
	} = useCoachDashboardStore();
	const [view, setView] = useState<CalendarViewId>("week");
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [cursorStart, setCursorStart] = useState(() => startOfWeekMonday(new Date()));
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [rescheduleTarget, setRescheduleTarget] =
		useState<{ id: string; description?: string } | null>(null);
	const [quickPrepOpen, setQuickPrepOpen] = useState(false);
	const [quickPrepTargetId, setQuickPrepTargetId] = useState<string | null>(null);
	const [cancelTarget, setCancelTarget] = useState<{ id: string } | null>(null);

	const fetchStart = useMemo(
		() =>
			view === "week"
				? startOfWeekMonday(cursorStart)
				: startOfMonth(cursorStart),
		[view, cursorStart],
	);

	useEffect(() => {
		void fetchCalendar(view, formatDateParam(fetchStart));
	}, [fetchCalendar, fetchStart, view]);

	useEffect(() => {
		if (view !== "week") return;
		if (!selectedId && weekEvents[0]) {
			setSelectedId(weekEvents[0].id);
			return;
		}
		if (selectedId && !weekEvents.some((event) => event.id === selectedId)) {
			setSelectedId(weekEvents[0]?.id ?? null);
		}
	}, [selectedId, view, weekEvents]);

	const selectedEvent = useMemo(
		() => weekEvents.find((e) => e.id === selectedId) ?? null,
		[selectedId, weekEvents],
	);

	const monthDays = useMemo(() => monthWeeks.flat(), [monthWeeks]);
	const selectedDay = useMemo<CoachCalendarMonthDay | null>(
		() => monthDays.find((d) => d.inMonth && d.date === selectedDate) ?? null,
		[monthDays, selectedDate],
	);

	const selectedDayLabel = useMemo(() => {
		if (!selectedDate || !monthLabel) return "";
		const selected = monthDays.find(
			(day) => day.inMonth && day.date === selectedDate,
		);
		if (!selected) return "";
		const monthDate = new Date(fetchStart.getFullYear(), fetchStart.getMonth(), selectedDate);
		return monthDate.toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		});
	}, [fetchStart, monthDays, monthLabel, selectedDate]);

	const currentMonthLabel =
		view === "month"
			? monthLabel
			: fetchStart.toLocaleDateString("en-US", {
					month: "long",
					year: "numeric",
				});

	const weekRangeLabel = useMemo(() => {
		if (weekDays.length === 0) return C.rangeLabel;
		const first = weekDays[0];
		const last = weekDays[weekDays.length - 1];
		return `${first.label} ${first.date} - ${last.label} ${last.date}`;
	}, [weekDays]);

	const shiftCalendar = (direction: -1 | 1) => {
		setCursorStart((current) =>
			view === "week" ? addDays(current, direction * 7) : addMonths(current, direction),
		);
	};

	const handleQuickPrep = async (sessionId: string) => {
		const data = await fetchQuickPrep(sessionId);
		if (data) {
			setQuickPrepTargetId(sessionId);
			setQuickPrepOpen(true);
		}
	};

	const handleJoin = async (sessionId: string) => {
		const meetingUrl = await joinSession(sessionId);
		if (meetingUrl) {
			window.open(meetingUrl, "_blank", "noopener,noreferrer");
		}
	};

	const views: { id: CalendarViewId; label: string }[] = [
		{ id: "week", label: C.views.week },
		{ id: "month", label: C.views.month },
	];

	return (
		<div className="flex flex-col gap-6">
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
					onClick={() => setScheduleOpen(true)}
					className="shrink-0"
					isLoading={actionLoading}
				>
					{C.scheduleSession}
				</Button>
			</div>

			{/* Calendar card */}
			<div className="flex flex-col rounded-2xl bg-background">
				{/* Card header */}
				<div className="flex flex-col gap-4 border-b border-border py-4 pr-4 pl-6 lg:flex-row lg:items-center lg:justify-between">
					{/* Month navigation */}
					<div className="flex w-[220px] items-center justify-between">
						<Button
							variant="outline"
							size="icon-sm"
							icon={ChevronLeft}
							aria-label={C.prevMonthAria}
							className="rounded-[10px]"
							onClick={() => shiftCalendar(-1)}
						/>
						<span className="text-heading-4 font-semibold text-text-foreground">
							{currentMonthLabel}
						</span>
						<Button
							variant="outline"
							size="icon-sm"
							icon={ChevronRight}
							aria-label={C.nextMonthAria}
							className="rounded-[10px]"
							onClick={() => shiftCalendar(1)}
						/>
					</div>

					{/* Range + view toggle */}
					<div className="flex flex-wrap items-center gap-2.5">
						{view === "week" ? (
							<div className="flex h-10 w-[250px] items-center justify-between rounded-xl bg-secondary p-1">
								<Button
									variant="ghost"
									size="icon-sm"
									icon={ChevronLeft}
									aria-label={C.prevRangeAria}
									className="bg-background hover:bg-background/70"
									onClick={() => shiftCalendar(-1)}
								/>
								<span className="text-small font-semibold text-text-foreground">
									{weekRangeLabel}
								</span>
								<Button
									variant="ghost"
									size="icon-sm"
									icon={ChevronRight}
									aria-label={C.nextRangeAria}
									className="bg-background hover:bg-background/70"
									onClick={() => shiftCalendar(1)}
								/>
							</div>
						) : null}

						<div className="flex h-10 items-center gap-2 rounded-xl bg-secondary p-1">
							{views.map((v) => (
								<button
									key={v.id}
									type="button"
									onClick={() => setView(v.id)}
									className={cn(
										"inline-flex h-8 cursor-pointer items-center justify-center rounded-lg px-3 text-small font-semibold transition-colors",
										view === v.id
											? "bg-background text-brand-primary"
											: "bg-transparent text-text-secondary hover:text-text-foreground",
									)}
								>
									{v.label}
								</button>
							))}
						</div>
					</div>
				</div>

				{/* Body */}
				{loading ? (
					<div className="flex min-h-80 items-center justify-center p-6">
						<p className="text-small text-muted-foreground">Loading…</p>
					</div>
				) : view === "week" ? (
					<div className="flex flex-col lg:flex-row lg:items-stretch">
						<WeekGrid
							days={weekDays}
							events={weekEvents}
							selectedId={selectedId}
							onSelect={(event) => setSelectedId(event.id)}
						/>
						<SessionDetailsPanel
							event={selectedEvent}
							onJoin={() => {
								if (selectedEvent) void handleJoin(selectedEvent.id);
							}}
							onReschedule={() => {
								if (selectedEvent) {
									setRescheduleTarget({
										id: selectedEvent.id,
										description: selectedEvent.description,
									});
								}
							}}
							onQuickPrep={() => {
								if (selectedEvent) void handleQuickPrep(selectedEvent.id);
							}}
							onCancelSession={() => {
								if (selectedEvent) setCancelTarget({ id: selectedEvent.id });
							}}
						/>
					</div>
				) : (
					<div className="flex flex-col lg:flex-row lg:items-stretch">
						<MonthGrid
							weeks={monthWeeks}
							selectedDate={selectedDate}
							onSelectDate={setSelectedDate}
						/>
						<DayEventsPanel
							dateLabel={selectedDayLabel}
							events={selectedDay?.events ?? []}
							onJoin={(event) => {
								void handleJoin(event.id);
							}}
							onReschedule={(event) => {
								setRescheduleTarget({ id: event.id });
							}}
							onQuickPrep={(event) => {
								void handleQuickPrep(event.id);
							}}
							onCancelSession={(event) => setCancelTarget({ id: event.id })}
						/>
					</div>
				)}
			</div>

			<ScheduleSessionModal
				open={scheduleOpen}
				onOpenChange={setScheduleOpen}
				onConfirm={async (values) => {
					const success = await scheduleSession(values);
					if (success) {
						await fetchCalendar(view, formatDateParam(fetchStart));
					}
					return success;
				}}
			/>

			<RescheduleSessionModal
				open={rescheduleTarget !== null}
				onOpenChange={(open) => {
					if (!open) setRescheduleTarget(null);
				}}
				defaultNotes={rescheduleTarget?.description}
				onConfirm={async (values) => {
					if (!rescheduleTarget) return false;
					const success = await rescheduleSession(rescheduleTarget.id, values);
					if (success) {
						await fetchCalendar(view, formatDateParam(fetchStart));
						setRescheduleTarget(null);
					}
					return success;
				}}
			/>

			<QuickPrepModal
				open={quickPrepOpen}
				onOpenChange={(open) => {
					setQuickPrepOpen(open);
					if (!open) setQuickPrepTargetId(null);
				}}
				data={quickPrep ?? undefined}
				onJoin={() => {
					if (quickPrepTargetId) {
						void handleJoin(quickPrepTargetId);
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
						await fetchCalendar(view, formatDateParam(fetchStart));
						setCancelTarget(null);
					}
					return success;
				}}
			/>
		</div>
	);
}
