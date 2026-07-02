import { Brain, ChartSpline, FileBarChart, Sparkle } from "lucide-react";

/** SVG user units; display uses `size-28` (scales uniformly). */
export const ASSESSMENT_REPORT_RING_VIEWBOX_SIZE = 108;
/** Ring inset from viewBox edge to stroke centerline — matches Tailwind `w-2` / `spacing-2` (8px at 1:1). */
export const ASSESSMENT_REPORT_RING_STROKE_INSET = 8;
export const ASSESSMENT_REPORT_RING_CENTER =
	ASSESSMENT_REPORT_RING_VIEWBOX_SIZE / 2;
export const ASSESSMENT_REPORT_RING_RADIUS =
	ASSESSMENT_REPORT_RING_CENTER - ASSESSMENT_REPORT_RING_STROKE_INSET;
export const ASSESSMENT_REPORT_RING_CIRCUMFERENCE =
	2 * Math.PI * ASSESSMENT_REPORT_RING_RADIUS;

export const ASSESSMENT_REPORT_LOADER_ROW_ICONS = [
	Brain,
	ChartSpline,
	Sparkle,
	FileBarChart,
] as const;

export const ASSESSMENT_REPORT_LOADER_HERO_ICONS = [
	Brain,
	ChartSpline,
	Sparkle,
	FileBarChart,
] as const;
