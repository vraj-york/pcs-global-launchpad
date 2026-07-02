import { PartyPopper } from "lucide-react";
import { AssessmentReportPanel } from "@/components";
import { cn } from "@/lib/utils";
import type { DecreaseStressPrimaryCardProps } from "@/types";

export function DecreaseStressPrimaryCard({
	content,
	panelClassName,
	iconWrapperClassName,
	iconClassName,
	textClassName,
	titleClassName,
	leadClassName,
	bodyClassName,
	useCompactPadding = false,
}: DecreaseStressPrimaryCardProps) {
	return (
		<AssessmentReportPanel
			variant="info"
			padding={useCompactPadding ? "none" : "lg"}
			className={cn(
				"flex w-full min-w-0 shrink-0 flex-col gap-6 overflow-visible",
				panelClassName,
			)}
		>
			<div
				className={cn(
					"flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary p-1",
					iconWrapperClassName,
				)}
			>
				<PartyPopper
					className={cn("size-9 shrink-0 text-light-same", iconClassName)}
					strokeWidth={1.5}
					aria-hidden
				/>
			</div>
			<div
				className={cn(
					"flex w-full min-w-0 shrink-0 flex-col gap-3",
					textClassName,
				)}
			>
				{content.title ? (
					<h3
						className={cn(
							"text-heading-3 font-semibold leading-heading-3 tracking-heading-3 text-primary",
							titleClassName,
						)}
					>
						{content.title}
					</h3>
				) : null}
				{content.lead ? (
					<p
						className={cn(
							"text-regular font-semibold leading-regular text-foreground",
							leadClassName,
						)}
					>
						{content.lead}
					</p>
				) : null}
				{content.body ? (
					<p
						className={cn(
							"text-regular font-normal leading-regular text-foreground",
							bodyClassName,
						)}
					>
						{content.body}
					</p>
				) : null}
			</div>
		</AssessmentReportPanel>
	);
}
