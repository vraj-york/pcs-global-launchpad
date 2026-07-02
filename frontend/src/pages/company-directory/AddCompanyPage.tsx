import { AddCompanyContent } from "@/components/company-directory";
import {
	ADD_NEW_COMPANY_CONTENT,
	COMPANIES_DIRECTORY_PAGE_CONTENT,
	ROUTES,
} from "@/const";
import { AppLayout } from "@/layout";

export function AddCompanyPage() {
	const breadcrumbs = [
		{
			label: COMPANIES_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.companyDirectory.root,
		},
		{
			label: ADD_NEW_COMPANY_CONTENT.pageTitle,
			path: ROUTES.companyDirectory.add,
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<AddCompanyContent />
		</AppLayout>
	);
}
