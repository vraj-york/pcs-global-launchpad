import { useCallback, useId, useState } from "react";
import { CompositeWheelSvg } from "@/components/common/CompositeWheelSvg";
import {
	WAGON_WHEEL_A11Y,
	WAGON_WHEEL_DIMMED_INTERACTIVE_LABEL_CLASS,
	WAGON_WHEEL_DIMMED_SVG_LABEL_CLASS,
	WAGON_WHEEL_GEOMETRY,
	WAGON_WHEEL_INTERACTIVE_FRAME,
	WAGON_WHEEL_INTERACTIVE_LABEL_CLASS,
	WAGON_WHEEL_SPOKE_IDS,
	WAGON_WHEEL_SVG_LABEL_CLASS,
	WAGON_WHEEL_SVG_LABEL_FONT_SIZE,
	wagonWheelInteractivePercent,
} from "@/const";
import { cn } from "@/lib/utils";
import type {
	InteractiveWheelLabelsProps,
	WagonWheelProps,
	WagonWheelSpokeId,
} from "@/types";
import {
	buildWagonWheelInteractiveLabelLayouts,
	buildWagonWheelLabelPositions,
	buildWagonWheelSpokePath,
} from "@/utils";

const { viewBoxSize, wheelGraphicInset, wheelGraphicSize } =
	WAGON_WHEEL_GEOMETRY;

const { wheelLeft, wheelTop, wheelWidth } = WAGON_WHEEL_INTERACTIVE_FRAME;

const interactiveHitTransform = `translate(${wheelLeft} ${wheelTop}) scale(${wheelWidth / wheelGraphicSize}) translate(${-wheelGraphicInset} ${-wheelGraphicInset})`;

function InteractiveWheelLabels({
	highlightSpokeIds,
}: InteractiveWheelLabelsProps) {
	return buildWagonWheelInteractiveLabelLayouts().map(
		({ spoke, left, top, width, height, textAlign }) => {
			const isDimmed =
				highlightSpokeIds != null && !highlightSpokeIds.has(spoke);
			const labelClass = isDimmed
				? WAGON_WHEEL_DIMMED_INTERACTIVE_LABEL_CLASS
				: WAGON_WHEEL_INTERACTIVE_LABEL_CLASS;
			return (
				<div
					key={`label-${spoke}`}
					className={cn(
						"pointer-events-none absolute flex items-center",
						labelClass,
						textAlign === "start" && "justify-start",
						textAlign === "center" && "justify-center",
						textAlign === "end" && "justify-end",
					)}
					style={{
						left: wagonWheelInteractivePercent(left, "width"),
						top: wagonWheelInteractivePercent(top, "height"),
						width: wagonWheelInteractivePercent(width, "width"),
						height: wagonWheelInteractivePercent(height, "height"),
					}}
				>
					{spoke}
				</div>
			);
		},
	);
}

