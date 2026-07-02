import { PlusIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CorporateDirectoryContent } from "@/components";
import { Button } from "@/components/ui/button";
import { CORPORATE_DIRECTORY_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

export const CorporateDirectoryPage = () => {
	const navigate = useNavigate();
	const breadcrumbs = [
		{
			label: CORPORATE_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.corporateDirectory.root,
		},
	];
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{CORPORATE_DIRECTORY_PAGE_CONTENT.Title}
					</h1>
					<p className="text-small text-text-secondary">
						{CORPORATE_DIRECTORY_PAGE_CONTENT.subtitle}
					</p>
				</div>
				<div>
					<Button
						icon={PlusIcon}
						onClick={() => navigate(ROUTES.corporateDirectory.chooseSetup)}
					>
						{CORPORATE_DIRECTORY_PAGE_CONTENT.addNewCorporationButton}
					</Button>
				</div>
			</div>
			<CorporateDirectoryContent />
		</AppLayout>
	);
};
