import { WagonWheel } from "@/components/common";
import {
	ASSESSMENT_REPORT_ADAPTARIAN,
	ASSESSMENT_REPORT_STYLE_WHEEL_LAYOUT,
} from "@/const";
import { cn } from "@/lib/utils";
import type { AssessmentReportStyleWheelPanelProps } from "@/types";
import { getWagonWheelInteractiveLabelPadding } from "@/utils";
import { AssessmentReportAdaptarianColorStrip, AssessmentReportPanel } from ".";

const styleWheelLayout = ASSESSMENT_REPORT_STYLE_WHEEL_LAYOUT;

export function AssessmentReportStyleWheelPanel({
	styleNumber,
	title,
	spokeId,
	isAdaptarian,
	characterStrengths,
	pillClass,
	colorCategory,
	categoryClassName,
	styleIndicatorAriaLabel,
	wheelAriaLabel,
	characterStrengthsAriaLabel,
	variant = "default",
	panelClassName,
	wheelMaxWidthClass,
}: AssessmentReportStyleWheelPanelProps) {
	const labelPadding = getWagonWheelInteractiveLabelPadding();
	const isPrint = variant === "print";
	const isFtue = variant === "ftue";
	const isCompact = isPrint || isFtue;

	return (
		<AssessmentReportPanel
			className={cn(
				"flex h-full min-h-0 w-full min-w-0 flex-col items-center",
				isPrint
					? "gap-3 border-0 p-4 shadow-none"
					: isFtue
						? "gap-3 p-4"
						: "gap-8 p-4 sm:p-6 lg:p-8",
				panelClassName,
			)}
		>
			<div
				className={cn(
					"flex shrink-0 items-center justify-center rounded-full",
					isCompact ? "px-4 py-2" : "px-6 py-3",
					pillClass,
				)}
				role="group"
				aria-label={styleIndicatorAriaLabel}
			>
				<span
					className={cn(
						"text-center font-semibold text-light-same sm:whitespace-nowrap",
						isCompact
							? "text-small leading-small"
							: "text-heading-4 leading-heading-4",
					)}
				>
					{`${styleNumber} - ${title}`}
				</span>
			</div>

			<div
				className={cn(
					"flex min-h-0 w-full flex-col items-center",
					isFtue ? "flex-1" : "flex-1 justify-center overflow-hidden",
				)}
			>
				<div
					className={cn(
						"flex w-full max-w-full flex-col items-center",
						styleWheelLayout.categoryToWheelGapClass,
						isFtue && "flex min-h-0 flex-1 flex-col justify-center",
					)}
				>
					{isAdaptarian ? (
						<AssessmentReportAdaptarianColorStrip />
					) : colorCategory && categoryClassName ? (
						<p
							className={cn(
								"shrink-0 text-center text-heading-4 font-semibold leading-heading-4",
								categoryClassName,
							)}
						>
							{colorCategory}
						</p>
					) : null}

					<div
						className={cn(
							"relative mx-auto w-full shrink-0 overflow-visible",
							wheelMaxWidthClass ?? styleWheelLayout.wheelMaxWidthClass,
						)}
						style={{
							paddingTop: labelPadding.top,
							paddingRight: labelPadding.right,
							paddingBottom: labelPadding.bottom,
							paddingLeft: labelPadding.left,
						}}
					>
						<WagonWheel
							showSpokes
							showLabels
							showHub
							showOuterRing
							useInteractiveLabels
							highlightedSpokes={
								isAdaptarian
									? [...ASSESSMENT_REPORT_ADAPTARIAN.wheelHighlightSpokes]
									: null
							}
							highlightedSpoke={isAdaptarian ? null : (spokeId ?? undefined)}
							dimUnhighlightedSpokes={!isAdaptarian && spokeId != null}
							className="size-full"
							ariaLabel={wheelAriaLabel}
						/>
					</div>
				</div>

				{characterStrengths.length > 0 ? (
					<div
						className={cn(
							"flex w-full shrink-0 flex-wrap justify-center",
							isCompact ? "gap-2 pt-0" : "mt-auto gap-1.5 pt-2",
							isFtue && "mt-auto",
						)}
						role="group"
						aria-label={characterStrengthsAriaLabel}
					>
						{characterStrengths.map((trait) => (
							<span
								key={trait}
								className={cn(
									"rounded-xl bg-card-foreground text-mini font-semibold leading-mini text-foreground",
									isCompact ? "px-2.5 py-1.5" : "px-3 py-3",
								)}
							>
								{trait}
							</span>
						))}
					</div>
				) : null}
			</div>
		</AssessmentReportPanel>
	);
}
