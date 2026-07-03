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
import { useCallback, useMemo, useState } from "react";
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
	COACH_CALENDAR_DAYS,
	COACH_CALENDAR_EVENTS,
	COACH_CALENDAR_GRID_END_MINUTES,
	COACH_CALENDAR_GRID_START_MINUTES,
	COACH_CALENDAR_MONTH_SELECTED_DATE,
	COACH_CALENDAR_MONTH_WEEKS,
	COACH_DASHBOARD_CONTENT,
	type CalendarEventAccent,
	type CoachCalendarEvent,
	type CoachCalendarMonthAccent,
	type CoachCalendarMonthDay,
	type CoachCalendarMonthEvent,
} from "@/const";
import { cn } from "@/lib/utils";

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

const MONTH_DAYS = COACH_CALENDAR_MONTH_WEEKS.flat();

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
	selectedId,
	onSelect,
}: {
	selectedId: string | null;
	onSelect: (event: CoachCalendarEvent) => void;
}) {
	return (
		<div className="min-w-0 flex-1 px-4 pt-4 pb-6">
			{/* Day headers */}
			<div className="grid" style={{ gridTemplateColumns: GRID_COLUMNS }}>
				<div />
				{COACH_CALENDAR_DAYS.map((day) => (
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
						{COACH_CALENDAR_DAYS.map((day) => (
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
					{COACH_CALENDAR_DAYS.map((day, dayIndex) => (
						<div key={day.id} className="relative">
							{COACH_CALENDAR_EVENTS.filter(
								(event) => event.dayIndex === dayIndex,
							).map((event) => {
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

function SessionDetailsPanel({ event }: { event: CoachCalendarEvent | null }) {
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
				<Button icon={Video} className="w-full">
					{C.join}
				</Button>
				<Button variant="outline" icon={CalendarSync} className="w-full">
					{C.reschedule}
				</Button>
				<Button variant="outline" icon={Zap} className="w-full">
					{C.quickPrep}
				</Button>
				<Button
					variant="outline"
					icon={CalendarX2}
					className="w-full border-border text-destructive hover:bg-destructive/10 hover:text-destructive"
				>
					{C.cancelSession}
				</Button>
			</div>
		</div>
	);
}

function MonthGrid({
	selectedDate,
	onSelectDate,
}: {
	selectedDate: number | null;
	onSelectDate: (date: number) => void;
}) {
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
				{MONTH_DAYS.map((day, index) => {
					const isSelected = day.inMonth && day.date === selectedDate;
					const isLastRow = index >= MONTH_DAYS.length - 7;
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

function MonthEventActions() {
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
				<DropdownMenuItem className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small text-text-foreground">
					<CalendarSync className="size-5" aria-hidden />
					<span>{C.reschedule}</span>
				</DropdownMenuItem>
				<DropdownMenuItem className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small text-text-foreground">
					<Zap className="size-5" aria-hidden />
					<span>{C.quickPrep}</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator className="bg-border" />
				<DropdownMenuItem
					variant="destructive"
					className="min-h-9 gap-2 rounded-md px-2 py-1.5 text-small"
				>
					<CalendarX2 className="size-5" aria-hidden />
					<span>{C.cancelSession}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function DayEventCard({ event }: { event: CoachCalendarMonthEvent }) {
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
				<Button icon={Video} size="sm" className="flex-1">
					{C.join}
				</Button>
				<MonthEventActions />
			</div>
		</Card>
	);
}

function DayEventsPanel({
	dateLabel,
	events,
}: {
	dateLabel: string;
	events: CoachCalendarMonthEvent[];
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
					events.map((event) => <DayEventCard key={event.id} event={event} />)
				)}
			</div>
		</div>
	);
}

export function CoachCalendar() {
	const [view, setView] = useState<CalendarViewId>("week");
	const [scheduling, setScheduling] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(
		COACH_CALENDAR_EVENTS[0]?.id ?? null,
	);
	const [selectedDate, setSelectedDate] = useState<number>(
		COACH_CALENDAR_MONTH_SELECTED_DATE,
	);

	const selectedEvent = useMemo(
		() => COACH_CALENDAR_EVENTS.find((e) => e.id === selectedId) ?? null,
		[selectedId],
	);

	const selectedDay = useMemo<CoachCalendarMonthDay | null>(
		() =>
			MONTH_DAYS.find((d) => d.inMonth && d.date === selectedDate) ?? null,
		[selectedDate],
	);

	const selectedDayLabel = useMemo(() => {
		const weekdayIndex = (M.firstWeekdayIndex + (selectedDate - 1)) % 7;
		return `${M.fullWeekdays[weekdayIndex]}, ${M.monthName} ${selectedDate}, ${M.year}`;
	}, [selectedDate]);

	const handleScheduleSession = useCallback(() => {
		setScheduling(true);
		// Placeholder async action until the scheduling flow API is wired up.
		setTimeout(() => setScheduling(false), 1000);
	}, []);

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
					isLoading={scheduling}
					onClick={handleScheduleSession}
					className="shrink-0"
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
						/>
						<span className="text-heading-4 font-semibold text-text-foreground">
							{C.monthLabel}
						</span>
						<Button
							variant="outline"
							size="icon-sm"
							icon={ChevronRight}
							aria-label={C.nextMonthAria}
							className="rounded-[10px]"
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
								/>
								<span className="text-small font-semibold text-text-foreground">
									{C.rangeLabel}
								</span>
								<Button
									variant="ghost"
									size="icon-sm"
									icon={ChevronRight}
									aria-label={C.nextRangeAria}
									className="bg-background hover:bg-background/70"
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
				{view === "week" ? (
					<div className="flex flex-col lg:flex-row lg:items-stretch">
						<WeekGrid
							selectedId={selectedId}
							onSelect={(event) => setSelectedId(event.id)}
						/>
						<SessionDetailsPanel event={selectedEvent} />
					</div>
				) : (
					<div className="flex flex-col lg:flex-row lg:items-stretch">
						<MonthGrid
							selectedDate={selectedDate}
							onSelectDate={setSelectedDate}
						/>
						<DayEventsPanel
							dateLabel={selectedDayLabel}
							events={selectedDay?.events ?? []}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
