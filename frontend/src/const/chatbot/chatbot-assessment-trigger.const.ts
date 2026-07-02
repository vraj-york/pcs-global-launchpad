export const CHATBOT_ASSESSMENT_TRIGGER_SESSION_KEY =
	"bsp-chatbot-assessment-trigger" as const;

export const CHATBOT_ASSESSMENT_TRIGGER_CONTENT = {
	preparingSession: "Preparing your coaching session…",
	sessionStartError:
		"We could not start coaching right now. You can open BiSPy Bot anytime.",
	createSessionError: "Failed to start assessment coaching session.",
	planRequired:
		"Coaching after your assessment is available on the BSP monthly plan.",
} as const;
