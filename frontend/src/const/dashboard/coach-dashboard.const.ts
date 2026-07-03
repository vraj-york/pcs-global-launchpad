import coachAlexRivera from "@/assets/coach-dashboard/coach-alex-rivera.png";
import coachClaraNevada from "@/assets/coach-dashboard/coach-clara-nevada.png";
import coachEmmaThompson from "@/assets/coach-dashboard/coach-emma-thompson.png";

export type CoachSessionBadgeVariant = "blue" | "green";

export interface CoachSession {
	id: string;
	name: string;
	badge: string;
	badgeVariant: CoachSessionBadgeVariant;
	time: string;
	relativeTime: string;
	avatar?: string;
	initials?: string;
}

export interface CoachClientActivity {
	id: string;
	name: string;
	detail: string;
	timestamp: string;
	avatar?: string;
	initials?: string;
}

export interface CoachInsightStat {
	id: string;
	value: string;
	label: string;
	icon: "calendar-fold" | "users" | "hourglass";
	wide?: boolean;
}

export interface CoachAvailabilityRow {
	id: string;
	label: string;
	value: string;
}

export type CalendarEventAccent = "blue" | "warning" | "success";

export interface CoachCalendarDay {
	id: string;
	/** Weekday label, e.g. "Mon". */
	label: string;
	/** Day of month, e.g. "11". */
	date: string;
	/** Highlighted (currently selected) day column. */
	highlighted?: boolean;
}

export interface CoachCalendarEvent {
	id: string;
	title: string;
	/** 0-based column index into the visible week (Mon = 0). */
	dayIndex: number;
	/** Minutes from midnight for start/end, used to position the block. */
	startMinutes: number;
	endMinutes: number;
	accent: CalendarEventAccent;
	// Session Details (side panel)
	dateLabel: string;
	timeRange: string;
	duration: string;
	clientName: string;
	clientEmail: string;
	clientAvatar?: string;
	clientInitials?: string;
	description: string;
}

/** Month-view event accent (left border + label color). */
export type CoachCalendarMonthAccent = "error" | "success" | "warning";

export interface CoachCalendarMonthEvent {
	id: string;
	title: string;
	accent: CoachCalendarMonthAccent;
	clientName: string;
	clientInitials?: string;
	clientAvatar?: string;
	timeRange: string;
}

export interface CoachCalendarMonthDay {
	/** Day-of-month number rendered in the cell. */
	date: number;
	/** False for leading/trailing days that belong to the adjacent month. */
	inMonth: boolean;
	events?: CoachCalendarMonthEvent[];
}

export type CoachResourceAccent = "green" | "blue" | "red";

export interface CoachWelcomeHighlight {
	id: string;
	label: string;
	icon: "sparkles" | "trending-up" | "calendar-clock";
	accent: "blue" | "green" | "yellow";
}

export interface CoachLaunchUpdate {
	id: string;
	label: string;
	href: string;
}

export interface CoachClientSession {
	id: string;
	/** Session title, e.g. "Leadership Coaching". */
	title: string;
	/** Formatted date + time range, e.g. "2 May, 2026 • 9:30 AM - 9:45 AM". */
	dateTime: string;
	/** Coach notes captured for the session (past sessions). */
	notes?: string;
}

export type CoachSessionScope = "upcoming" | "past";

export type CoachRequestStatus = "new" | "proposed" | "cancelled";

export type CoachRequestActionId =
	| "cancelRequest"
	| "proposeSlots"
	| "accept"
	| "editSlots"
	| "remind"
	| "viewReason";

export interface CoachSessionRequest {
	id: string;
	title: string;
	status: CoachRequestStatus;
	/** Badge copy, e.g. "New Request". */
	statusLabel: string;
	clientName?: string;
	clientAvatar?: string;
	clientInitials?: string;
	/** Sentence after the client name (or the whole sentence when no client). */
	metaText: string;
	/** Inline underlined link label (e.g. "new time slots"). */
	linkLabel?: string;
	/** Tooltip lines shown on hovering the link. */
	tooltipLines?: string[];
	/** Cancellation reason shown in the "View Reason" modal. */
	reason?: string;
	actions: CoachRequestActionId[];
}

