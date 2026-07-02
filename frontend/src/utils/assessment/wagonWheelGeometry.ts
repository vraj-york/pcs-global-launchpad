import {
	WAGON_WHEEL_GEOMETRY,
	WAGON_WHEEL_INTERACTIVE_FRAME,
	WAGON_WHEEL_INTERACTIVE_LABEL_METRICS,
	WAGON_WHEEL_SPOKE_IDS,
} from "@/const";
import type {
	WagonWheelInteractiveLabelLayout,
	WagonWheelLabelPosition,
	WagonWheelSpokeId,
} from "@/types";

const {
	center,
	innerRadius,
	outerRadius,
	compositeNativeSize,
	compositeSpokeTipInset,
	styleWheelGraphicWidth,
	labelCenterOffsetFromTipFigmaPx,
	labelExtraClearanceNative,
	innerHalfSpreadDeg,
	outerHalfSpreadDeg,
	wheelGraphicInset,
	wheelGraphicSize,
} = WAGON_WHEEL_GEOMETRY;

const nativeCenter = compositeNativeSize / 2;

const interactiveScaleX =
	WAGON_WHEEL_INTERACTIVE_FRAME.width / compositeNativeSize;
const interactiveScaleY =
	WAGON_WHEEL_INTERACTIVE_FRAME.height / compositeNativeSize;

const viewBoxGraphicScale = wheelGraphicSize / compositeNativeSize;

export function getPillAnchorForSpoke(
	spoke: WagonWheelSpokeId,
): "left" | "right" {
	const angleRad = wagonWheelSpokeAngleRad(spoke);
	return Math.cos(angleRad) > 0 ? "left" : "right";
}

export function wagonWheelSpokeClockDegrees(spoke: WagonWheelSpokeId): number {
	return spoke === 12 ? 0 : spoke * 30;
}

export function wagonWheelSpokeAngleRad(spoke: WagonWheelSpokeId): number {
	return ((wagonWheelSpokeClockDegrees(spoke) - 90) * Math.PI) / 180;
}

function polarToCartesian(
	cx: number,
	cy: number,
	radius: number,
	angleRad: number,
): { x: number; y: number } {
	return {
		x: cx + radius * Math.cos(angleRad),
		y: cy + radius * Math.sin(angleRad),
	};
}

export function getWagonWheelLabelOffsetFromTipNative(): number {
	const figmaOffsetNative =
		labelCenterOffsetFromTipFigmaPx *
		(compositeNativeSize / styleWheelGraphicWidth);
	return figmaOffsetNative + labelExtraClearanceNative;
}

export function getWagonWheelSpokeTipRadiusNative(): number {
	return nativeCenter - compositeSpokeTipInset;
}

export function getWagonWheelLabelCenterRadiusNative(): number {
	return (
		getWagonWheelSpokeTipRadiusNative() +
		getWagonWheelLabelOffsetFromTipNative()
	);
}

export function getWagonWheelInteractiveFrameCenter(): {
	x: number;
	y: number;
} {
	return mapNativeToInteractiveFrame(nativeCenter, nativeCenter);
}

export function mapNativeToInteractiveFrame(
	nx: number,
	ny: number,
): { x: number; y: number } {
	return {
		x: nx * interactiveScaleX,
		y: ny * interactiveScaleY,
	};
}

function mapNativeToViewBoxGraphic(
	nx: number,
	ny: number,
): { x: number; y: number } {
	return {
		x: wheelGraphicInset + nx * viewBoxGraphicScale,
		y: wheelGraphicInset + ny * viewBoxGraphicScale,
	};
}

export function getWagonWheelSpokeTipNative(spoke: WagonWheelSpokeId): {
	x: number;
	y: number;
} {
	return polarToCartesian(
		nativeCenter,
		nativeCenter,
		getWagonWheelSpokeTipRadiusNative(),
		wagonWheelSpokeAngleRad(spoke),
	);
}

export function getWagonWheelLabelCenterNative(spoke: WagonWheelSpokeId): {
	x: number;
	y: number;
} {
	return polarToCartesian(
		nativeCenter,
		nativeCenter,
		getWagonWheelLabelCenterRadiusNative(),
		wagonWheelSpokeAngleRad(spoke),
	);
}

export function getWagonWheelSpokeTipInInteractiveFrame(
	spoke: WagonWheelSpokeId,
): { x: number; y: number } {
	const tip = getWagonWheelSpokeTipNative(spoke);
	return mapNativeToInteractiveFrame(tip.x, tip.y);
}

