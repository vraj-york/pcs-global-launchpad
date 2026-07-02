import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	BILLING_MANAGEMENT_PAGE_CONTENT,
	BILLING_PAYMENT_STATUS_FILTER_OPTIONS,
	BILLING_SUBSCRIPTION_STATUS_FILTER_OPTIONS,
} from "@/const";
import { cn } from "@/lib/utils";
import type { BillingManagementFiltersGroupProps } from "@/types";

export function BillingManagementFiltersGroup({
	planTypeId,
	onPlanTypeChange,
	subscriptionStatus,
	onSubscriptionStatusChange,
	paymentStatus,
	onPaymentStatusChange,
	planOptions,
	optionsLoading,
	onOpenMoreFilters,
	moreFiltersAppliedCount,
	className,
}: BillingManagementFiltersGroupProps) {
	return (
		<div
			className={cn("ml-auto flex flex-wrap items-center gap-2.5", className)}
		>
			<Select
				value={planTypeId ?? "all"}
				onValueChange={(v) => onPlanTypeChange(v === "all" ? undefined : v)}
				disabled={optionsLoading}
			>
				<SelectTrigger className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-50">
					<SelectValue
						placeholder={BILLING_MANAGEMENT_PAGE_CONTENT.planFilterAll}
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">
						{BILLING_MANAGEMENT_PAGE_CONTENT.planFilterAll}
					</SelectItem>
					{planOptions.map((p) => (
						<SelectItem key={p.value} value={p.value}>
							{p.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={subscriptionStatus}
				onValueChange={onSubscriptionStatusChange}
				disabled={optionsLoading}
			>
				<SelectTrigger className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-50">
					<SelectValue
						placeholder={BILLING_MANAGEMENT_PAGE_CONTENT.subscriptionStatusAll}
					/>
				</SelectTrigger>
				<SelectContent>
					{BILLING_SUBSCRIPTION_STATUS_FILTER_OPTIONS.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={paymentStatus}
				onValueChange={onPaymentStatusChange}
				disabled={optionsLoading}
			>
				<SelectTrigger className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-50">
					<SelectValue
						placeholder={BILLING_MANAGEMENT_PAGE_CONTENT.paymentStatusAll}
					/>
				</SelectTrigger>
				<SelectContent>
					{BILLING_PAYMENT_STATUS_FILTER_OPTIONS.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button
				type="button"
				variant="outline"
				icon={Filter}
				disabled={optionsLoading}
				className={cn(moreFiltersAppliedCount > 0 && "text-link")}
				aria-label={BILLING_MANAGEMENT_PAGE_CONTENT.filtersButton}
				onClick={onOpenMoreFilters}
			>
				{BILLING_MANAGEMENT_PAGE_CONTENT.filtersButton}
				{moreFiltersAppliedCount > 0 && ` (${moreFiltersAppliedCount})`}
			</Button>
		</div>
	);
}