export interface CoachScheduledSession {
	id: string;
	/** Session title, e.g. "Leadership Coaching". */
	title: string;
	clientName: string;
	clientEmail: string;
	clientAvatar?: string;
	clientInitials?: string;
	/** Formatted date, e.g. "May 2, 2026". */
	date: string;
	/** Time range, e.g. "9:30 AM - 9:45 AM". */
	timeRange: string;
	/** Duration label, e.g. "15 min". */
	duration: string;
	description: string;
	scope: CoachSessionScope;
	/** Coach notes for the session (past sessions). */
	notes?: string;
}

export interface CoachResource {
	id: string;
	/** Bold lead-in of the label (Figma node 4:19379 heading, weight 700). */
	lead: string;
	/** Regular connector word between the lead and the link ("on" / "in"). */
	connector: string;
	/** Underlined link text. */
	linkLabel: string;
	href: string;
	icon: "book-open" | "sparkles" | "life-buoy";
	accent: CoachResourceAccent;
}

export const COACH_DASHBOARD_CONTENT = {
	breadcrumbLabel: "Dashboard",
	welcomeTitle: "Welcome, Coach!",
	welcomeSubtitle: "Manage all your coaching things at one place",
	scheduleSession: "Schedule Session",
	todaysSessions: {
		title: "Today’s Sessions",
		subtitle: "3 upcoming sessions",
		viewAll: "View All",
		reschedule: "Reschedule",
		join: "Join",
		moreActionsLabel: "More session actions",
		quickPrep: "Quick Prep",
		cancelSession: "Cancel Session",
	},
	clientActivity: {
		title: "Client Activity",
		subtitle: "Recent activities based on client’s sessions",
	},
	insight: {
		title: "This Month Insight",
	},
	availability: {
		title: "Your Availability",
		subtitle: "Manage coaching hours & availability windows.",
		manage: "Manage Availability",
	},
	resources: {
		title: "Resources",
		subtitle: "Guides and updates to help you coach with confidence.",
		emptyState: "No resources available right now.",
	},
	welcome: {
		title: "Your coaching toolkit",
		description:
			"Get up to speed on everything you need to guide your clients with confidence.",
	},
	whatLaunched: {
		title: "Explore every update",
		intro: "Each release brings new tools to your coaching workspace:",
		footnotePrefix: "Check out the",
		footnoteLink: "help center",
		footnoteHref: "/support",
		footnoteSuffix: "for the latest platform updates.",
		panelTitle: "Coaching Updates",
		panelSectionLabel: "Updates",
		panelActiveItem: "Overview",
		searchLabel: "Search updates",
		addLabel: "New update",
	},
	comingSoon: {
		title: "Be the first to try new updates",
		description:
			"We’re rolling several new coaching tools into closed beta in the coming days. Join the wait list to request early access to these features as they roll out:",
		features: [
			"AI-assisted session summaries",
			"Client progress insights",
			"Smart scheduling & reminders",
		],
		cta: "Request early access",
		ctaHref: "/support",
	},
	sessionInfo: {
		upcomingTitle: "Upcoming Sessions",
		pastTitle: "Past Sessions",
		reschedule: "Reschedule",
		join: "Join",
		viewNotes: "View Notes",
		moreActionsLabel: "More session actions",
		quickPrep: "Quick Prep",
		cancelSession: "Cancel Session",
		notesTitle: "Session Notes",
		notesPlaceholder: "Add your session notes here…",
		close: "Close",
		save: "Save Notes",
		saving: "Saving…",
		emptyUpcoming: "No upcoming sessions.",
		emptyPast: "No past sessions.",
		notesEmpty: "Select a past session to view or add its notes.",
	},
	sessionsPage: {
		breadcrumbLabel: "Sessions",
		title: "Sessions",
		subtitle:
			"Manage all requests, upcoming sessions, past notes, and follow-ups.",
		scheduleSession: "Schedule Session",
		tabs: {
			allRequests: "All Requests",
			allSessions: "All Sessions",
		},
		upcomingTitle: "Upcoming Sessions",
		pastTitle: "Past Sessions",
		reschedule: "Reschedule",
		join: "Join",
		viewNotes: "View Notes",
		quickPrep: "Quick Prep",
		cancelSession: "Cancel Session",
		moreActionsLabel: "More session actions",
		detailsTitle: "Session Details",
		notesTitle: "Session Notes",
		notesPlaceholder: "Add your session notes here…",
		save: "Save Notes",
		saving: "Saving…",
		close: "Close",
		fieldLabels: {
			title: "Title",
			date: "Date",
			time: "Time",
			duration: "Duration",
			client: "Client",
			description: "Description",
		},
		emptyDetails: "Select a session to view its details.",
		notesEmpty: "Select a past session to view or add its notes.",
		emptyUpcoming: "No upcoming sessions.",
		emptyPast: "No past sessions.",
		allRequestsEmpty: "No pending session requests.",
		requests: {
			title: "Session Requests",
			statusFilterLabel: "All Status",
			employeeFilterLabel: "All Employees",
			statusOptions: [
				{ value: "new", label: "New Request" },
				{ value: "proposed", label: "Proposed" },
				{ value: "cancelled", label: "Cancelled" },
			],
			actions: {
				cancelRequest: "Cancel Request",
				proposeSlots: "Propose Slots",
				accept: "Accept",
				editSlots: "Edit Slots",
				remind: "Remind",
				viewReason: "View Reason",
			},
			viewReasonModal: {
				title: "View Reason",
				cancel: "Cancel",
				confirm: "Okay, Understood",
			},
		},
	},
	calendarPage: {
		breadcrumbLabel: "Calendar",
		title: "Calendar",
		subtitle: "All your sessions & events at a glance",
		scheduleSession: "Schedule Session",
		monthLabel: "May 2026",
		rangeLabel: "May 11 - May 15",
		views: {
			week: "Week",
			month: "Month",
		},
		monthViewPlaceholder: "Month view is coming soon.",
		monthView: {
			weekdayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
			fullWeekdays: [
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
				"Sunday",
			],
			monthName: "May",
			year: "2026",
			// May 1, 2026 is a Friday → index 4 with Monday as the 0th weekday.
			firstWeekdayIndex: 4,
			eventScheduledSingular: "event scheduled",
			eventScheduledPlural: "events scheduled",
			noEvents: "No events scheduled",
			moreActionsLabel: "More session actions",
		},
		detailsTitle: "Session Details",
		fieldLabels: {
			title: "Title",
			time: "Time",
			sessionTime: "Session Time",
			client: "Client",
			description: "Description",
		},
		join: "Join",
		reschedule: "Reschedule",
		quickPrep: "Quick Prep",
		cancelSession: "Cancel Session",
		emptyDetails: "Select an event to see its details.",
		prevMonthAria: "Previous month",
		nextMonthAria: "Next month",
		prevRangeAria: "Previous week",
		nextRangeAria: "Next week",
	},
	rescheduleModal: {
		title: "Reschedule Session",
		description: "Re-arrange date & time to schedule the session",
		newDateLabel: "New Date",
		newDatePlaceholder: "Select a date",
		newTimeLabel: "New Time",
		newTimeTooltip: "By default meeting duration will be 15 min.",
		newTimePlaceholder: "Start time  -  End time",
		startTimeLabel: "Start time",
		endTimeLabel: "End time",
		notesLabel: "Additional Notes",
		notifyLabel: "Notify client for updated date & time via email",
		requiredError: "This field is required.",
		cancel: "Cancel",
		confirm: "Confirm Reschedule",
	},
	scheduleModal: {
		title: "Schedule Session",
		description: "Set date & time to re-arrange the session",
		sessionTitleLabel: "Session Title",
		sessionTitlePlaceholder: "Enter session title",
		dateLabel: "Date",
		datePlaceholder: "Select a date",
		timeLabel: "Time",
		timeTooltip: "By default meeting duration will be 15 min.",
		timePlaceholder: "Start time  -  End time",
		startTimeLabel: "Start time",
		endTimeLabel: "End time",
		clientLabel: "Client",
		clientPlaceholder: "Select a client",
		descriptionLabel: "Description",
		descriptionPlaceholder: "Type your description here...",
		notifyLabel: "On scheduling, client will be notified via email",
		requiredError: "This field is required.",
		cancel: "Cancel",
		confirm: "Schedule Session",
		clients: [
			{ id: "nicolas-hamilton", name: "Nicolas Hamilton" },
			{ id: "emily-johnson", name: "Emily Johnson" },
			{ id: "marcus-lee", name: "Marcus Lee" },
			{ id: "sophia-martinez", name: "Sophia Martinez" },
			{ id: "david-chen", name: "David Chen" },
		],
	},
	quickPrepModal: {
		title: "Session Quick Prep",
		description: "A quick & helpful info. to prepare you for upcoming session",
		lastSessionOnLabel: "Last Session On",
		sessionTypeLabel: "Session Type",
		clientLabel: "Client",
		lastSessionNotesLabel: "Last Session Notes",
		cancel: "Cancel",
		join: "Join Session",
		sample: {
			lastSessionOn: "Apr 28, 2026, 10:00 AM",
			sessionType: "Leadership Coaching",
			clientName: "Nicolas Hamilton",
			clientEmail: "nicolas_hamilton@email.com",
			clientInitials: "NH",
			lastSessionNotes:
				"Great progress on delegation skills. Michael struggled with letting go of control but made breakthrough realizations about team empowerment.",
		},
	},
	emptyStates: {
		sessions: "No sessions scheduled for today.",
		activity: "No recent client activity.",
	},
} as const;

