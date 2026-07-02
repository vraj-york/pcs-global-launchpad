import { describe, expect, it } from "vitest";

import {
	CHATBOT_MOCK_EMPLOYEE_PROFILE,
	CHATBOT_PROACTIVE_API_LOAD_FAILED_MESSAGE,
	CHATBOT_PROACTIVE_EMPLOYEE_API_PATH,
	CHATBOT_PROACTIVE_EMPLOYEE_CONTENT,
	CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_FIRST,
	CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_SECOND,
	CHATBOT_PROACTIVE_EMPLOYEE_TIMING_MS,
	CHATBOT_PROACTIVE_EMPTY_THREAD_SESSION_KEY,
	proactiveEmployeeCardAriaLabel,
} from "@/const";

describe("CHATBOT_PROACTIVE_EMPLOYEE configuration", () => {
	it("uses idle windows within the intended design ranges (ms)", () => {
		expect(CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_FIRST).toBe(
			CHATBOT_PROACTIVE_EMPLOYEE_TIMING_MS.firstIdle,
		);
		expect(CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_SECOND).toBe(
			CHATBOT_PROACTIVE_EMPLOYEE_TIMING_MS.secondIdle,
		);
		expect(CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_FIRST).toBeGreaterThanOrEqual(
			4000,
		);
		expect(CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_FIRST).toBeLessThanOrEqual(5000);
		expect(CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_SECOND).toBeGreaterThanOrEqual(
			4000,
		);
		expect(CHATBOT_PROACTIVE_EMPLOYEE_IDLE_MS_SECOND).toBeLessThanOrEqual(5000);
	});

	it("exposes mock profile and templated welcome copy for swapping with API data", () => {
		expect(CHATBOT_MOCK_EMPLOYEE_PROFILE.displayName.length).toBeGreaterThan(0);
		expect(CHATBOT_PROACTIVE_EMPLOYEE_CONTENT.welcomeTitle("Ada")).toContain(
			"Ada",
		);
		expect(
			CHATBOT_PROACTIVE_EMPLOYEE_CONTENT.cardTeamDynamicsQuery.length,
		).toBeGreaterThan(0);
	});

	it("pins proactive API path, empty-thread session key, and aria label helper", () => {
		expect(CHATBOT_PROACTIVE_EMPLOYEE_API_PATH).toBe("/proactive/employee");
		expect(CHATBOT_PROACTIVE_EMPTY_THREAD_SESSION_KEY).toBe("__new__");
		expect(CHATBOT_PROACTIVE_API_LOAD_FAILED_MESSAGE.length).toBeGreaterThan(0);
		expect(proactiveEmployeeCardAriaLabel("A", "B")).toBe("A. B");
	});
});
