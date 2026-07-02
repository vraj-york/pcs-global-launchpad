import { AssessmentReportPrintLayout } from "@/components";
import {
	BSP_COLOR_WHEEL_PRINT_STYLE_INFO,
	BSP_COLOR_WHEEL_STATIC_SECTIONS,
} from "@/const";
import { cn } from "@/lib";
import type { AssessmentReportPrintColorWheelPageProps } from "@/types";

export function AssessmentReportPrintColorWheelPage({
	pageNumber,
	sectionId,
	title,
	subtitle,
}: AssessmentReportPrintColorWheelPageProps) {
	const isStyleInfo = sectionId === "styleInfo";
	const section = isStyleInfo
		? BSP_COLOR_WHEEL_PRINT_STYLE_INFO
		: BSP_COLOR_WHEEL_STATIC_SECTIONS[sectionId];

	return (
		<AssessmentReportPrintLayout pageNumber={pageNumber}>
			<div className="flex min-h-0 flex-1 flex-col">
				{title ? (
					<header className="flex shrink-0 flex-col gap-1">
						<h2 className="text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-foreground">
							{title}
						</h2>
						{subtitle ? (
							<p className="text-regular font-medium leading-regular text-muted-foreground">
								{subtitle}
							</p>
						) : null}
					</header>
				) : null}
				<div
					className={cn(
						isStyleInfo
							? "flex min-h-0 flex-1 w-full items-center justify-center"
							: "flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden",
					)}
				>
					<img
						src={section.src}
						alt={section.ariaLabel}
						decoding="async"
						className="size-full object-contain"
					/>
				</div>
			</div>
		</AssessmentReportPrintLayout>
	);
}
