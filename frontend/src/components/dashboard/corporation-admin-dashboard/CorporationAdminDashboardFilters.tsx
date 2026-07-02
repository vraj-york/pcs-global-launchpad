import { useCallback, useMemo } from "react";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CORPORATION_ADMIN_DASHBOARD_PAGE,
	CORPORATION_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS,
} from "@/const";
import { useCorporationAdminDashboardStore } from "@/store";

const C = CORPORATION_ADMIN_DASHBOARD_PAGE;

export function CorporationAdminDashboardFilters() {
	const {
		companyFilter,
		timeFilter,
		companyOptions,
		companiesLoading,
		setCompanyFilter,
		setTimeFilter,
	} = useCorporationAdminDashboardStore();

	const companyItemIds = useMemo(
		() => companyOptions.map((company) => company.id),
		[companyOptions],
	);

	const companyLabelById = useMemo(() => {
		const map = new Map<string, string>();
		for (const company of companyOptions) {
			map.set(company.id, company.legalName);
		}
		return map;
	}, [companyOptions]);

	const companyItemToStringLabel = useCallback(
		(id: string) => companyLabelById.get(id) ?? id,
		[companyLabelById],
	);

	const handleCompanyFilterChange = useCallback(
		(value: string | null) => {
			void setCompanyFilter(value ?? "all");
		},
		[setCompanyFilter],
	);

	const companyComboboxValue =
		companiesLoading || companyFilter === "all" ? null : companyFilter;

	const companyComboboxPlaceholder = companiesLoading
		? C.companiesLoadingLabel
		: C.allCompaniesLabel;

	return (
		<div className="flex w-full flex-wrap items-center justify-between gap-2">
			<Combobox
				items={companyItemIds}
				value={companyComboboxValue}
				onValueChange={handleCompanyFilterChange}
				itemToStringLabel={companyItemToStringLabel}
				disabled={companiesLoading}
			>
				<ComboboxInput
					className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-80"
					showClear
					placeholder={companyComboboxPlaceholder}
					aria-label={C.companyFilterAriaLabel}
					aria-busy={companiesLoading}
				/>
				<ComboboxContent>
					<ComboboxList>
						{(item: string) => (
							<ComboboxItem key={item} value={item}>
								{companyLabelById.get(item) ?? item}
							</ComboboxItem>
						)}
					</ComboboxList>
					<ComboboxEmpty>{C.companyFilterNoResultsLabel}</ComboboxEmpty>
				</ComboboxContent>
			</Combobox>

			<Select
				value={timeFilter}
				onValueChange={(value) =>
					void setTimeFilter(
						value as (typeof CORPORATION_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS)[number]["value"],
					)
				}
			>
				<SelectTrigger
					className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-44"
					aria-label={C.timeFilterAriaLabel}
				>
					<SelectValue
						placeholder={
							CORPORATION_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS.find(
								(opt) => opt.value === "all",
							)?.label
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{CORPORATION_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
