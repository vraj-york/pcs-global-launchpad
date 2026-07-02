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
	SUPER_ADMIN_DASHBOARD_PAGE,
	SUPER_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS,
} from "@/const";
import { useSuperAdminDashboardStore } from "@/store";

const C = SUPER_ADMIN_DASHBOARD_PAGE;

export function SuperAdminDashboardFilters() {
	const {
		corporationFilter,
		companyFilter,
		timeFilter,
		corporationOptions,
		companyOptions,
		corporationsLoading,
		companiesLoading,
		setCorporationFilter,
		setCompanyFilter,
		setTimeFilter,
	} = useSuperAdminDashboardStore();

	const companyDisabled =
		corporationFilter === "all" ||
		companiesLoading ||
		corporationOptions.length === 0;

	const corporationItemIds = useMemo(
		() => corporationOptions.map((corp) => corp.id),
		[corporationOptions],
	);

	const corporationLabelById = useMemo(() => {
		const map = new Map<string, string>();
		for (const corp of corporationOptions) {
			map.set(corp.id, corp.legalName);
		}
		return map;
	}, [corporationOptions]);

	const corporationItemToStringLabel = useCallback(
		(id: string) => corporationLabelById.get(id) ?? id,
		[corporationLabelById],
	);

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

	const handleCorporationFilterChange = useCallback(
		(value: string | null) => {
			void setCorporationFilter(value ?? "all");
		},
		[setCorporationFilter],
	);

	const handleCompanyFilterChange = useCallback(
		(value: string | null) => {
			void setCompanyFilter(value ?? "all");
		},
		[setCompanyFilter],
	);

	const corporationComboboxValue =
		corporationsLoading || corporationFilter === "all"
			? null
			: corporationFilter;

	const companyComboboxValue =
		companiesLoading || companyFilter === "all" ? null : companyFilter;

	const companyComboboxPlaceholder = companiesLoading
		? C.companiesLoadingLabel
		: C.allCompaniesLabel;

	return (
		<div className="flex w-full flex-wrap items-center justify-end gap-2">
			<Combobox
				items={corporationItemIds}
				value={corporationComboboxValue}
				onValueChange={handleCorporationFilterChange}
				itemToStringLabel={corporationItemToStringLabel}
				disabled={corporationsLoading}
			>
				<ComboboxInput
					className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-48"
					showClear
					placeholder={C.allCorporationsLabel}
					aria-label={C.corporationFilterAriaLabel}
				/>
				<ComboboxContent>
					<ComboboxList>
						{(item: string) => (
							<ComboboxItem key={item} value={item}>
								{corporationLabelById.get(item) ?? item}
							</ComboboxItem>
						)}
					</ComboboxList>
					<ComboboxEmpty>{C.corporationFilterNoResultsLabel}</ComboboxEmpty>
				</ComboboxContent>
			</Combobox>

			<Combobox
				items={companyItemIds}
				value={companyComboboxValue}
				onValueChange={handleCompanyFilterChange}
				itemToStringLabel={companyItemToStringLabel}
				disabled={companyDisabled}
			>
				<ComboboxInput
					className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-48"
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
						value as (typeof SUPER_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS)[number]["value"],
					)
				}
			>
				<SelectTrigger
					className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-48"
					aria-label={C.timeFilterAriaLabel}
				>
					<SelectValue
						placeholder={
							SUPER_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS.find(
								(opt) => opt.value === "all",
							)?.label
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{SUPER_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
