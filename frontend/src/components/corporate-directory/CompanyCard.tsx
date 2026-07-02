import { Building2, ChevronRight, SquarePen, Trash2 } from "lucide-react";
import { BSPBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ADD_NEW_CORPORATION_CONTENT } from "@/const";
import { cn } from "@/lib/utils";
import type { CompanyCardProps, CompanyCardSkeletonVariant } from "@/types";

const COMPANY_SETUP = ADD_NEW_CORPORATION_CONTENT.advancedSteps.companySetup;

export function CompanyCard(props: CompanyCardProps) {
	const { company, variant } = props;
	const {
		id,
		legalName,
		planLabel,
		planEmployeeLabel,
		planType,
		showEmployeeBadge = false,
		detailLine1,
		detailLine2,
	} = company;

	const isList = variant === "list";
	const hasClick = isList && props.onClick;

	return (
		<Card
			className={cn(
				"w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none transition-colors",
				hasClick && "cursor-pointer",
			)}
			onClick={hasClick ? props.onClick : undefined}
		>
			<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
				{/* Icon + content */}
				<div className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-0">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-bg p-2">
						<Building2 className="size-4 text-link" aria-hidden />
					</div>
					<div className="min-w-0 flex-1 space-y-1">
						<div className="flex min-h-6 flex-wrap items-center gap-2">
							<span className="min-w-0 truncate text-sm font-medium leading-6 text-text-foreground capitalize">
								{legalName}
							</span>
							{planType && <BSPBadge type={planType}>{planLabel}</BSPBadge>}
							{showEmployeeBadge && planEmployeeLabel && (
								<BSPBadge type="success">{planEmployeeLabel}</BSPBadge>
							)}
						</div>
						<p className="text-xs leading-4 text-text-secondary">
							{detailLine1}
						</p>
						<p className="min-w-0 truncate text-xs leading-4 text-muted-foreground">
							{detailLine2}
						</p>
					</div>
				</div>
				{/* List: chevron when clickable */}
				{isList && hasClick && (
					<div className="flex shrink-0 items-center sm:pl-2">
						<ChevronRight
							className="size-5 text-muted-foreground"
							aria-hidden
						/>
					</div>
				)}
				{/* Edit: actions aligned to end */}
				{variant === "edit" && (
					<div className="flex shrink-0 items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							icon={SquarePen}
							onClick={(e) => {
								e.stopPropagation();
								props.onEdit(id);
							}}
							aria-label={COMPANY_SETUP.editAriaLabel}
							className="size-9 rounded-lg p-0 text-icon-primary hover:bg-muted"
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							icon={Trash2}
							onClick={(e) => {
								e.stopPropagation();
								props.onDelete(id);
							}}
							aria-label={COMPANY_SETUP.deleteAriaLabel}
							className="size-9 rounded-lg p-0 text-icon-error hover:bg-muted"
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function CompanyCardSkeleton({
	variant = "edit",
}: {
	variant?: CompanyCardSkeletonVariant;
} = {}) {
	const showActions = variant === "edit";
	return (
		<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none transition-colors">
			<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
				<div className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-0">
					<Skeleton className="size-10 shrink-0 rounded-xl" aria-hidden />
					<div className="min-w-0 flex-1 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<Skeleton className="h-5 w-32" aria-hidden />
							<Skeleton className="h-6 w-20 rounded-lg" aria-hidden />
						</div>
						<Skeleton className="h-4 w-24" aria-hidden />
						<Skeleton className="h-4 w-40" aria-hidden />
					</div>
				</div>
				{showActions && (
					<div className="flex shrink-0 gap-2">
						<Skeleton className="size-9 rounded-lg" aria-hidden />
						<Skeleton className="size-9 rounded-lg" aria-hidden />
					</div>
				)}
			</CardContent>
		</Card>
	);
}
