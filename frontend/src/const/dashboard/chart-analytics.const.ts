import type { ChartDesignToken } from "@/types";

export const CHART_STATUS_COLOR_TOKENS = {
	active: "interactive-info",
	incomplete: "interactive-secondary",
	suspended: "interactive-warning",
	closed: "interactive-error",
	pending: "interactive-success",
	cancelled: "interactive-secondary",
	expired: "interactive-warning",
	deleted: "interactive-error",
	blocked: "interactive-neutral-active",
	completed: "interactive-info",
	inprogress: "interactive-success",
} as const satisfies Record<string, ChartDesignToken>;

export const CHART_STATUS_LABEL_OVERRIDES = {
	pending: "Invited",
	cancelled: "Cancelled Invites",
	expired: "Expired Invites",
	inprogress: "In Progress",
} as const;
