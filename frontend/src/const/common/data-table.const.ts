/** Approximate row height (py-5 + content) for fixed table height calculation */
const ROW_HEIGHT_PX = 52;
const HEADER_HEIGHT_PX = 56;

export const DATA_TABLE_CONFIG = {
	defaultPageSize: 10,
	pageSizeOptions: [10, 20, 50, 100],
} as const;

/** Fixed height for scrollable table area: header + 10 rows (used when fixedHeight is true) */
export const DATA_TABLE_SCROLL_HEIGHT = HEADER_HEIGHT_PX + 10 * ROW_HEIGHT_PX;

export const DATA_TABLE_TEXT = {
	showing: "Showing",
	previous: "Previous",
	next: "Next",
	noData: "No data available",
} as const;
