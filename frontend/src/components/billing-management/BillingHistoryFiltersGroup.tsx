import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	BILLING_HISTORY_ACTOR_FILTER_OPTIONS,
	BILLING_HISTORY_EVENT_TYPE_FILTER_OPTIONS,
	BILLING_HISTORY_PAGE_CONTENT,
} from "@/const";
import { cn } from "@/lib/utils";
import type { BillingHistoryFiltersGroupProps } from "@/types";

export function BillingHistoryFiltersGroup({
	eventType,
	onEventTypeChange,
	planTypeId,
	onPlanTypeChange,
	actorKind,
	onActorKindChange,
	planOptions,
	optionsLoading,
	className,
}: BillingHistoryFiltersGroupProps) {
	return (
		<div
			className={cn(
				"flex h-9 shrink-0 flex-wrap items-center gap-2.5",
				className,
			)}
		>
			<Select
				value={eventType}
				onValueChange={onEventTypeChange}
				disabled={optionsLoading}
			>
				<SelectTrigger className="h-9 w-50 shrink-0 rounded-lg bg-background">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{BILLING_HISTORY_EVENT_TYPE_FILTER_OPTIONS.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={planTypeId ?? "all"}
				onValueChange={(v) => onPlanTypeChange(v === "all" ? undefined : v)}
				disabled={optionsLoading}
			>
				<SelectTrigger className="h-9 w-50 shrink-0 rounded-lg bg-background">
					<SelectValue
						placeholder={BILLING_HISTORY_PAGE_CONTENT.planFilterAll}
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">
						{BILLING_HISTORY_PAGE_CONTENT.planFilterAll}
					</SelectItem>
					{planOptions.map((p) => (
						<SelectItem key={p.value} value={p.value}>
							{p.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={actorKind}
				onValueChange={onActorKindChange}
				disabled={optionsLoading}
			>
				<SelectTrigger className="h-9 w-50 shrink-0 rounded-lg bg-background">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{BILLING_HISTORY_ACTOR_FILTER_OPTIONS.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
