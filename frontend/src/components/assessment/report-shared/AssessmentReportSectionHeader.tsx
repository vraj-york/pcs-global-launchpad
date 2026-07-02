import { cn } from "@/lib/utils";
import type { AssessmentReportSectionHeaderProps } from "@/types";

export function AssessmentReportSectionHeader({
	title,
	subtitle,
	className,
}: AssessmentReportSectionHeaderProps) {
	return (
		<header className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
			<h2 className="text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-foreground">
				{title}
			</h2>
			{subtitle ? (
				<p className="text-regular font-medium leading-regular text-muted-foreground">
					{subtitle}
				</p>
			) : null}
		</header>
	);
}
