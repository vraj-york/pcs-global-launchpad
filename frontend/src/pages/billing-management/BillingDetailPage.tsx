import { Loader2 } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BillingDetailContent } from "@/components";
import { Button } from "@/components/ui/button";
import { BILLING_MANAGEMENT_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";
import { useBillingManagementStore } from "@/store";

export function BillingDetailPage() {
	const { companyId } = useParams<{ companyId: string }>();
	const navigate = useNavigate();
	const {
		detailRow,
		detailLoading,
		detailError,
		fetchBillingDetail,
		clearBillingDetail,
	} = useBillingManagementStore();

	useEffect(() => {
		if (!companyId) {
			return;
		}
		void fetchBillingDetail(companyId);
		return () => {
			clearBillingDetail();
		};
	}, [companyId, fetchBillingDetail, clearBillingDetail]);

	const handleBackToBillingList = useCallback(() => {
		navigate(ROUTES.finance.billing);
	}, [navigate]);

	const breadcrumbs = [
		{
			label: BILLING_MANAGEMENT_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.finance.billing,
		},
		{
			label: BILLING_MANAGEMENT_PAGE_CONTENT.detailBreadcrumb,
			path: companyId
				? ROUTES.finance.billingDetailWithIdPath(companyId)
				: ROUTES.finance.billing,
		},
	];

	const errorMessage =
		detailError ??
		(!companyId ? BILLING_MANAGEMENT_PAGE_CONTENT.missingCompanyId : null);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			{detailLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2
						className="size-8 shrink-0 animate-spin text-primary"
						aria-hidden
					/>
					<span className="sr-only">
						{BILLING_MANAGEMENT_PAGE_CONTENT.loading}
					</span>
				</div>
			) : null}

			{!detailLoading && errorMessage ? (
				<div className="space-y-4">
					<p
						className="rounded-lg bg-error-bg p-4 text-sm text-error-text"
						role="alert"
					>
						{errorMessage}
					</p>
					<Button
						variant="outline"
						type="button"
						onClick={handleBackToBillingList}
					>
						{BILLING_MANAGEMENT_PAGE_CONTENT.backButton}
					</Button>
				</div>
			) : null}

			{!detailLoading && !errorMessage && detailRow ? (
				<BillingDetailContent
					row={detailRow}
					onBack={handleBackToBillingList}
				/>
			) : null}
		</AppLayout>
	);
}
