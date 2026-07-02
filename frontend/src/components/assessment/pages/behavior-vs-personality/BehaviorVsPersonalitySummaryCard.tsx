import { ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY } from "@/const";
import { cn } from "@/lib/utils";
import type { BehaviorVsPersonalitySummaryCardProps } from "@/types";
import { BehaviorVsPersonalityPill, RichTextParagraph } from ".";

export function BehaviorVsPersonalitySummaryCard({
	parts,
	variant = "default",
}: BehaviorVsPersonalitySummaryCardProps) {
	const isPrint = variant === "print";

	return (
		<div
			className={cn(
				"flex w-full min-w-0 flex-col rounded-2xl bg-card-foreground",
				isPrint ? "min-h-0 flex-1 gap-3 p-4" : "gap-6 p-8",
			)}
		>
			<RichTextParagraph
				parts={parts}
				className={cn(
					"font-normal text-foreground",
					isPrint ? "text-small leading-small" : "text-regular leading-regular",
				)}
			/>
			<div
				className={cn(
					"flex w-full min-w-0",
					isPrint
						? "flex-row gap-2"
						: "flex-col gap-4 lg:flex-row lg:items-stretch",
				)}
			>
				{ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY.pillOrder.map((pillKey) => (
					<BehaviorVsPersonalityPill
						key={pillKey}
						pill={ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY.pills[pillKey]}
						variant={variant}
					/>
				))}
			</div>
		</div>
	);
}
