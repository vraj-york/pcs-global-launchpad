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
		emptyUpcoming: "No upcoming sessions.",
		emptyPast: "No past sessions.",
		allRequestsEmpty: "No pending session requests.",
	},
	emptyStates: {
		sessions: "No sessions scheduled for today.",
		activity: "No recent client activity.",
	},
} as const;

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
			"Strong session on prioritisation. Client committed to a weekly planning ritual and delegating one recurring task.",
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
