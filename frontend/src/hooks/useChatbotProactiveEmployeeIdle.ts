import { useEffect, useState } from "react";
import {
	CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_FIRST,
	CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_SECOND,
} from "@/const";
import type { ChatbotProactiveEmployeePhase } from "@/types";

/**
 * Drives the employee empty-state proactive UI: phase 0 → 1 after first idle
 * window, then 1 → 2 after the second.
 */
export function useChatbotProactiveEmployeeIdle(options: {
	enabled: boolean;
	question: string;
	sessionKey: string;
	firstIdleMs?: number;
	secondIdleMs?: number;
	freezeProgression?: boolean;
}): ChatbotProactiveEmployeePhase {
	const {
		enabled,
		question,
		sessionKey,
		firstIdleMs = CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_FIRST,
		secondIdleMs = CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_SECOND,
		freezeProgression = false,
	} = options;
	const [phase, setPhase] = useState<ChatbotProactiveEmployeePhase>(0);

	useEffect(() => {
		setPhase(0);
	}, [sessionKey]);

	useEffect(() => {
		if (!enabled) setPhase(0);
	}, [enabled]);

	useEffect(() => {
		if (!enabled || question.trim().length > 0 || freezeProgression) {
			return;
		}

		const toPhase1 = window.setTimeout(() => {
			setPhase(1);
		}, firstIdleMs);

		return () => {
			window.clearTimeout(toPhase1);
		};
	}, [enabled, question, sessionKey, firstIdleMs, freezeProgression]);

	useEffect(() => {
		if (
			!enabled ||
			question.trim().length > 0 ||
			phase !== 1 ||
			freezeProgression
		) {
			return;
		}

		const toPhase2 = window.setTimeout(() => {
			setPhase(2);
		}, secondIdleMs);

		return () => {
			window.clearTimeout(toPhase2);
		};
	}, [enabled, question, phase, secondIdleMs, freezeProgression]);

	return phase;
}
