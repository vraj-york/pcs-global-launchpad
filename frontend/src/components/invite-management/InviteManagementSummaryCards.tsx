import { CircleCheckBig, NotebookPen, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { INVITE_MANAGEMENT_LIST_SUMMARY } from "@/const";
import { cn } from "@/lib/utils";
import type {
	InviteManagementSummaryCardConfig,
	InviteManagementSummaryCardsProps,
} from "@/types";

const SUMMARY_CARDS: InviteManagementSummaryCardConfig[] = [
	{
		key: "total",
		label: INVITE_MANAGEMENT_LIST_SUMMARY.totalAssessments,
		icon: NotebookPen,
		iconShellClassName: "bg-brand-primary-bg",
		iconClassName: "text-brand-primary",
		getValue: (summary) => String(summary?.totalAssessments ?? 0),
	},
	{
		key: "completed",
		label: INVITE_MANAGEMENT_LIST_SUMMARY.completedAssessments,
		icon: CircleCheckBig,
		iconShellClassName: "bg-success-bg",
		iconClassName: "text-icon-success",
		alignTop: true,
		getValue: (summary) => String(summary?.completedAssessments ?? 0),
	},
	{
		key: "rate",
		label: INVITE_MANAGEMENT_LIST_SUMMARY.completionRate,
		icon: Star,
		iconShellClassName: "bg-warning-bg",
		iconClassName: "text-interactive-warning-active",
		getValue: (summary) => `${summary?.completionRatePercent ?? 0}%`,
	},
];

export function InviteManagementSummaryCards({
	summary,
	loading = false,
}: InviteManagementSummaryCardsProps) {
	return (
		<div className="flex w-full flex-col gap-4 md:flex-row">
			{SUMMARY_CARDS.map((card) => {
				const Icon = card.icon;

				return (
					<div
						key={card.key}
						className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden rounded-xl border border-border bg-background p-4"
					>
						<div
							className={cn(
								"flex w-full gap-4",
								card.alignTop ? "items-start" : "items-center",
							)}
						>
							<div
								className={cn(
									"flex size-12 shrink-0 items-center justify-center rounded-xl p-2",
									card.iconShellClassName,
								)}
							>
								<Icon
									className={cn("size-7 shrink-0", card.iconClassName)}
									aria-hidden
								/>
							</div>
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								{loading ? (
									<Skeleton
										className={cn(
											"h-6 rounded-md",
											card.key === "rate" ? "w-14" : "w-10",
										)}
										aria-hidden
									/>
								) : (
									<p className="text-heading-4 font-semibold leading-heading-4 text-text-foreground">
										{card.getValue(summary)}
									</p>
								)}
								<p className="text-small font-normal leading-small text-muted-foreground">
									{card.label}
								</p>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