export function WagonWheel({
	className,
	selectedSpoke: selectedSpokeProp,
	defaultSelectedSpoke = null,
	onSpokeSelect,
	showSpokes = true,
	showLabels = true,
	showHub = true,
	showOuterRing = true,
	axisOverlay: _axisOverlay = "none",
	useInteractiveLabels = false,
	highlightedSpoke = null,
	highlightedSpokes = null,
	visibleSpokes = null,
	dimUnhighlightedSpokes = false,
	squareAspect = true,
	ariaLabel = WAGON_WHEEL_A11Y.wheelLabel,
}: WagonWheelProps) {
	const uid = useId().replace(/:/g, "");
	const highlightSpokeIds: ReadonlySet<WagonWheelSpokeId> | null =
		highlightedSpokes != null && highlightedSpokes.length > 0
			? new Set(highlightedSpokes)
			: dimUnhighlightedSpokes && highlightedSpoke != null
				? new Set<WagonWheelSpokeId>([highlightedSpoke])
				: null;
	const visibleSpokeIds: ReadonlySet<WagonWheelSpokeId> | null =
		visibleSpokes != null && visibleSpokes.length > 0
			? new Set(visibleSpokes)
			: null;
	const [uncontrolledSelected, setUncontrolledSelected] =
		useState<WagonWheelSpokeId | null>(defaultSelectedSpoke);

	const isControlled = selectedSpokeProp !== undefined;
	const selectedSpoke = isControlled ? selectedSpokeProp : uncontrolledSelected;
	const isInteractive = Boolean(onSpokeSelect);

	const handleSpokeSelect = useCallback(
		(spoke: WagonWheelSpokeId) => {
			if (!isControlled) {
				setUncontrolledSelected(spoke);
			}
			onSpokeSelect?.(spoke);
		},
		[isControlled, onSpokeSelect],
	);

	const handleSpokeKeyDown = useCallback(
		(event: React.KeyboardEvent, spoke: WagonWheelSpokeId) => {
			if (event.key !== "Enter" && event.key !== " ") {
				return;
			}
			event.preventDefault();
			handleSpokeSelect(spoke);
		},
		[handleSpokeSelect],
	);

	const labelPositions =
		showLabels && !useInteractiveLabels ? buildWagonWheelLabelPositions() : [];

	const svgViewBox = useInteractiveLabels
		? `0 0 ${WAGON_WHEEL_INTERACTIVE_FRAME.width} ${WAGON_WHEEL_INTERACTIVE_FRAME.height}`
		: `0 0 ${viewBoxSize} ${viewBoxSize}`;

	const hitTransform = useInteractiveLabels
		? interactiveHitTransform
		: undefined;

	return (
		<div
			className={cn(
				"relative w-full max-w-full",
				useInteractiveLabels && "overflow-visible",
				squareAspect && !useInteractiveLabels && "aspect-square",
				className,
			)}
			style={
				useInteractiveLabels
					? {
							aspectRatio: `${WAGON_WHEEL_INTERACTIVE_FRAME.width} / ${WAGON_WHEEL_INTERACTIVE_FRAME.height}`,
						}
					: undefined
			}
			role="group"
			aria-label={ariaLabel}
		>
			<CompositeWheelSvg
				className="absolute inset-0 size-full"
				showSpokes={showSpokes}
				showHub={showHub}
				showOutline={showOuterRing}
				highlightSpokeIds={highlightSpokeIds}
				visibleSpokeIds={visibleSpokeIds}
			/>

			{showLabels && useInteractiveLabels ? (
				<InteractiveWheelLabels highlightSpokeIds={highlightSpokeIds} />
			) : null}

			<svg
				viewBox={svgViewBox}
				className="size-full text-border"
				role="presentation"
				aria-hidden={isInteractive ? undefined : true}
			>
				<title>{WAGON_WHEEL_A11Y.wheelGraphicTitle}</title>
				<defs>
					<filter
						id={`wagon-wheel-shadow-${uid}`}
						x="-20%"
						y="-20%"
						width="140%"
						height="140%"
					>
						<feDropShadow
							dx="0"
							dy="2"
							stdDeviation="6"
							floodColor="currentColor"
							floodOpacity="0.45"
						/>
					</filter>
				</defs>

				{showSpokes ? (
					<g transform={hitTransform}>
						{WAGON_WHEEL_SPOKE_IDS.filter(
							(spoke) => !visibleSpokeIds || visibleSpokeIds.has(spoke),
						).map((spoke) => {
							const path = buildWagonWheelSpokePath(spoke);
							const isSelected = selectedSpoke === spoke;
							const isClickable = Boolean(onSpokeSelect);
							if (!isClickable) {
								return (
									<path
										key={`hit-${spoke}`}
										d={path}
										fill="transparent"
										stroke="none"
									/>
								);
							}
							return (
								<g
									key={`hit-${spoke}`}
									role="button"
									tabIndex={0}
									aria-label={WAGON_WHEEL_A11Y.spokeButtonLabel(spoke)}
									aria-pressed={isSelected}
									className="cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => handleSpokeSelect(spoke)}
									onKeyDown={(e) => handleSpokeKeyDown(e, spoke)}
								>
									<path
										d={path}
										fill="transparent"
										className={cn(
											isSelected ? "stroke-foreground" : "stroke-none",
										)}
										strokeWidth={isSelected ? 2.5 : 0}
									/>
								</g>
							);
						})}
					</g>
				) : null}

				{showLabels && !useInteractiveLabels
					? labelPositions.map(({ spoke, x, y, textAnchor }) => {
							const isDimmed =
								highlightSpokeIds != null && !highlightSpokeIds.has(spoke);
							return (
								<text
									key={`label-${spoke}`}
									x={x}
									y={y}
									textAnchor={textAnchor}
									dominantBaseline="middle"
									className={cn(
										"pointer-events-none select-none font-semibold",
										isDimmed
											? WAGON_WHEEL_DIMMED_SVG_LABEL_CLASS
											: WAGON_WHEEL_SVG_LABEL_CLASS,
									)}
									style={{
										fontSize: isDimmed
											? WAGON_WHEEL_SVG_LABEL_FONT_SIZE.dimmed
											: WAGON_WHEEL_SVG_LABEL_FONT_SIZE.active,
									}}
								>
									{spoke}
								</text>
							);
						})
					: null}
			</svg>
		</div>
	);
}
