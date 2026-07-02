import { PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CompanyDirectoryContent } from "@/components";
import { Button } from "@/components/ui/button";
import { COMPANIES_DIRECTORY_PAGE_CONTENT, ROUTES } from "@/const";
import { useIsSuperAdmin } from "@/hooks";
import { AppLayout } from "@/layout";

export const CompanyDirectoryPage = () => {
	const navigate = useNavigate();
	const { isSuperAdmin: canManageCompanies } = useIsSuperAdmin();

	const breadcrumbs = [
		{
			label: COMPANIES_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.companyDirectory.root,
		},
	];

	const handleAddCompany = () => {
		navigate(ROUTES.companyDirectory.add);
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{COMPANIES_DIRECTORY_PAGE_CONTENT.title}
					</h1>
					<p className="text-small text-text-secondary">
						{COMPANIES_DIRECTORY_PAGE_CONTENT.subtitle}
					</p>
				</div>
				{canManageCompanies ? (
					<div>
						<Button icon={PlusIcon} onClick={handleAddCompany}>
							{COMPANIES_DIRECTORY_PAGE_CONTENT.addNewCompanyButton}
						</Button>
					</div>
				) : null}
			</div>
			<CompanyDirectoryContent />
		</AppLayout>
	);
};
