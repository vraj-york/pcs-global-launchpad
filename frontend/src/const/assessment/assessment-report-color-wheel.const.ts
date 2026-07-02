import type { BspStyleInfoPillVariant } from "@/types";

export const ASSESSMENT_REPORT_COLOR_WHEEL = {
	sectionTitle: "Understanding BSP color wheel",
	sectionSubtitle:
		"From the 4 quadrants of environmental preferences, we can refine the amounts of color even further. We have also numbered each of the spokes, just like that of a clock.",
} as const;

export const BSP_STYLE_INFO_PILL_VARIANT_CLASS: Record<
	BspStyleInfoPillVariant,
	string
> = {
	red: "bg-brand-red",
	green: "bg-brand-green",
	gray: "bg-icon-primary",
	redGreen: "bg-gradient-to-r from-brand-red to-brand-green",
	greenRed: "bg-gradient-to-l from-brand-red to-brand-green",
	greenGray: "bg-gradient-to-r from-brand-green to-icon-primary",
	grayRed: "bg-gradient-to-r from-icon-primary to-brand-red",
	grayRedLeft: "bg-gradient-to-l from-icon-primary to-brand-red",
	greenGrayLeft: "bg-gradient-to-l from-brand-green to-icon-primary",
	redGreenLeft: "bg-gradient-to-l from-brand-red to-brand-green",
};