/** Week grid spans 8:00 AM – 6:00 PM. */
export const COACH_CALENDAR_GRID_START_MINUTES = 8 * 60;
export const COACH_CALENDAR_GRID_END_MINUTES = 18 * 60;

export const COACH_CALENDAR_DAYS: CoachCalendarDay[] = [
	{ id: "mon", label: "Mon", date: "11" },
	{ id: "tue", label: "Tue", date: "12", highlighted: true },
	{ id: "wed", label: "Wed", date: "13" },
	{ id: "thu", label: "Thu", date: "14" },
	{ id: "fri", label: "Fri", date: "15" },
];

export const COACH_CALENDAR_EVENTS: CoachCalendarEvent[] = [
	{
		id: "cal-one-on-one",
		title: "1:1 Coaching",
		dayIndex: 1,
		startMinutes: 10 * 60,
		endMinutes: 10 * 60 + 15,
		accent: "blue",
		dateLabel: "Tuesday, May 12, 2026",
		timeRange: "10:00 AM - 10:15 AM",
		duration: "15 min",
		clientName: "Nicolas Hamilton",
		clientEmail: "nicolas.hamilton@email.com",
		clientInitials: "NH",
		description: "Weekly one-on-one coaching session for stress management.",
	},
	{
		id: "cal-communication-conflict",
		title: "Communication Conflict",
		dayIndex: 3,
		startMinutes: 12 * 60,
		endMinutes: 12 * 60 + 15,
		accent: "warning",
		dateLabel: "Thursday, May 14, 2026",
		timeRange: "12:00 PM - 12:15 PM",
		duration: "15 min",
		clientName: "Emma Thompson",
		clientEmail: "emma.thompson@email.com",
		clientInitials: "ET",
		description:
			"Session focused on resolving a recurring team communication conflict.",
	},
	{
		id: "cal-goal-review",
		title: "Goal Review",
		dayIndex: 2,
		startMinutes: 16 * 60 + 30,
		endMinutes: 16 * 60 + 45,
		accent: "success",
		dateLabel: "Wednesday, May 13, 2026",
		timeRange: "4:30 PM - 4:45 PM",
		duration: "15 min",
		clientName: "Clara Nevada",
		clientEmail: "clara.nevada@email.com",
		clientInitials: "CN",
		description: "Quarterly goal review and progress check-in.",
	},
];

