import { AssessmentReportPanel } from "@/components";
import { ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED } from "@/const";
import { cn } from "@/lib/utils";
import type { AssessmentReportAwarenessCardProps } from "@/types";
import { roundAwarenessScore } from "@/utils";

const copy = ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED;

export function AwarenessCard({
	awarenessScore,
	className,
}: AssessmentReportAwarenessCardProps) {
	const displayScore = roundAwarenessScore(awarenessScore);

	return (
		<AssessmentReportPanel
			as="article"
			padding="lg"
			className={cn(
				"flex w-full min-w-0 shrink-0 flex-col gap-6 overflow-visible sm:flex-row sm:items-center sm:justify-between sm:gap-8",
				className,
			)}
		>
			<div className="flex min-w-0 flex-1 flex-col gap-2 sm:pe-4">
				<h3 className="text-heading-4 font-semibold leading-heading-4 text-brand-primary">
					{copy.awarenessTitle}
				</h3>
				<p className="text-small font-normal leading-small text-muted-foreground">
					{copy.awarenessBody}
				</p>
			</div>

			<div
				className="relative mx-auto size-28 shrink-0 sm:mx-0"
				role="img"
				aria-label={copy.awarenessGaugeAriaLabel(displayScore)}
			>
				<div
					className="absolute inset-0 rounded-full bg-brand-primary/10"
					aria-hidden
				/>
				<span
					className={cn(
						"absolute inset-4 rounded-full bg-brand-primary/25",
						"motion-safe:animate-ping motion-reduce:animate-none",
					)}
					aria-hidden
				/>
				<span
					className={cn(
						"absolute inset-4 rounded-full bg-brand-primary/20",
						"motion-safe:animate-ping motion-reduce:animate-none delay-700",
					)}
					aria-hidden
				/>
				<div
					className={cn(
						"absolute inset-4 z-10 flex items-center justify-center rounded-full",
						"border-4 border-background bg-brand-primary",
					)}
				>
					<span className="text-heading-3 font-semibold leading-heading-3 text-light-same">
						{displayScore}
					</span>
				</div>
			</div>
		</AssessmentReportPanel>
	);
}
