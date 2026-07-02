import { InvoiceManagementContent } from "@/components/invoice-management";
import { INVOICE_MANAGEMENT_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

export function InvoiceManagementPage() {
	const breadcrumbs = [
		{
			label: INVOICE_MANAGEMENT_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.finance.invoices,
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="mb-6">
				<h1 className="text-heading-4 font-semibold text-text-foreground">
					{INVOICE_MANAGEMENT_PAGE_CONTENT.title}
				</h1>
				<p className="text-small text-text-secondary">
					{INVOICE_MANAGEMENT_PAGE_CONTENT.subtitle}
				</p>
			</div>
			<InvoiceManagementContent />
		</AppLayout>
	);
}
