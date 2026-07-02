import {
	ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY,
	ASSESSMENT_REPORT_RESULTS_PAGE,
} from "@/const";
import { cn } from "@/lib/utils";
import type { BehaviorVsPersonalityProps } from "@/types";
import {
	BehaviorVsPersonalityDescriptionsCard,
	BehaviorVsPersonalitySummaryCard,
} from ".";

const sectionCopy = ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY;

export function BehaviorVsPersonality({
	content,
	variant = "default",
}: BehaviorVsPersonalityProps) {
	const isPrint = variant === "print";

	return (
		<section
			id={sectionCopy.sectionId}
			className={cn(
				isPrint
					? "flex min-h-0 flex-1 flex-col gap-3"
					: ASSESSMENT_REPORT_RESULTS_PAGE.sectionShellClassName,
			)}
		>
			<header className="flex w-full shrink-0 min-w-0 flex-col gap-2">
				<h2 className="text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-foreground">
					{content.title}
				</h2>
			</header>

			<div
				className={cn(
					"flex w-full min-w-0 flex-col",
					isPrint ? "min-h-0 flex-1 gap-2" : "gap-4",
				)}
			>
				<BehaviorVsPersonalityDescriptionsCard
					paragraphs={content.dsc1Paragraphs}
					variant={variant}
				/>
				<BehaviorVsPersonalitySummaryCard
					parts={content.dsc2Parts}
					variant={variant}
				/>
			</div>
		</section>
	);
}
