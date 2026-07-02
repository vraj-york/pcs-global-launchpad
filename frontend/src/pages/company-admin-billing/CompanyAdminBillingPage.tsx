import { CompanyAdminBillingContent } from "@/components";
import { COMPANY_ADMIN_BILLING_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

export function CompanyAdminBillingPage() {
	const breadcrumbs = [
		{
			label: COMPANY_ADMIN_BILLING_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.finance.billing,
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<CompanyAdminBillingContent />
		</AppLayout>
	);
}