/**
 * May 2026 month grid (Monday-first). May 1, 2026 falls on a Friday, so the
 * first row leads with Apr 27–30. The final Sunday cell is May 31 (the Figma
 * mock showed "1" there as a placeholder — corrected to the real date). Events
 * land on the 12th (1:1 Coaching), 13th (Goal Review) and 15th (Communication
 * Conflict), matching the design.
 */
export const COACH_CALENDAR_MONTH_WEEKS: CoachCalendarMonthDay[][] = [
	[
		{ date: 27, inMonth: false },
		{ date: 28, inMonth: false },
		{ date: 29, inMonth: false },
		{ date: 30, inMonth: false },
		{ date: 1, inMonth: true },
		{ date: 2, inMonth: true },
		{ date: 3, inMonth: true },
	],
	[
		{ date: 4, inMonth: true },
		{ date: 5, inMonth: true },
		{ date: 6, inMonth: true },
		{ date: 7, inMonth: true },
		{ date: 8, inMonth: true },
		{ date: 9, inMonth: true },
		{ date: 10, inMonth: true },
	],
	[
		{ date: 11, inMonth: true },
		{
			date: 12,
			inMonth: true,
			events: [
				{
					id: "month-one-on-one",
					title: "1:1 Coaching",
					accent: "error",
					clientName: "Nicolas Hamilton",
					clientInitials: "NH",
					timeRange: "10:00 AM - 10:15 AM",
				},
			],
		},
		{
			date: 13,
			inMonth: true,
			events: [
				{
					id: "month-goal-review",
					title: "Goal Review",
					accent: "success",
					clientName: "Clara Nevada",
					clientInitials: "CN",
					timeRange: "4:30 PM - 4:45 PM",
				},
			],
		},
		{ date: 14, inMonth: true },
		{
			date: 15,
			inMonth: true,
			events: [
				{
					id: "month-communication-conflict",
					title: "Communication Conflict",
					accent: "warning",
					clientName: "Emma Thompson",
					clientInitials: "ET",
					timeRange: "12:00 PM - 12:15 PM",
				},
			],
		},
		{ date: 16, inMonth: true },
		{ date: 17, inMonth: true },
	],
	[
		{ date: 18, inMonth: true },
		{ date: 19, inMonth: true },
		{ date: 20, inMonth: true },
		{ date: 21, inMonth: true },
		{ date: 22, inMonth: true },
		{ date: 23, inMonth: true },
		{ date: 24, inMonth: true },
	],
	[
		{ date: 25, inMonth: true },
		{ date: 26, inMonth: true },
		{ date: 27, inMonth: true },
		{ date: 28, inMonth: true },
		{ date: 29, inMonth: true },
		{ date: 30, inMonth: true },
		{ date: 31, inMonth: true },
	],
];

