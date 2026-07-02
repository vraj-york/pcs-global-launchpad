import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPromoCodeUsageList } from "@/api";
import { DataTable, TableSkeleton, WhiteBox } from "@/components";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DATA_TABLE_CONFIG,
	FORM_PLACEHOLDERS,
	PROMO_CODE_OUTCOME_OPTIONS,
	PROMO_CODE_TIME_OPTIONS,
	PROMO_CODES_PAGE_CONTENT,
} from "@/const";
import { useDebounce } from "@/hooks";
import { getPromoCodeUsageHistoryColumns } from "@/tables";
import type {
	ListPromoCodeUsageQuery,
	PromoCodeUsageListItem,
	PromoUsageSortBy,
	SortDirection,
} from "@/types";

const C = PROMO_CODES_PAGE_CONTENT;
const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;
const filterSelectTriggerClass =
	"h-9 w-full min-w-0 rounded-lg bg-background sm:w-40";

function mapUsageSortToApi(
	columnId: string | null,
	direction: SortDirection,
): { sortBy: PromoUsageSortBy; sortOrder: "asc" | "desc" } {
	const sortOrder = direction === "desc" ? "desc" : "asc";
	switch (columnId) {
		case "userName":
			return { sortBy: "userDisplayName", sortOrder };
		case "status":
			return { sortBy: "outcome", sortOrder };
		case "corporation":
			return { sortBy: "corporationName", sortOrder };
		case "company":
			return { sortBy: "companyName", sortOrder };
		case "dateTime":
			return { sortBy: "occurredAt", sortOrder };
		default:
			return { sortBy: "occurredAt", sortOrder: "desc" };
	}
}

function buildUsageListQuery(params: {
	pageIndex: number;
	debouncedSearch: string;
	outcomeFilter: string;
	corporationFilter: string;
	companyFilter: string;
	timeFilter: string;
	sortColumnId: string | null;
	sortDirection: SortDirection;
}): ListPromoCodeUsageQuery {
	const { sortBy, sortOrder } = mapUsageSortToApi(
		params.sortColumnId,
		params.sortDirection,
	);
	return {
		page: params.pageIndex + 1,
		pageSize: PAGE_SIZE,
		sortBy,
		sortOrder,
		...(params.debouncedSearch ? { search: params.debouncedSearch } : {}),
		...(params.outcomeFilter !== "all"
			? {
					outcome: params.outcomeFilter as "success" | "failed",
				}
			: {}),
		...(params.corporationFilter !== "all"
			? { corporationId: params.corporationFilter }
			: {}),
		...(params.companyFilter !== "all"
			? { companyId: params.companyFilter }
			: {}),
		...(params.timeFilter !== "all"
			? {
					time: params.timeFilter as ListPromoCodeUsageQuery["time"],
				}
			: {}),
	};
}