export function getWagonWheelLabelCenterInInteractiveFrame(
	spoke: WagonWheelSpokeId,
): { x: number; y: number } {
	const label = getWagonWheelLabelCenterNative(spoke);
	return mapNativeToInteractiveFrame(label.x, label.y);
}

export function getWagonWheelLabelCenterInViewBox(spoke: WagonWheelSpokeId): {
	x: number;
	y: number;
} {
	const label = getWagonWheelLabelCenterNative(spoke);
	return mapNativeToViewBoxGraphic(label.x, label.y);
}

function interactiveLabelWidth(spoke: WagonWheelSpokeId): number {
	return spoke >= 10
		? WAGON_WHEEL_INTERACTIVE_LABEL_METRICS.widthDouble
		: WAGON_WHEEL_INTERACTIVE_LABEL_METRICS.widthSingle;
}

function centeredLabelBox(
	cx: number,
	cy: number,
	width: number,
	height: number,
): Pick<
	WagonWheelInteractiveLabelLayout,
	"left" | "top" | "width" | "height" | "textAlign"
> {
	return {
		left: cx - width / 2,
		top: cy - height / 2,
		width,
		height,
		textAlign: "center",
	};
}

export function buildWagonWheelSpokePath(spoke: WagonWheelSpokeId): string {
	const centerRad = wagonWheelSpokeAngleRad(spoke);
	const innerHalf = (innerHalfSpreadDeg * Math.PI) / 180;
	const outerHalf = (outerHalfSpreadDeg * Math.PI) / 180;

	const innerLeft = polarToCartesian(
		center,
		center,
		innerRadius,
		centerRad - innerHalf,
	);
	const innerRight = polarToCartesian(
		center,
		center,
		innerRadius,
		centerRad + innerHalf,
	);
	const outerLeft = polarToCartesian(
		center,
		center,
		outerRadius,
		centerRad - outerHalf,
	);
	const outerRight = polarToCartesian(
		center,
		center,
		outerRadius,
		centerRad + outerHalf,
	);
	const tip = polarToCartesian(center, center, outerRadius, centerRad);

	return [
		`M ${innerLeft.x} ${innerLeft.y}`,
		`L ${outerLeft.x} ${outerLeft.y}`,
		`L ${tip.x} ${tip.y}`,
		`L ${outerRight.x} ${outerRight.y}`,
		`L ${innerRight.x} ${innerRight.y}`,
		"Z",
	].join(" ");
}

export function buildWagonWheelLabelPositions(): WagonWheelLabelPosition[] {
	return WAGON_WHEEL_SPOKE_IDS.map((spoke) => {
		const { x, y } = getWagonWheelLabelCenterInViewBox(spoke);
		return { spoke, x, y, textAnchor: "middle" };
	});
}

export function buildWagonWheelInteractiveLabelLayouts(): WagonWheelInteractiveLabelLayout[] {
	const { height } = WAGON_WHEEL_INTERACTIVE_LABEL_METRICS;

	return WAGON_WHEEL_SPOKE_IDS.map((spoke) => {
		const { x: cx, y: cy } = getWagonWheelLabelCenterInInteractiveFrame(spoke);
		const width = interactiveLabelWidth(spoke);

		return {
			spoke,
			...centeredLabelBox(cx, cy, width, height),
		};
	});
}

export function getWagonWheelInteractiveLabelPadding(
	bufferPx: number = WAGON_WHEEL_GEOMETRY.interactiveLabelPaddingBufferPx,
): { top: number; right: number; bottom: number; left: number } {
	const layouts = buildWagonWheelInteractiveLabelLayouts();
	const frameWidth = WAGON_WHEEL_INTERACTIVE_FRAME.width;
	const frameHeight = WAGON_WHEEL_INTERACTIVE_FRAME.height;

	let minTop = 0;
	let maxBottom: number = frameHeight;
	let minLeft = 0;
	let maxRight: number = frameWidth;

	for (const layout of layouts) {
		minTop = Math.min(minTop, layout.top);
		maxBottom = Math.max(maxBottom, layout.top + layout.height);
		minLeft = Math.min(minLeft, layout.left);
		maxRight = Math.max(maxRight, layout.left + layout.width);
	}

	return {
		top: Math.max(0, Math.ceil(-minTop) + bufferPx),
		right: Math.max(0, Math.ceil(maxRight - frameWidth) + bufferPx),
		bottom: Math.max(0, Math.ceil(maxBottom - frameHeight) + bufferPx),
		left: Math.max(0, Math.ceil(-minLeft) + bufferPx),
	};
}