/** Default selected day for the month view (matches the Figma mock). */
export const COACH_CALENDAR_MONTH_SELECTED_DATE = 12;

export const COACH_SESSIONS: CoachSession[] = [
	{
		id: "session-emma-thompson",
		name: "Emma Thompson",
		badge: "Communication Conflict",
		badgeVariant: "blue",
		time: "10:00 AM",
		relativeTime: "In 40min",
		avatar: coachEmmaThompson,
	},
	{
		id: "session-clara-nevada",
		name: "Clara Nevada",
		badge: "Goal Review",
		badgeVariant: "blue",
		time: "2:00 PM",
		relativeTime: "In 4h",
		avatar: coachClaraNevada,
	},
	{
		id: "session-nicolas-hamilton",
		name: "Nicolas Hamilton",
		badge: "1:1 Coaching",
		badgeVariant: "green",
		time: "4:30 PM",
		relativeTime: "In 6h 40min",
		initials: "NH",
	},
];

export const COACH_CLIENT_ACTIVITY: CoachClientActivity[] = [
	{
		id: "activity-alex-rivera",
		name: "Alex Rivera",
		detail: "Requested a session on May 18, 2026 at 9:30 AM",
		timestamp: "1h ago",
		avatar: coachAlexRivera,
	},
	{
		id: "activity-emma-thompson",
		name: "Emma Thompson",
		detail: "Cancelled a session on Apr.",
		timestamp: "2d ago",
		avatar: coachEmmaThompson,
	},
	{
		id: "activity-james-lee",
		name: "James Lee",
		detail: "Notes Added.",
		timestamp: "05-01-2026, 9:30 PM",
		initials: "JL",
	},
];

