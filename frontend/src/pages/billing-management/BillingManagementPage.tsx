import { BillingManagementContent } from "@/components";
import { BILLING_MANAGEMENT_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

export function BillingManagementPage() {
	const breadcrumbs = [
		{
			label: BILLING_MANAGEMENT_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.finance.billing,
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="mb-6">
				<h1 className="text-heading-4 font-semibold text-text-foreground">
					{BILLING_MANAGEMENT_PAGE_CONTENT.title}
				</h1>
				<p className="text-small text-text-secondary">
					{BILLING_MANAGEMENT_PAGE_CONTENT.subtitle}
				</p>
			</div>
			<BillingManagementContent />
		</AppLayout>
	);
}
