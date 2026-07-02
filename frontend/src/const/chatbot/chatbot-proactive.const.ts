/**
 * Employee proactive empty-state: timings, API wiring, UI class bundles, copy.
 * Single source for proactive-related frontend constants (see code review).
 */

/** Canonical grouping for proactive timing (ms). Flat exports below stay stable for imports. */
export const CHATBOT_PROACTIVE_EMPLOYEE_TIMING_MS = {
	firstIdle: 4500,
	secondIdle: 4500,
	cardPressFeedback: 280,
	apiRequestTimeout: 20000,
} as const;

export const CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_FIRST =
	CHATBOT_PROACTIVE_EMPLOYEE_TIMING_MS.firstIdle;

export const CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_SECOND =
	CHATBOT_PROACTIVE_EMPLOYEE_TIMING_MS.secondIdle;

export const CHATBOT_PROACTIVE_CARD_PRESS_DURATION_MS =
	CHATBOT_PROACTIVE_EMPLOYEE_TIMING_MS.cardPressFeedback;

export const CHATBOT_PROACTIVE_API_REQUEST_TIMEOUT_MS =
	CHATBOT_PROACTIVE_EMPLOYEE_TIMING_MS.apiRequestTimeout;

/**
 * Temporary source switch for proactive employee content/timing.
 * - "mock": use frontend constants only (no network dependency)
 * - "api" : fetch from `/proactive/employee` and fallback to constants on failure
 */
export const CHATBOT_PROACTIVE_EMPLOYEE_DATA_SOURCE = (
	import.meta.env.VITE_CHATBOT_PROACTIVE_EMPLOYEE_DATA_SOURCE ?? "mock"
).toLowerCase();

/** `GET` path under `VITE_CHATBOT_API_URL`. */
export const CHATBOT_PROACTIVE_EMPLOYEE_API_PATH =
	"/proactive/employee" as const;

/**
 * Sentinel for proactive idle-hook `sessionKey` when no thread exists yet.
 */
export const CHATBOT_PROACTIVE_EMPTY_THREAD_SESSION_KEY = "__new__" as const;

/**
 * Shown in API layer when proactive payload fetch fails — page falls back to const copy.
 */
export const CHATBOT_PROACTIVE_API_LOAD_FAILED_MESSAGE =
	"Failed to load proactive chatbot data.";

export const CHATBOT_PROACTIVE_CARD_ARIA_SEPARATOR = ". ";

export function proactiveEmployeeCardAriaLabel(
	primary: string,
	secondary: string,
): string {
	return `${primary}${CHATBOT_PROACTIVE_CARD_ARIA_SEPARATOR}${secondary}`;
}

/**
 * Mock personalization until employee / peer assessment APIs exist.
 * Replace `displayName` (and optional profile fields) with API-backed data.
 */
export const CHATBOT_MOCK_EMPLOYEE_PROFILE = {
	displayName: "User",
} as const;

/**
 * Copy and starter queries for the employee proactive empty state (new chat →
 * idle nudges). Submit strings are sent as the user message.
 */
export const CHATBOT_PROACTIVE_EMPLOYEE_CONTENT = {
	bispysChoiceLabel: "BISPY'S CHOICE",
	welcomeTitle: (firstName: string) => `Welcome, ${firstName}!`,
	welcomeSubtitle: "Ready to understand how you really work?",
	cardTeamDynamicsTitle: "Check Team Dynamics",
	cardTeamDynamicsSubtitle: "Know where your team resides on the BSP wheel",
	cardTeamDynamicsQuery:
		"Help me understand team dynamics and where we sit on the BSP wheel based on assessments.",
	cardExploreTitle: "Explore how this works",
	cardExploreSubtitle: "See how assessments turn into insights and coaching",
	cardExploreQuery:
		"How do BSP assessments turn into insights and coaching for me and my peers?",
	choicePlatform: "Get familiar with platform",
	choicePlatformQuery:
		"Give me a quick tour of key platform features I should know.",
	choiceAssessment: "How Assessment works",
	choiceAssessmentQuery:
		"Explain how BSP assessments work and what my results mean.",
	choiceStress: "See how you handle stress",
	choiceStressQuery:
		"Based on my assessment profile, how do I tend to handle stress at work?",
	proactiveGreetingLine: (firstName: string) => `Hello, ${firstName}!`,
	proactiveGreetingSubline: "How can I help you today?",
	cardPeerTitle: "Help me work better with a team member",
	cardPeerSubtitle:
		"Discover patterns in your team member's behavioral analysis",
	cardPeerQuery:
		"I want to work better with a teammate. Help me interpret behavioral patterns from our assessments.",
	cardCommTitle: "I'm dealing with a communication challenge",
	cardCommSubtitle:
		"Examine past communication challenges and how you overcame them",
	cardCommQuery:
		"I'm facing a communication challenge. Help me reflect on similar situations and what worked before.",
	waitingHint: "Waiting for your input",
	/** Shown under phase 0 with pulse dots — bot ready / waiting (Tailwind-only motion). */
	proactivePhaseListeningFooter: "Take your time, I'm here when you're ready.",
	followUpParagraph:
		"I can also help you navigate conversations, connect with a live coach or talk to support specialist.",
	followUpQuestion: "What would you like to start with?",
	actionCoach: "Connect with a live coach",
	actionCoachQuery:
		"I'd like to connect with a live coach for guidance on how I work with others.",
	actionSupport: "Talk to Support Specialist",
	actionSupportQuery:
		"I'd like to speak with a support specialist about using the platform.",
} as const;

/** Stable keys for proactive card press feedback (session ids for pressed state). */
export const CHATBOT_PROACTIVE_CARD_KEYS = {
	p0Team: "p0-team",
	p0Explore: "p0-explore",
	p0Platform: "p0-platform",
	p0Assessment: "p0-assessment",
	p0Stress: "p0-stress",
	p1Peer: "p1-peer",
	p1Comm: "p1-comm",
	p2Peer: "p2-peer",
	p2Comm: "p2-comm",
	p2Coach: "p2-coach",
	p2Support: "p2-support",
} as const;
