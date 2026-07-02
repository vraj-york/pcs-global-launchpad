export type WagonWheelSpokeId =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12;

export type WagonWheelAxisOverlay = "none" | "horizontal" | "vertical" | "both";

export type WagonWheelProps = {
	className?: string;
	selectedSpoke?: WagonWheelSpokeId | null;
	defaultSelectedSpoke?: WagonWheelSpokeId | null;
	onSpokeSelect?: (spoke: WagonWheelSpokeId) => void;
	showSpokes?: boolean;
	showLabels?: boolean;
	showHub?: boolean;
	showOuterRing?: boolean;
	axisOverlay?: WagonWheelAxisOverlay;
	useInteractiveLabels?: boolean;
	highlightedSpoke?: WagonWheelSpokeId | null;
	highlightedSpokes?: readonly WagonWheelSpokeId[] | null;
	/** When set, colored petals for spokes not in this list are hidden. Labels are unaffected. */
	visibleSpokes?: readonly WagonWheelSpokeId[] | null;
	dimUnhighlightedSpokes?: boolean;
	squareAspect?: boolean;
	ariaLabel?: string;
};

export type WagonWheelLabelPosition = {
	spoke: WagonWheelSpokeId;
	x: number;
	y: number;
	textAnchor: "start" | "middle" | "end";
};

export type WagonWheelInteractiveLabelAlign = "start" | "center" | "end";

export type WagonWheelInteractiveLabelLayout = {
	spoke: WagonWheelSpokeId;
	left: number;
	top: number;
	width: number;
	height: number;
	textAlign: WagonWheelInteractiveLabelAlign;
};

export type InteractiveWheelLabelsProps = {
	highlightSpokeIds: ReadonlySet<WagonWheelSpokeId> | null;
};
