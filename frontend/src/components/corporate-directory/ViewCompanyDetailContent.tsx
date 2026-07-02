import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCorporationCompanies } from "@/api/corporations.api";
import { DetailRow } from "@/components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CORPORATE_DIRECTORY_PAGE_CONTENT as C,
	EMPTY_VALUE_PLACEHOLDER,
	FORM_PLACEHOLDERS,
} from "@/const";
import type { CompanyListItem, ViewCompanyDetailContentProps } from "@/types";
import {
	formatAddress,
	formatCode,
	formatFullName,
	formatPlanEmployeeRange,
} from "@/utils";

export function ViewCompanyDetailContent({
	corporationId,
	initialCompanyId,
	onBackToCompanies,
}: ViewCompanyDetailContentProps) {
	const [searchParams, setSearchParams] = useSearchParams();
	const [companies, setCompanies] = useState<CompanyListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(initialCompanyId);

	const fetchCompanies = useCallback(async () => {
		if (!corporationId) return;
		setLoading(true);
		setError(null);
		const result = await getCorporationCompanies(corporationId);
		setLoading(false);
		if (!result.ok) {
			setError(result.message ?? "Failed to load companies");
			setCompanies([]);
			return;
		}
		setCompanies(result.data.items);
	}, [corporationId]);

	useEffect(() => {
		fetchCompanies();
	}, [fetchCompanies]);

	// Sync selected id when URL changes (e.g. browser back or shared link)
	useEffect(() => {
		if (initialCompanyId !== selectedId) {
			setSelectedId(initialCompanyId);
		}
	}, [initialCompanyId]);

	const selectedCompany = useMemo(
		() => (selectedId ? companies.find((c) => c.id === selectedId) : null),
		[companies, selectedId],
	);

	const handleCompanyChange = (value: string) => {
		setSelectedId(value || null);
		const next = new URLSearchParams(searchParams);
		if (value) next.set("companyId", value);
		else next.delete("companyId");
		setSearchParams(next, { replace: true });
	};

	if (loading) {
		return (
			<div className="flex w-full flex-col gap-4">
				<div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<div className="h-64 animate-pulse rounded-xl bg-muted" />
					<div className="h-64 animate-pulse rounded-xl bg-muted" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col gap-4">
				<Button
					type="button"
					variant="outline"
					icon={ArrowLeft}
					onClick={onBackToCompanies}
					className="w-fit"
					aria-label={C.viewCompanyDetailBackToCompanies}
				>
					{C.viewCompanyDetailBackToCompanies}
				</Button>
				<p className="text-small text-destructive">{error}</p>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-4 min-h-0 overflow-auto">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<Button
					type="button"
					variant="outline"
					icon={ArrowLeft}
					onClick={onBackToCompanies}
					className="w-fit"
					aria-label={C.viewCompanyDetailBackToCompanies}
				>
					{C.viewCompanyDetailBackToCompanies}
				</Button>
				<Select value={selectedId ?? ""} onValueChange={handleCompanyChange}>
					<SelectTrigger
						className="h-9 w-full min-w-0 bg-background sm:w-[280px]"
						aria-label="Select company"
					>
						<SelectValue placeholder={FORM_PLACEHOLDERS.selectCompany} />
					</SelectTrigger>
					<SelectContent>
						{companies.map((c) => (
							<SelectItem key={c.id} value={c.id}>
								{c.legalName || c.id}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{selectedCompany ? (
				<div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-2">
					<Card className="w-full min-w-0 gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
						<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
							<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
								{C.viewCardCompanyDetails}
							</CardTitle>
						</CardHeader>
						<CardContent className="flex w-full flex-col gap-4 p-4 pb-0">
							<div className="flex w-full flex-col gap-3">
								<DetailRow
									label={C.viewFieldCompanyId}
									value={formatCode(selectedCompany.companyCode, "COMP")}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldCompanyLegalName}
									value={selectedCompany.legalName}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldCompanyType}
									value={selectedCompany.companyType}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldOfficeType}
									value={selectedCompany.officeType}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldRegion}
									value={selectedCompany.region}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldIndustry}
									value={selectedCompany.industry}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldPlan}
									value={selectedCompany.planName}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldPlanLevel}
									value={formatPlanEmployeeRange(
										selectedCompany.plan?.employeeRangeMin ?? null,
										selectedCompany.plan?.employeeRangeMax ?? null,
									)}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldSecurityPosture}
									value={selectedCompany.securityPosture ?? undefined}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldCompanyAddress}
									value={formatAddress(selectedCompany)}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldCompanyPhoneNo}
									value={selectedCompany.phoneNo}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
							</div>
						</CardContent>
					</Card>
					<Card className="w-full min-w-0 gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
						<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
							<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
								{C.viewCardCompanyAdmin}
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 p-4 pb-0">
							<div className="flex w-full flex-col gap-3">
								<DetailRow
									label={C.viewFieldFullName}
									value={formatFullName(
										selectedCompany?.firstName,
										selectedCompany?.lastName,
									)}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldNickname}
									value={selectedCompany.nickname}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldJobRole}
									value={selectedCompany.role}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldEmail}
									value={selectedCompany.email}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldWorkPhoneNo}
									value={selectedCompany.workPhone}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
								<DetailRow
									label={C.viewFieldCellPhoneNo}
									value={selectedCompany.cellPhone}
									emptyPlaceholder={EMPTY_VALUE_PLACEHOLDER}
								/>
							</div>
						</CardContent>
					</Card>
				</div>
			) : (
				<Card className="w-full rounded-xl border border-border bg-background p-6 shadow-none">
					<p className="text-small text-text-secondary">
						{FORM_PLACEHOLDERS.selectCompany}
					</p>
				</Card>
			)}
		</div>
	);
}
