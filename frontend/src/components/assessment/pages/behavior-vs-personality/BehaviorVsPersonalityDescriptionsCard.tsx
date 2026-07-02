import { AssessmentReportPanel } from "@/components";
import { cn } from "@/lib/utils";
import type { BehaviorVsPersonalityDescriptionsCardProps } from "@/types";
import { RichTextParagraph } from ".";

export function BehaviorVsPersonalityDescriptionsCard({
	paragraphs,
	variant = "default",
}: BehaviorVsPersonalityDescriptionsCardProps) {
	const isPrint = variant === "print";

	return (
		<AssessmentReportPanel
			padding={isPrint ? "sm" : "lg"}
			className={cn(
				"flex w-full shrink-0 min-w-0 flex-col",
				isPrint ? "gap-2" : "gap-4",
			)}
		>
			{paragraphs.map((paragraph, index) => (
				<RichTextParagraph
					key={`bevspe-dsc1-paragraph-${index}`}
					parts={paragraph.parts}
					className={cn(
						"font-normal text-foreground",
						isPrint
							? "text-small leading-small"
							: "text-regular leading-regular",
					)}
				/>
			))}
		</AssessmentReportPanel>
	);
}
