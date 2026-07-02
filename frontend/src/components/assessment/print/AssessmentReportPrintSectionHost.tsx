import { cn } from "@/lib";
import type { AssessmentReportPrintSectionHostProps } from "@/types";

export function AssessmentReportPrintSectionHost({
	children,
	className,
}: AssessmentReportPrintSectionHostProps) {
	return (
		<div
			className={cn(
				"flex min-h-0 flex-1 flex-col [&_section]:flex [&_section]:min-h-0 [&_section]:flex-1 [&_section]:flex-col [&_section]:gap-3 [&_section]:overflow-visible [&_section]:rounded-none [&_section]:border-0 [&_section]:bg-transparent [&_section]:p-0 [&_section]:shadow-none [&_img]:h-auto [&_img]:max-w-full",
				className,
			)}
		>
			{children}
		</div>
	);
}