export function PromoCodeUsageHistoryPanel({
	promoCodeId,
}: {
	promoCodeId: string;
}) {
	const [items, setItems] = useState<PromoCodeUsageListItem[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search.trim(), 400);
	const [outcomeFilter, setOutcomeFilter] = useState("all");
	const [corporationFilter, setCorporationFilter] = useState("all");
	const [companyFilter, setCompanyFilter] = useState("all");
	const [timeFilter, setTimeFilter] = useState("all");

	const [corpOptions, setCorpOptions] = useState<
		{ id: string; name: string }[]
	>([]);
	const [companyOptions, setCompanyOptions] = useState<
		{ id: string; name: string }[]
	>([]);

	const [pageIndex, setPageIndex] = useState(0);
	const [sortColumnId, setSortColumnId] = useState<string | null>("dateTime");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	const listQuery = useMemo(
		() =>
			buildUsageListQuery({
				pageIndex,
				debouncedSearch,
				outcomeFilter,
				corporationFilter,
				companyFilter,
				timeFilter,
				sortColumnId,
				sortDirection,
			}),
		[
			pageIndex,
			debouncedSearch,
			outcomeFilter,
			corporationFilter,
			companyFilter,
			timeFilter,
			sortColumnId,
			sortDirection,
		],
	);

	const fetchUsage = useCallback(async () => {
		setLoading(true);
		setError(null);
		const res = await getPromoCodeUsageList(promoCodeId, listQuery);
		if (!res.ok) {
			setItems([]);
			setTotalCount(0);
			setError(C.detail.usage.loadError);
			setLoading(false);
			return;
		}
		setItems(res.data.items);
		setTotalCount(res.data.pagination.total);
		setCorpOptions(res.data.filterOptions.corporations);
		setCompanyOptions(res.data.filterOptions.companies);
		setLoading(false);
	}, [promoCodeId, listQuery]);

	useEffect(() => {
		void fetchUsage();
	}, [fetchUsage]);

	useEffect(() => {
		setPageIndex(0);
	}, [
		debouncedSearch,
		outcomeFilter,
		corporationFilter,
		companyFilter,
		timeFilter,
		sortColumnId,
		sortDirection,
	]);

	const serverSort = useMemo(
		() => ({
			sortColumnId,
			sortDirection,
			onSort: (columnId: string) => {
				if (sortColumnId !== columnId) {
					setSortColumnId(columnId);
					setSortDirection("asc");
				} else {
					setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
				}
			},
		}),
		[sortColumnId, sortDirection],
	);

	const columns = useMemo(() => getPromoCodeUsageHistoryColumns(), []);

	return (
		<WhiteBox padding="md" className="shadow-sm">
			<div className="flex w-full min-w-0 flex-wrap items-center gap-4">
				<InputGroup className="h-9 w-full min-w-48 shrink-0 rounded-lg bg-background sm:w-80">
					<InputGroupAddon align="inline-start">
						<Search className="size-3.5 text-muted-foreground" aria-hidden />
					</InputGroupAddon>
					<InputGroupInput
						type="search"
						placeholder={FORM_PLACEHOLDERS.searchByPromoCodeUsage}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						aria-label={FORM_PLACEHOLDERS.searchByPromoCodeUsage}
					/>
				</InputGroup>
				<div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
					<Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
						<SelectTrigger className={filterSelectTriggerClass}>
							<SelectValue placeholder={C.detail.usage.filters.allStatus} />
						</SelectTrigger>
						<SelectContent>
							{PROMO_CODE_OUTCOME_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={corporationFilter}
						onValueChange={setCorporationFilter}
					>
						<SelectTrigger className={filterSelectTriggerClass}>
							<SelectValue
								placeholder={C.detail.usage.filters.allCorporations}
							/>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								{C.detail.usage.filters.allCorporations}
							</SelectItem>
							{corpOptions.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.name || c.id}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={companyFilter} onValueChange={setCompanyFilter}>
						<SelectTrigger className={filterSelectTriggerClass}>
							<SelectValue placeholder={C.detail.usage.filters.allCompanies} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								{C.detail.usage.filters.allCompanies}
							</SelectItem>
							{companyOptions.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.name || c.id}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={timeFilter} onValueChange={setTimeFilter}>
						<SelectTrigger className={filterSelectTriggerClass}>
							<SelectValue placeholder={C.detail.usage.filters.allTime} />
						</SelectTrigger>
						<SelectContent>
							{PROMO_CODE_TIME_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="mt-6 min-w-0">
				{loading ? (
					<TableSkeleton
						columns={columns}
						rowCount={PAGE_SIZE}
						showPagination
						fixedHeight
					/>
				) : error ? (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				) : (
					<DataTable<PromoCodeUsageListItem>
						data={items}
						columns={columns}
						pageSize={PAGE_SIZE}
						emptyMessage={C.detail.usage.empty}
						fixedHeight
						serverPagination={{
							totalCount,
							pageIndex,
							onPageChange: setPageIndex,
						}}
						serverSort={serverSort}
					/>
				)}
			</div>
		</WhiteBox>
	);
}
