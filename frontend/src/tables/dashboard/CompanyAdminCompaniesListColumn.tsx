import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import {
	COMPANY_ADMIN_ONBOARDING,
	COMPANY_ADMIN_PAYMENT_STATUS_BADGE_TYPES,
} from "@/const";
import type {
	ColumnDef,
	CompanyAdminCompaniesListColumnOptions,
	CompanyAdminCompanyItem,
	CompanyAdminTableRow,
} from "@/types";

const C = COMPANY_ADMIN_ONBOARDING;

function renderPaymentStatusBadge(row: CompanyAdminCompanyItem) {
	if (row.hasActiveSubscription) {
		return (
			<BSPBadge type={COMPANY_ADMIN_PAYMENT_STATUS_BADGE_TYPES.paid}>
				{C.statusPaid}
			</BSPBadge>
		);
	}
	if (row.canCheckout) {
		return (
			<BSPBadge type={COMPANY_ADMIN_PAYMENT_STATUS_BADGE_TYPES.paymentDue}>
				{C.statusPaymentDue}
			</BSPBadge>
		);
	}
	return (
		<BSPBadge type={COMPANY_ADMIN_PAYMENT_STATUS_BADGE_TYPES.pending}>
			{C.statusPending}
		</BSPBadge>
	);
}

export function getCompanyAdminCompaniesListColumns(
	options: CompanyAdminCompaniesListColumnOptions,
): ColumnDef<CompanyAdminTableRow>[] {
	const { onProceedToPayment, onViewCompanyDetails } = options;

	return [
		{
			id: "company",
			header: C.colCompany,
			minWidth: "160px",
			cell: (row) => {
				const region = row.corporation.dataResidencyRegion?.trim();
				return (
					<div className="flex min-w-0 flex-col gap-1">
						<span className="whitespace-normal text-small text-text-foreground">
							{row.company.legalName}
						</span>
						{region ? (
							<span className="whitespace-normal text-mini text-muted-foreground">
								{region}
							</span>
						) : null}
					</div>
				);
			},
		},
		{
			id: "corporation",
			header: C.colCorporation,
			minWidth: "160px",
			cell: (row) => (
				<span className="whitespace-normal text-small text-text-foreground">
					{row.corporation.legalName}
				</span>
			),
		},
		{
			id: "status",
			header: C.colStatus,
			cell: (row) => renderPaymentStatusBadge(row),
		},
		{
			id: "action",
			header: C.colAction,
			minWidth: "200px",
			cell: (row) => (
				<div className="flex justify-start">
					{row.canCheckout ? (
						<Button
							type="button"
							size="sm"
							onClick={() => onProceedToPayment(row)}
						>
							{C.proceedToPayment}
						</Button>
					) : row.hasActiveSubscription ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onViewCompanyDetails(row.companyId)}
						>
							{C.viewCompanyDetails}
						</Button>
					) : (
						<BSPBadge type={COMPANY_ADMIN_PAYMENT_STATUS_BADGE_TYPES.pending}>
							{C.statusPending}
						</BSPBadge>
					)}
				</div>
			),
		},
	];
}
