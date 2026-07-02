import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/common";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { COMPANY_ADMIN_ONBOARDING, DATA_TABLE_TEXT, ROUTES } from "@/const";
import { getCompanyAdminCompaniesListColumns } from "@/tables";
import type {
	CompanyAdminCompaniesListProps,
	CompanyAdminTableRow,
} from "@/types";

export function CompanyAdminCompaniesList({
	companies,
	onProceedToPayment,
}: CompanyAdminCompaniesListProps) {
	const C = COMPANY_ADMIN_ONBOARDING;
	const navigate = useNavigate();

	const handleViewCompanyDetails = useCallback(
		(companyId: string) => {
			navigate(ROUTES.companyDirectory.viewWithIdPath(companyId));
		},
		[navigate],
	);

	const tableData = useMemo<CompanyAdminTableRow[]>(
		() => companies.map((c) => ({ ...c, id: c.companyId })),
		[companies],
	);

	const columns = useMemo(
		() =>
			getCompanyAdminCompaniesListColumns({
				onProceedToPayment,
				onViewCompanyDetails: handleViewCompanyDetails,
			}),
		[handleViewCompanyDetails, onProceedToPayment],
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background py-0 shadow-none">
				<CardHeader className="shrink-0 gap-0.5 border-b border-border p-4">
					<h2 className="text-base font-semibold text-text-foreground">
						{C.multiCompanyTitle}
					</h2>
					<p className="text-small text-text-secondary">
						{C.multiCompanySubtitle}
					</p>
				</CardHeader>
				<CardContent className="flex min-h-0 flex-1 flex-col p-4">
					<DataTable<CompanyAdminTableRow>
						data={tableData}
						columns={columns}
						pageSize={Math.max(tableData.length, 1)}
						showPagination={false}
						emptyMessage={DATA_TABLE_TEXT.noData}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
