import { useEffect, useRef, useState } from "react";
import { ASSESSMENT_REPORT_SCALED_LAYOUT } from "@/const";
import { cn } from "@/lib/utils";
import type { AssessmentReportScaledLayoutFrameProps } from "@/types";

/** Wraps fixed-size diagram content; scales down on narrow viewports without layout overflow. */
export function AssessmentReportScaledLayoutFrame({
	designWidth,
	designHeight,
	fitInset = ASSESSMENT_REPORT_SCALED_LAYOUT.defaultFitInset,
	minScale = ASSESSMENT_REPORT_SCALED_LAYOUT.defaultMinScale,
	className,
	innerClassName,
	allowOverflow = false,
	children,
}: AssessmentReportScaledLayoutFrameProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		const node = containerRef.current;
		if (!node) {
			return;
		}

		const updateScale = () => {
			const width = node.clientWidth;
			if (width <= 0) {
				return;
			}
			const next = Math.min(1, (width / designWidth) * fitInset);
			setScale(Math.max(minScale, next));
		};

		updateScale();
		const observer = new ResizeObserver(updateScale);
		observer.observe(node);
		return () => observer.disconnect();
	}, [designWidth, fitInset, minScale]);

	const scaledWidth = designWidth * scale;
	const scaledHeight = designHeight * scale;

	return (
		<div
			ref={containerRef}
			className={cn("relative w-full min-w-0 max-w-full", className)}
			style={{ width: "100%", maxWidth: designWidth }}
		>
			<div
				className={cn(
					"relative mx-auto",
					allowOverflow ? "overflow-visible" : "overflow-hidden",
				)}
				style={{ width: scaledWidth, height: scaledHeight }}
			>
				<div
					className={cn(
						"absolute left-0 top-0 origin-top-left",
						innerClassName,
					)}
					style={{
						width: designWidth,
						height: designHeight,
						transform: `scale(${scale})`,
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
