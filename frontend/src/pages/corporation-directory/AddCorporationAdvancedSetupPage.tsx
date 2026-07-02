import { useSearchParams } from "react-router-dom";
import { AdvancedSetupAddCorporationContent } from "@/components/corporate-directory";
import { CORPORATE_DIRECTORY_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";

export function AddCorporationAdvancedSetupPage() {
	const [searchParams] = useSearchParams();
	const isEditMode = searchParams.get("flow") === "edit";

	const breadcrumbs = [
		{
			label: CORPORATE_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
			path: ROUTES.corporateDirectory.root,
		},
		{
			label: isEditMode
				? CORPORATE_DIRECTORY_PAGE_CONTENT.editBreadcrumbsTitle
				: CORPORATE_DIRECTORY_PAGE_CONTENT.addNewBreadcrumbsTitle,
			path: ROUTES.corporateDirectory.addAdvanced,
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<AdvancedSetupAddCorporationContent />
		</AppLayout>
	);
}
