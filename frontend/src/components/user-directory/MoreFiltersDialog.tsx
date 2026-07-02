import { Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	FORM_PLACEHOLDERS,
	MORE_FILTERS_CONTENT,
	MORE_FILTERS_TIMEZONE_OPTIONS,
} from "@/const";
import { cn } from "@/lib/utils";
import type { MoreFiltersDialogProps, UserMoreFiltersState } from "@/types";

export function MoreFiltersDialog({
	open,
	onOpenChange,
	filters,
	onApply,
	corporationOptions,
	companyOptions,
	optionsLoading = false,
	showCorporationFilter = true,
	showCompanyFilter = true,
}: MoreFiltersDialogProps) {
	const [localFilters, setLocalFilters] =
		useState<UserMoreFiltersState>(filters);
	const [corpSearch, setCorpSearch] = useState("");
	const [companySearch, setCompanySearch] = useState("");

	const sanitizeFilters = useCallback(
		(next: UserMoreFiltersState): UserMoreFiltersState => ({
			corporationIds: showCorporationFilter ? next.corporationIds : [],
			companyIds: showCompanyFilter ? next.companyIds : [],
			timeZones: next.timeZones,
		}),
		[showCorporationFilter, showCompanyFilter],
	);

	const visibleLocalFilters = useMemo(
		() => sanitizeFilters(localFilters),
		[localFilters, sanitizeFilters],
	);

	const corporationLabelById = useMemo(() => {
		const m = new Map<string, string>();
		for (const c of corporationOptions) m.set(c.id, c.label);
		return m;
	}, [corporationOptions]);

	const companyLabelById = useMemo(() => {
		const m = new Map<string, string>();
		for (const c of companyOptions) m.set(c.id, c.label);
		return m;
	}, [companyOptions]);

	const handleOpen = useCallback(
		(isOpen: boolean) => {
			if (isOpen) {
				setLocalFilters(filters);
				setCorpSearch("");
				setCompanySearch("");
			}
			onOpenChange(isOpen);
		},
		[filters, onOpenChange],
	);

	const draftFilterCount = useMemo(() => {
		return (
			(showCorporationFilter ? visibleLocalFilters.corporationIds.length : 0) +
			(showCompanyFilter ? visibleLocalFilters.companyIds.length : 0) +
			visibleLocalFilters.timeZones.length
		);
	}, [visibleLocalFilters, showCorporationFilter, showCompanyFilter]);

	const filteredCorpOptions = useMemo(() => {
		if (!corpSearch.trim()) return corporationOptions;
		const term = corpSearch.trim().toLowerCase();
		return corporationOptions.filter((c) =>
			c.label.toLowerCase().includes(term),
		);
	}, [corpSearch, corporationOptions]);

	const filteredCompanyOptions = useMemo(() => {
		if (!companySearch.trim()) return companyOptions;
		const term = companySearch.trim().toLowerCase();
		return companyOptions.filter((c) => c.label.toLowerCase().includes(term));
	}, [companySearch, companyOptions]);

	const handleToggleCorporation = useCallback((id: string) => {
		setLocalFilters((prev) => ({
			...prev,
			corporationIds: prev.corporationIds.includes(id)
				? prev.corporationIds.filter((c) => c !== id)
				: [...prev.corporationIds, id],
		}));
	}, []);

	const handleRemoveCorporation = useCallback((id: string) => {
		setLocalFilters((prev) => ({
			...prev,
			corporationIds: prev.corporationIds.filter((c) => c !== id),
		}));
	}, []);

	const handleToggleCompany = useCallback((id: string) => {
		setLocalFilters((prev) => ({
			...prev,
			companyIds: prev.companyIds.includes(id)
				? prev.companyIds.filter((c) => c !== id)
				: [...prev.companyIds, id],
		}));
	}, []);

	const handleToggleTimeZone = useCallback((tz: string) => {
		setLocalFilters((prev) => ({
			...prev,
			timeZones: prev.timeZones.includes(tz)
				? prev.timeZones.filter((t) => t !== tz)
				: [...prev.timeZones, tz],
		}));
	}, []);

	const handleClearAll = useCallback(() => {
		const cleared = sanitizeFilters({
			corporationIds: [],
			companyIds: [],
			timeZones: [],
		});
		setLocalFilters(cleared);
		onApply(cleared);
		onOpenChange(false);
	}, [onApply, onOpenChange, sanitizeFilters]);

	const handleApply = useCallback(() => {
		const next = sanitizeFilters(localFilters);
		onApply(next);
		onOpenChange(false);
	}, [localFilters, onApply, onOpenChange, sanitizeFilters]);

	return (
		<Dialog open={open} onOpenChange={handleOpen}>
			<DialogContent
				showCloseButton={false}
				className="max-w-md gap-0 overflow-hidden rounded-xl border border-border p-0"
			>
				<DialogHeader className="flex flex-row items-center justify-between gap-4 border-b border-border p-3">
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
						<DialogTitle className="shrink-0 text-left text-base font-semibold text-text-foreground">
							{MORE_FILTERS_CONTENT.title}
						</DialogTitle>
						{draftFilterCount > 0 && (
							<span className="text-sm font-medium text-link">
								({draftFilterCount} applied)
							</span>
						)}
					</div>
					<DialogClose asChild>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="size-8 shrink-0 rounded-lg border-border bg-background p-0 text-icon-secondary hover:bg-muted hover:text-text-foreground"
							aria-label="Close"
							icon={X}
						/>
					</DialogClose>
				</DialogHeader>

				<div className="flex max-h-[min(60vh,420px)] flex-col gap-4 overflow-y-auto px-5 py-4">
					{showCorporationFilter ? (
						<div className="flex flex-col gap-3">
							<span className="text-small text-muted-foreground">
								{MORE_FILTERS_CONTENT.corporationLabel}
								{visibleLocalFilters.corporationIds.length > 0 &&
									` (${visibleLocalFilters.corporationIds.length})`}
							</span>
							<InputGroup className="h-9 w-full rounded-lg">
								<InputGroupInput
									type="text"
									placeholder={FORM_PLACEHOLDERS.searchForCorporation}
									value={corpSearch}
									onChange={(e) => setCorpSearch(e.target.value)}
									disabled={optionsLoading}
								/>
								<InputGroupAddon align="inline-end">
									<Search className="size-4 text-muted-foreground" />
								</InputGroupAddon>
							</InputGroup>

							{corpSearch.trim() && filteredCorpOptions.length > 0 && (
								<div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-1">
									{filteredCorpOptions.map((corp) => (
										<button
											key={corp.id}
											type="button"
											onClick={() => {
												handleToggleCorporation(corp.id);
												setCorpSearch("");
											}}
											className={`cursor-pointer rounded px-2 py-1.5 text-left text-small text-text-foreground hover:bg-card-foreground ${visibleLocalFilters.corporationIds.includes(corp.id) ? "bg-card-foreground" : ""}`}
										>
											{corp.label}
										</button>
									))}
								</div>
							)}

							{visibleLocalFilters.corporationIds.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{visibleLocalFilters.corporationIds.map((id) => (
										<span
											key={id}
											className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gray-bg px-2 py-1.5 text-mini text-brand-gray-text"
										>
											{corporationLabelById.get(id) ?? id}
											<button
												type="button"
												onClick={() => handleRemoveCorporation(id)}
												className="cursor-pointer text-muted-foreground hover:text-text-foreground"
												aria-label={`Remove ${corporationLabelById.get(id) ?? id}`}
											>
												<X className="size-2.5" />
											</button>
										</span>
									))}
								</div>
							)}
						</div>
					) : null}

					{showCorporationFilter && showCompanyFilter ? (
						<div className="h-px w-full bg-border" />
					) : null}

					{showCompanyFilter ? (
						<div className="flex flex-col gap-3">
							<span className="text-small text-muted-foreground">
								{MORE_FILTERS_CONTENT.companyLabel}
								{visibleLocalFilters.companyIds.length > 0 &&
									` (${visibleLocalFilters.companyIds.length})`}
							</span>
							<InputGroup className="h-9 w-full rounded-lg">
								<InputGroupInput
									type="text"
									placeholder={FORM_PLACEHOLDERS.searchForCompany}
									value={companySearch}
									onChange={(e) => setCompanySearch(e.target.value)}
									disabled={optionsLoading}
								/>
								<InputGroupAddon align="inline-end">
									<Search className="size-4 text-muted-foreground" />
								</InputGroupAddon>
							</InputGroup>

							{companySearch.trim() && filteredCompanyOptions.length > 0 && (
								<div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-1">
									{filteredCompanyOptions.map((company) => (
										<button
											key={company.id}
											type="button"
											onClick={() => {
												handleToggleCompany(company.id);
												setCompanySearch("");
											}}
											className={`cursor-pointer rounded px-2 py-1.5 text-left text-small text-text-foreground hover:bg-card-foreground ${visibleLocalFilters.companyIds.includes(company.id) ? "bg-card-foreground" : ""}`}
										>
											{company.label}
										</button>
									))}
								</div>
							)}

							{visibleLocalFilters.companyIds.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{visibleLocalFilters.companyIds.map((id) => (
										<span
											key={id}
											className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gray-bg px-2 py-1.5 text-mini text-brand-gray-text"
										>
											{companyLabelById.get(id) ?? id}
											<button
												type="button"
												onClick={() => handleToggleCompany(id)}
												className="cursor-pointer text-muted-foreground hover:text-text-foreground"
												aria-label={`Remove ${companyLabelById.get(id) ?? id}`}
											>
												<X className="size-2.5" />
											</button>
										</span>
									))}
								</div>
							)}
						</div>
					) : null}

					{(showCorporationFilter || showCompanyFilter) && (
						<div className="h-px w-full bg-border" />
					)}

					<div className="flex flex-col gap-3">
						<span className="text-small text-muted-foreground">
							{MORE_FILTERS_CONTENT.timeZoneLabel}
							{visibleLocalFilters.timeZones.length > 0 &&
								` (${visibleLocalFilters.timeZones.length})`}
						</span>
						<div className="grid grid-cols-2 gap-x-2.5 gap-y-2">
							{MORE_FILTERS_TIMEZONE_OPTIONS.map((tz) => {
								const checkboxId = `tz-${tz.value.replace(/\s|\(/g, "-")}`;
								return (
									<div
										key={tz.value}
										className="flex cursor-pointer items-center gap-2 py-1"
									>
										<Checkbox
											id={checkboxId}
											checked={visibleLocalFilters.timeZones.includes(tz.value)}
											onCheckedChange={() => handleToggleTimeZone(tz.value)}
										/>
										<label
											htmlFor={checkboxId}
											className="cursor-pointer text-small text-text-foreground"
										>
											{tz.label}
										</label>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				<DialogFooter
					className={cn(
						"mt-0 flex-row items-center justify-between gap-3 border-t border-border px-3 py-3 sm:justify-between",
					)}
				>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleClearAll}
					>
						{MORE_FILTERS_CONTENT.clearAllButton}
					</Button>
					<Button type="button" size="sm" onClick={handleApply}>
						{MORE_FILTERS_CONTENT.applyFiltersButton}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
