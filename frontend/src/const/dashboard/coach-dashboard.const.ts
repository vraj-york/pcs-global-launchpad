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
