import { Target } from "lucide-react";
import { AssessmentReportPanel } from "@/components";
import { cn } from "@/lib/utils";
import type { DecreaseStressSecondaryCardProps } from "@/types";

export function DecreaseStressSecondaryCard({
	content,
	className,
	targetClassName,
	textClassName,
	useCompactPadding = false,
}: DecreaseStressSecondaryCardProps) {
	return (
		<AssessmentReportPanel
			padding={useCompactPadding ? "none" : "lg"}
			className={cn(
				"relative flex w-full min-w-0 flex-col overflow-hidden",
				useCompactPadding ? "shrink-0 flex-none" : "lg:min-h-0 lg:flex-1",
				className,
			)}
		>
			<Target
				className={cn(
					"pointer-events-none absolute -bottom-20 -end-20 size-52 text-border opacity-40",
					targetClassName,
				)}
				strokeWidth={1}
				aria-hidden
			/>
			<p
				className={cn(
					"relative z-10 text-regular font-normal leading-regular text-foreground",
					textClassName,
				)}
			>
				{content.prefix}
				{content.boldPhrase ? (
					<span className="font-semibold">{content.boldPhrase}</span>
				) : null}
				{content.suffix}
			</p>
		</AssessmentReportPanel>
	);
}
