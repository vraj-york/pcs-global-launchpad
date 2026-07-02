import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLoader, EditBillingDetailsContent } from "@/components";
import { Button } from "@/components/ui/button";
import {
	BILLING_EDIT_PAGE_CONTENT,
	BILLING_MANAGEMENT_PAGE_CONTENT,
	ROUTES,
} from "@/const";
import { AppLayout } from "@/layout";
import { useBillingManagementStore } from "@/store";

export function EditBillingDetailsPage() {
	const { companyId } = useParams<{ companyId: string }>();
	const navigate = useNavigate();
	const {
		detailRow,
		detailLoading,
		detailError,
		fetchBillingDetail,
		clearBillingDetail,
		upgradeOptions,
		upgradeOptionsLoading,
		upgradeOptionsError,
		fetchUpgradeOptions,
		clearUpgradeState,
	} = useBillingManagementStore();

	useEffect(() => {
		if (!companyId) {
			return;
		}
		void fetchBillingDetail(companyId);
		void fetchUpgradeOptions(companyId);
		return () => {
			clearBillingDetail();
			clearUpgradeState();
		};
	}, [
		companyId,
		fetchBillingDetail,
		fetchUpgradeOptions,
		clearBillingDetail,
		clearUpgradeState,
	]);

	const handleBack = useCallback(() => {
		if (companyId) {
			navigate(ROUTES.finance.billingDetailWithIdPath(companyId));
			return;
		}
		navigate(ROUTES.finance.billing);
	}, [companyId, navigate]);

	const breadcrumbs = [
		{
			label: BILLING_MANAGEMENT_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.finance.billing,
		},
		...(companyId
			? [
					{
						label: BILLING_MANAGEMENT_PAGE_CONTENT.detailBreadcrumb,
						path: ROUTES.finance.billingDetailWithIdPath(companyId),
					},
					{
						label: BILLING_EDIT_PAGE_CONTENT.breadcrumb,
						path: ROUTES.finance.billingEditWithIdPath(companyId),
					},
				]
			: []),
	];

	const errorMessage =
		detailError ??
		upgradeOptionsError ??
		(!companyId ? BILLING_MANAGEMENT_PAGE_CONTENT.missingCompanyId : null);

	const initialLoading =
		Boolean(companyId) &&
		!errorMessage &&
		(detailLoading || upgradeOptionsLoading || !detailRow || !upgradeOptions);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="flex min-h-0 flex-1 flex-col">
				{initialLoading ? <AppLoader className="py-20" /> : null}

				{!initialLoading && errorMessage ? (
					<div className="space-y-4">
						<Button variant="outline" type="button" onClick={handleBack}>
							{BILLING_MANAGEMENT_PAGE_CONTENT.backButton}
						</Button>
					</div>
				) : null}

				{companyId &&
				!initialLoading &&
				!errorMessage &&
				detailRow &&
				upgradeOptions ? (
					<EditBillingDetailsContent
						companyId={companyId}
						onBack={handleBack}
					/>
				) : null}
			</div>
		</AppLayout>
	);
}
