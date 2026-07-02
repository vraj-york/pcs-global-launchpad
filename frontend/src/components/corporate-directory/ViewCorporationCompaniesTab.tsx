import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getCorporationCompanies } from "@/api/corporations.api";
import { getPricingPlans } from "@/api/pricing.api";
import {
	CompanyCard,
	CompanyCardSkeleton,
} from "@/components/corporate-directory/CompanyCard";
import { Card, CardContent } from "@/components/ui/card";
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
	ADD_NEW_CORPORATION_DROPDOWN_OPTIONS,
	CORPORATE_DIRECTORY_PAGE_CONTENT as C,
	FORM_PLACEHOLDERS,
} from "@/const";
import { useDebounce } from "@/hooks";
import type {
	CompanyCardDisplay,
	CompanyListItem,
	ViewCorporationCompaniesTabProps,
} from "@/types";
import type { PricingPlanType } from "@/types/common/pricing.types";
import { formatFullName, formatPlanEmployeeRange } from "@/utils";

function toCompanyCardDisplay(c: CompanyListItem): CompanyCardDisplay {
	const planName = c.planName || "N/A";
	const plan = c.plan;
	const planEmployeeLabel = formatPlanEmployeeRange(
		plan?.employeeRangeMin ?? null,
		plan?.employeeRangeMax ?? null,
	);
	const planType = c.plan?.planTypeId || "";
	const detailLine1 =
		[c.companyType, c.region ?? c.country].filter(Boolean).join(" • ") || "—";
	const fullName = formatFullName(c?.firstName, c?.lastName);
	const detailLine2 =
		fullName && c.email ? `${fullName} (${c.email})` : (c.email ?? "—");
	return {
		id: c.id,
		legalName: c.legalName,
		planLabel: planName,
		planEmployeeLabel,
		planType,
		showEmployeeBadge: plan != null,
		detailLine1,
		detailLine2,
	};
}

function CompanyListSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			{[1, 2, 3].map((i) => (
				<CompanyCardSkeleton key={i} variant="list" />
			))}
		</div>
	);
}

export function ViewCorporationCompaniesTab({
	corporationId,
	onCompanyClick,
}: ViewCorporationCompaniesTabProps) {
	const [searchInput, setSearchInput] = useState("");
	const searchDebounced = useDebounce(searchInput.trim());
	const [companyType, setCompanyType] = useState<string>("");
	const [region, setRegion] = useState<string>("");
	const [planTypeId, setPlanTypeId] = useState<string>("");
	const [items, setItems] = useState<CompanyListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pricingPlans, setPricingPlans] = useState<PricingPlanType[]>([]);

	// Fetch plan types (same as Add Corporation -> Company Info plan dropdown)
	useEffect(() => {
		let cancelled = false;
		getPricingPlans().then((result) => {
			if (cancelled || !result.ok) return;
			setPricingPlans(result.data);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const planTypeOptions = useMemo(
		() => pricingPlans.map((t) => ({ value: t.id, label: t.name })),
		[pricingPlans],
	);

	const fetchCompanies = useCallback(async () => {
		if (!corporationId) return;
		setLoading(true);
		setError(null);
		const result = await getCorporationCompanies(corporationId, {
			search: searchDebounced || undefined,
			companyType: companyType || undefined,
			region: region || undefined,
			planTypeId: planTypeId || undefined,
		});
		setLoading(false);
		if (!result.ok) {
			setError(result.message ?? "Failed to load companies");
			setItems([]);
			return;
		}
		setItems(result.data.items);
	}, [corporationId, searchDebounced, companyType, region, planTypeId]);

	useEffect(() => {
		fetchCompanies();
	}, [fetchCompanies]);

	const regionOptions = ADD_NEW_CORPORATION_DROPDOWN_OPTIONS.regions;
	const companyTypeOptions = ADD_NEW_CORPORATION_DROPDOWN_OPTIONS.companyTypes;

	return (
		<div className="flex w-full flex-col gap-4">
			<h2 className="text-base font-medium leading-6 text-text-foreground">
				{C.viewCompaniesTitle} ({items.length})
			</h2>

			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
					<InputGroup className="h-9 w-full min-w-0 bg-background lg:max-w-[320px]">
						<InputGroupAddon align="inline-start">
							<Search className="size-4 text-muted-foreground" />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							placeholder={FORM_PLACEHOLDERS.searchByCompanyName}
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							aria-label="Search companies"
						/>
					</InputGroup>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Select
						value={companyType || "all"}
						onValueChange={(v) => setCompanyType(v === "all" ? "" : v)}
					>
						<SelectTrigger
							className="h-9 w-full min-w-0 bg-background sm:w-[180px]"
							aria-label="Filter by company type"
						>
							<SelectValue placeholder={C.viewCompaniesFilterAllCompanyTypes} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								{C.viewCompaniesFilterAllCompanyTypes}
							</SelectItem>
							{companyTypeOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={region || "all"}
						onValueChange={(v) => setRegion(v === "all" ? "" : v)}
					>
						<SelectTrigger
							className="h-9 w-full min-w-0 bg-background sm:w-[180px]"
							aria-label="Filter by region"
						>
							<SelectValue placeholder={C.viewCompaniesFilterAllRegions} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								{C.viewCompaniesFilterAllRegions}
							</SelectItem>
							{regionOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={planTypeId || "all"}
						onValueChange={(v) => setPlanTypeId(v === "all" ? "" : v)}
					>
						<SelectTrigger
							className="h-9 w-full min-w-0 bg-background sm:w-[180px]"
							aria-label="Filter by plan"
						>
							<SelectValue placeholder={C.viewCompaniesFilterAllPlans} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								{C.viewCompaniesFilterAllPlans}
							</SelectItem>
							{planTypeOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{error && <p className="text-small text-destructive">{error}</p>}

			{loading ? (
				<CompanyListSkeleton />
			) : items.length === 0 ? (
				<Card className="w-full rounded-xl border border-border bg-background shadow-none">
					<CardContent className="py-8 text-center text-small text-text-secondary">
						{C.viewCompaniesNoResults}
					</CardContent>
				</Card>
			) : (
				<div className="flex flex-col gap-3">
					{items.map((company) => (
						<CompanyCard
							key={company.id}
							variant="list"
							company={toCompanyCardDisplay(company)}
							onClick={
								onCompanyClick ? () => onCompanyClick(company.id) : undefined
							}
						/>
					))}
				</div>
			)}
		</div>
	);
}
