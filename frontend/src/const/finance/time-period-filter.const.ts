/** Shared time-range filter options for billing and invoice management. */
export const TIME_PERIOD_FILTER_OPTIONS = [
	{ id: "1h", label: "Last hour" },
	{ id: "7d", label: "Last 7 days" },
	{ id: "30d", label: "Last 30 days" },
	{ id: "3m", label: "Last 3 months" },
	{ id: "6m", label: "Last 6 months" },
	{ id: "1y", label: "Last year" },
] as const;