export const COACH_INSIGHT_STATS: CoachInsightStat[] = [
	{
		id: "total-sessions",
		value: "24",
		label: "Total Sessions",
		icon: "calendar-fold",
	},
	{
		id: "active-clients",
		value: "5",
		label: "Active Clients",
		icon: "users",
	},
	{
		id: "overall-coaching-time",
		value: "12 h",
		label: "Overall Coaching Time",
		icon: "hourglass",
		wide: true,
	},
];

export const COACH_AVAILABILITY: CoachAvailabilityRow[] = [
	{ id: "days", label: "Monday - Friday", value: "9:00 AM - 5:00 PM" },
	{ id: "timezone", label: "Time Zone", value: "EST (Eastern Time)" },
	{ id: "session-length", label: "Session Length", value: "60 min" },
	{
		id: "buffer-time",
		label: "Buffer Time (In-between Sessions)",
		value: "15 min",
	},
];

export const COACH_UPCOMING_SESSIONS: CoachClientSession[] = [
	{
		id: "upcoming-leadership-coaching",
		title: "Leadership Coaching",
		dateTime: "2 May, 2026 • 9:30 AM - 9:45 AM",
	},
	{
		id: "upcoming-strategic-thinking",
		title: "Strategic Thinking",
		dateTime: "18 Apr, 2026 • 1:00 PM - 1:15 PM",
	},
];

export const COACH_PAST_SESSIONS: CoachClientSession[] = [
	{
		id: "past-strategic-thinking",
		title: "Strategic Thinking",
		dateTime: "18 Apr, 2026 • 2:30 PM - 2:45 PM",
		notes:
			"Great progress on delegation skills. Michael struggled with letting go of control but made breakthrough realizations about team empowerment. Action items: practice weekly reflection, delegate one major project.",
	},
];

export const COACH_SCHEDULED_SESSIONS: CoachScheduledSession[] = [
	{
		id: "scheduled-leadership-coaching",
		title: "Leadership Coaching",
		clientName: "Alex Rivera",
		clientEmail: "matt_henry@email.com",
		clientAvatar: coachAlexRivera,
		date: "May 2, 2026",
		timeRange: "9:30 AM - 9:45 AM",
		duration: "15 min",
		description:
			"Weekly one-on-one coaching session for leadership skill enhancement.",
		scope: "upcoming",
	},
	{
		id: "scheduled-strategic-thinking-upcoming",
		title: "Strategic Thinking",
		clientName: "Jaydon Aminoff",
		clientEmail: "jaydon_aminoff@email.com",
		clientInitials: "JA",
		date: "Apr 18, 2026",
		timeRange: "1:00 PM - 1:15 PM",
		duration: "15 min",
		description:
			"Follow-up on strategic planning goals and quarterly priorities.",
		scope: "upcoming",
	},
	{
		id: "scheduled-strategic-thinking-past",
		title: "Strategic Thinking",
		clientName: "Lydia Kenter",
		clientEmail: "lydia_kenter@email.com",
		clientInitials: "LK",
		date: "Apr 10, 2026",
		timeRange: "2:30 PM - 2:45 PM",
		duration: "15 min",
		description:
			"Reviewed decision-making frameworks and set action items for the next sprint.",
		scope: "past",
		notes:
			"Great progress on delegation skills. Michael struggled with letting go of control but made breakthrough realizations about team empowerment. Action items: practice weekly reflection, delegate one major project.",
	},
];

