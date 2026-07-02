import type { WagonWheelSpokeId } from "@/types";

export const WAGON_WHEEL_GEOMETRY = {
	viewBoxSize: 400,
	center: 200,
	innerRadius: 34,
	outerRadius: 148,
	compositeNativeSize: 323.686,
	compositeSpokeTipInset: 1.55,
	styleWheelGraphicWidth: 352,
	labelCenterOffsetFromTipFigmaPx: 15.67,
	labelExtraClearanceNative: 8,
	interactiveLabelPaddingBufferPx: 4,
	innerHalfSpreadDeg: 7,
	outerHalfSpreadDeg: 13.5,
	hubRadius: 24,
	outerRingRadius: 162,
	axisStrokeWidth: 5,
	wheelGraphicInset: 20,
	wheelGraphicSize: 360,
} as const;

export const WAGON_WHEEL_SPOKE_IDS: readonly WagonWheelSpokeId[] = [
	12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
] as const;

export const WAGON_WHEEL_A11Y = {
	wheelLabel: "BSP color wheel",
	wheelGraphicTitle: "BSP color wheel graphic",
	axisDividerTitle: "BSP color wheel axis dividers",
	spokeButtonLabel: (spoke: WagonWheelSpokeId) => `Spoke ${spoke}`,
} as const;

export const WAGON_WHEEL_INTERACTIVE_LABEL_CLASS =
	"text-heading-4 font-semibold text-foreground" as const;

export const WAGON_WHEEL_DIMMED_INTERACTIVE_LABEL_CLASS =
	"text-regular font-semibold text-foreground opacity-30" as const;

export const WAGON_WHEEL_INTERACTIVE_LABEL_METRICS = {
	height: 24,
	widthSingle: 16,
	widthDouble: 24,
} as const;

export const WAGON_WHEEL_SVG_LABEL_CLASS =
	"fill-foreground text-heading-4" as const;

export const WAGON_WHEEL_DIMMED_SVG_LABEL_CLASS =
	"fill-foreground text-regular opacity-30" as const;

export const WAGON_WHEEL_SVG_LABEL_FONT_SIZE = {
	active: 20,
	dimmed: 16,
} as const;

export const WAGON_WHEEL_INTERACTIVE_FRAME = {
	width: 360,
	height: 379.334,
	wheelLeft: 18.153,
	wheelTop: 28.344,
	wheelWidth: 322.687,
} as const;

export function wagonWheelInteractivePercent(
	value: number,
	axis: "width" | "height",
): string {
	const base =
		axis === "width"
			? WAGON_WHEEL_INTERACTIVE_FRAME.width
			: WAGON_WHEEL_INTERACTIVE_FRAME.height;
	return `${(value / base) * 100}%`;
}

export const ASSESSMENT_REPORT_STYLE_WHEEL_LAYOUT = {
	categoryToWheelGapClass: "gap-3",
	wheelMaxWidthClass: "max-w-sm",
} as const;
