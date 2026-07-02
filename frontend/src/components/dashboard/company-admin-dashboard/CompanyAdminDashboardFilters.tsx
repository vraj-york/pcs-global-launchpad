import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	COMPANY_ADMIN_ANALYTICS_DASHBOARD_PAGE,
	COMPANY_ADMIN_ANALYTICS_DASHBOARD_TIME_FILTER_OPTIONS,
} from "@/const";
import { useCompanyAdminDashboardStore } from "@/store";

const C = COMPANY_ADMIN_ANALYTICS_DASHBOARD_PAGE;

export function CompanyAdminDashboardFilters() {
	const { timeFilter, setTimeFilter } = useCompanyAdminDashboardStore();

	return (
		<div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
			<Select
				value={timeFilter}
				onValueChange={(value) =>
					void setTimeFilter(
						value as (typeof COMPANY_ADMIN_ANALYTICS_DASHBOARD_TIME_FILTER_OPTIONS)[number]["value"],
					)
				}
			>
				<SelectTrigger
					className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-44"
					aria-label={C.timeFilterAriaLabel}
				>
					<SelectValue
						placeholder={
							COMPANY_ADMIN_ANALYTICS_DASHBOARD_TIME_FILTER_OPTIONS.find(
								(opt) => opt.value === "all",
							)?.label
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{COMPANY_ADMIN_ANALYTICS_DASHBOARD_TIME_FILTER_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