export const COACH_SESSION_REQUESTS: CoachSessionRequest[] = [
	{
		id: "request-strategic-thinking",
		title: "Strategic Thinking",
		status: "new",
		statusLabel: "New Request",
		clientName: "Alex Rivera",
		clientAvatar: coachAlexRivera,
		metaText: "has requested a session on 22 May, 2026 at 2:30 PM",
		actions: ["cancelRequest", "proposeSlots", "accept"],
	},
	{
		id: "request-leadership-coaching",
		title: "Leadership Coaching",
		status: "proposed",
		statusLabel: "Proposed",
		clientName: "Nicolas Hamilton",
		clientInitials: "NH",
		metaText: "has proposed ",
		linkLabel: "new time slots",
		tooltipLines: [
			"Mon 25 May, 10:00 AM - 10:15 AM",
			"Wed 27 May, 2:30 PM - 2:45 PM",
		],
		actions: ["cancelRequest", "editSlots", "remind"],
	},
	{
		id: "request-stress-management",
		title: "Stress Management",
		status: "cancelled",
		statusLabel: "Cancelled",
		metaText: "You’ve cancelled the session request of 18 May, 2026 at 11:30 AM",
		reason:
			"Due to an unexpected scheduling conflict, I’m unable to attend the session at the planned time.",
		actions: ["viewReason"],
	},
	{
		id: "request-communication-skills",
		title: "Communication Skills",
		status: "cancelled",
		statusLabel: "Cancelled",
		clientName: "Kianna Dokidis",
		clientInitials: "KD",
		metaText: "has cancelled a session request of 30 Apr, 2026 at 5:15 PM",
		reason:
			"Due to an unexpected scheduling conflict, I’m unable to attend the session at the planned time.",
		actions: ["viewReason"],
	},
];

export const COACH_LAUNCH_UPDATES: CoachLaunchUpdate[] = [
	{ id: "session-insights", label: "Session insights", href: "/support" },
	{
		id: "progress-reports",
		label: "Client progress reports",
		href: "/support",
	},
	{ id: "smart-scheduling", label: "Smart scheduling", href: "/support" },
];

export const COACH_WELCOME_HIGHLIGHTS: CoachWelcomeHighlight[] = [
	{ id: "session-summaries", label: "AI session summaries", icon: "sparkles", accent: "blue" },
	{
		id: "progress-insights",
		label: "Client progress insights",
		icon: "trending-up",
		accent: "green",
	},
	{
		id: "smart-scheduling",
		label: "Smart scheduling",
		icon: "calendar-clock",
		accent: "yellow",
	},
];

export const COACH_RESOURCES: CoachResource[] = [
	{
		id: "coach-playbook",
		lead: "Master your coaching workflow",
		connector: "in",
		linkLabel: "the Coach Playbook",
		href: "/support",
		icon: "book-open",
		accent: "green",
	},
	{
		id: "platform-updates",
		lead: "Recap the latest platform updates",
		connector: "on",
		linkLabel: "Release notes",
		href: "/support",
		icon: "sparkles",
		accent: "blue",
	},
	{
		id: "best-practices",
		lead: "Learn coaching best practices",
		connector: "in",
		linkLabel: "the Help center",
		href: "/support",
		icon: "life-buoy",
		accent: "red",
	},
];
