import { AssessmentReportPanel } from "@/components";
import { ASSESSMENT_REPORT_STRESS_MANAGEMENT } from "@/const";
import { cn } from "@/lib/utils";
import type { DecreaseStressStressedStepsCardProps } from "@/types";

const sectionCopy = ASSESSMENT_REPORT_STRESS_MANAGEMENT;

export function DecreaseStressStressedStepsCard({
	items,
	panelClassName,
	titleClassName,
	innerPanelClassName,
	listClassName,
	useCompactPadding = false,
}: DecreaseStressStressedStepsCardProps) {
	if (items.length === 0) {
		return null;
	}

	return (
		<AssessmentReportPanel
			variant="filled"
			padding={useCompactPadding ? "none" : "lg"}
			className={cn(
				"flex h-full min-h-0 w-full min-w-0 flex-1 flex-col self-stretch gap-6",
				panelClassName,
			)}
		>
			<h3
				className={cn(
					"shrink-0 text-heading-4 font-semibold leading-heading-4 tracking-heading-4 text-foreground",
					titleClassName,
				)}
			>
				{sectionCopy.stepsCardTitle}
			</h3>
			<AssessmentReportPanel
				padding={useCompactPadding ? "none" : "lg"}
				className={cn(
					"flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-visible",
					innerPanelClassName,
				)}
			>
				<ul
					className={cn(
						"list-disc space-y-0 ps-4 text-regular leading-regular text-text-secondary",
						listClassName,
					)}
				>
					{items.map((item, index) => (
						<li key={`stressed-step-${index}`}>
							{item.parts.map((part, partIndex) =>
								part.bold ? (
									<span
										key={`stressed-step-${index}-part-${partIndex}`}
										className="font-semibold text-foreground"
									>
										{part.text}
									</span>
								) : (
									<span key={`stressed-step-${index}-part-${partIndex}`}>
										{part.text}
									</span>
								),
							)}
						</li>
					))}
				</ul>
			</AssessmentReportPanel>
		</AssessmentReportPanel>
	);
}
