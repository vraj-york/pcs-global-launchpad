import { AssessmentReportPanel } from "@/components";
import { BSP_COLOR_WHEEL_STATIC_SECTIONS } from "@/const";
import { cn } from "@/lib/utils";
import type { ColorWheelStaticSectionProps } from "@/types";

export function ColorWheelStaticSection({
	sectionId,
}: ColorWheelStaticSectionProps) {
	const section = BSP_COLOR_WHEEL_STATIC_SECTIONS[sectionId];

	return (
		<AssessmentReportPanel
			padding="none"
			className="flex w-full min-w-0 items-center justify-center overflow-hidden p-0"
		>
			<img
				src={section.src}
				alt={section.ariaLabel}
				width={section.width}
				height={section.height}
				decoding="async"
				className={cn("h-auto w-full max-w-full")}
			/>
		</AssessmentReportPanel>
	);
}
