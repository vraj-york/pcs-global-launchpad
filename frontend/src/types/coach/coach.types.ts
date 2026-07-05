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

export interface CoachAvailabilityTimeRange {
	start: string;
	end: string;
}

export interface CoachAvailabilitySettingsDay {
	id: string;
	label: string;
	enabled: boolean;
	ranges: CoachAvailabilityTimeRange[];
}

export interface CoachAvailabilityPayload {
	timezone: string;
	defaultSessionLengthMins: number;
	bufferMins: number;
	summary: CoachAvailabilityRow[];
	days: CoachAvailabilitySettingsDay[];
}

export type CalendarEventAccent = "blue" | "warning" | "success";

export interface CoachCalendarDay {
	id: string;
	label: string;
	date: string;
	highlighted?: boolean;
}

export interface CoachCalendarEvent {
	id: string;
	title: string;
	dayIndex: number;
	startMinutes: number;
	endMinutes: number;
	accent: CalendarEventAccent;
	dateLabel: string;
	timeRange: string;
	duration: string;
	clientName: string;
	clientEmail: string;
	clientAvatar?: string;
	clientInitials?: string;
	description: string;
}

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
	date: number;
	inMonth: boolean;
	events?: CoachCalendarMonthEvent[];
}

export interface CoachCalendarWeekResponse {
	view: "week";
	days: CoachCalendarDay[];
	events: CoachCalendarEvent[];
}

export interface CoachCalendarMonthResponse {
	view: "month";
	monthLabel: string;
	weeks: CoachCalendarMonthDay[][];
	selectedDate: number;
}

export type CoachCalendarResponse =
	| CoachCalendarWeekResponse
	| CoachCalendarMonthResponse;

export interface CoachClientOption {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
	initials: string;
}

export interface CoachQuickPrepData {
	lastSessionOn: string;
	sessionType: string;
	clientName: string;
	clientEmail: string;
	clientInitials?: string;
	clientAvatar?: string;
	lastSessionNotes: string;
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
	statusLabel: string;
	clientName?: string;
	clientAvatar?: string;
	clientInitials?: string;
	metaText: string;
	linkLabel?: string;
	tooltipLines?: string[];
	reason?: string;
	actions: CoachRequestActionId[];
}

export interface CoachScheduledSession {
	id: string;
	title: string;
	clientName: string;
	clientEmail: string;
	clientAvatar?: string;
	clientInitials?: string;
	date: string;
	timeRange: string;
	duration: string;
	description: string;
	scope: CoachSessionScope;
	notes?: string;
}

export interface CoachClientSession {
	id: string;
	title: string;
	dateTime: string;
	notes?: string;
}

export interface CoachResource {
	id: string;
	lead: string;
	connector: string;
	linkLabel: string;
	href: string;
	icon: "book-open" | "sparkles" | "life-buoy";
	accent: "green" | "blue" | "red";
}

export interface CoachLaunchUpdate {
	id: string;
	label: string;
	href: string;
}

export interface CoachBetaFeature {
	id: string;
	featureKey: string;
	title: string;
	description?: string | null;
}

export interface CoachIntegrationStatus {
	provider: string;
	connected: boolean;
	accountEmail: string | null;
	message: string;
}

export interface CoachDashboardSummaryResponse {
	sessions: CoachSession[];
	activity: CoachClientActivity[];
	insight: CoachInsightStat[];
	availability: CoachAvailabilityPayload;
}
