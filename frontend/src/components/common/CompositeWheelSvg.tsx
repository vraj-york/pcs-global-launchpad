import { useId, useMemo } from "react";
import bspWheelColor from "@/assets/assessment/wagon-wheel/bsp-wheel-color.svg?raw";
import { WAGON_WHEEL_SPOKE_IDS } from "@/const";
import { cn } from "@/lib/utils";
import type { WagonWheelSpokeId } from "@/types";

export type CompositeWheelSvgProps = {
	className?: string;
	showSpokes?: boolean;
	showHub?: boolean;
	showOutline?: boolean;
	highlightSpokeIds?: ReadonlySet<WagonWheelSpokeId> | null;
	visibleSpokeIds?: ReadonlySet<WagonWheelSpokeId> | null;
};

function buildDimCss(
	scopeId: string,
	highlightSpokeIds: ReadonlySet<WagonWheelSpokeId>,
	visibleSpokeIds?: ReadonlySet<WagonWheelSpokeId> | null,
): string {
	const spokes = visibleSpokeIds?.size
		? WAGON_WHEEL_SPOKE_IDS.filter((spoke) => visibleSpokeIds.has(spoke))
		: WAGON_WHEEL_SPOKE_IDS;

	return spokes
		.map((spoke) => {
			const opacity = highlightSpokeIds.has(spoke) ? "1" : "0.3";
			return `#${scopeId} #spoke-${spoke}{opacity:${opacity};transition:opacity 150ms ease}`;
		})
		.join("");
}

export function CompositeWheelSvg({
	className,
	showSpokes = true,
	showHub = true,
	showOutline = true,
	highlightSpokeIds = null,
	visibleSpokeIds = null,
}: CompositeWheelSvgProps) {
	const scopeId = useId().replace(/:/g, "");
	const dimCss = useMemo(() => {
		if (!highlightSpokeIds || highlightSpokeIds.size === 0) {
			return null;
		}
		return buildDimCss(scopeId, highlightSpokeIds, visibleSpokeIds);
	}, [highlightSpokeIds, scopeId, visibleSpokeIds]);

	const hiddenSpokeCss = useMemo(() => {
		if (!visibleSpokeIds || visibleSpokeIds.size === 0) {
			return null;
		}
		return WAGON_WHEEL_SPOKE_IDS.filter((spoke) => !visibleSpokeIds.has(spoke))
			.map((spoke) => `#${scopeId} #spoke-${spoke}{display:none}`)
			.join("");
	}, [scopeId, visibleSpokeIds]);

	const hiddenSelectors = [
		!showSpokes ? 'g[id^="spoke-"]' : null,
		!showHub ? "#hub" : null,
		!showOutline ? "#outline" : null,
	]
		.filter(Boolean)
		.map((sel) => `#${scopeId} ${sel}{display:none}`);

	const scopeCss = [dimCss, hiddenSpokeCss, ...hiddenSelectors]
		.filter(Boolean)
		.join("");

	return (
		<div
			className={cn(
				"pointer-events-none size-full [&_svg]:size-full",
				className,
			)}
			data-wheel-scope={scopeId}
		>
			{scopeCss ? <style>{scopeCss}</style> : null}
			<div
				id={scopeId}
				className="size-full"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Bundled static wheel SVG assets only.
				dangerouslySetInnerHTML={{ __html: bspWheelColor }}
			/>
		</div>
	);
}
