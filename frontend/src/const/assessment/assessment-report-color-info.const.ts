/** Tailwind class strings for sanitized ``report_content`` HTML in the color model section. */
export const ASSESSMENT_REPORT_COLOR_INFO_HTML_SCOPES = {
	innerCardBody:
		"min-w-0 text-regular font-normal leading-regular text-text-secondary [&_b]:font-semibold [&_b]:text-text-foreground [&_sup]:align-super [&_sup]:text-mini [&_sup]:leading-none [&_.wysiwyg-color-red]:text-destructive [&_.wysiwyg-color-green]:text-brand-green [&_.wysiwyg-color-gray]:text-muted-foreground [&_.wysiwyg-color-blue]:text-info",
	blueCardHeadline:
		"min-w-0 flex-1 text-heading-4 font-semibold leading-none text-info [&_p]:m-0 [&_p]:inline [&_p]:leading-none [&_p]:line-clamp-1 [&_p]:overflow-hidden [&_p]:text-ellipsis [&_p]:whitespace-nowrap [&_p]:font-semibold [&_p]:text-info [&_b]:font-semibold [&_b]:text-info",
	blueCardBody:
		"min-w-0 text-regular font-normal leading-regular text-text-secondary [&_p]:m-0 [&_p+p]:mt-3 [&_b]:font-semibold [&_b]:text-text-secondary [&_.wysiwyg-color-blue]:font-semibold [&_.wysiwyg-color-blue]:text-info",
} as const;

/** BSP Color Model section; section title is static, body from ``report_content``. */
export const ASSESSMENT_REPORT_COLOR_INFO = {
	sectionTitle: "Understanding the BSP color model",
	bluePillLabel: "BLUE",
	/** Accessible name for the RED / GREEN / GRAY chip row. */
	rgbChipsGroupAriaLabel: "RED, GREEN, and GRAY behavioral colors",
	/** Chip labels match ``report_content`` HTML. */
	rgbChips: [
		{ label: "RED", surfaceKey: "red" },
		{ label: "GREEN", surfaceKey: "green" },
		{ label: "GRAY", surfaceKey: "gray" },
	] as const,
} as const;
