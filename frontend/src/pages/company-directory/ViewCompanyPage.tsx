import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ViewCompanyContent } from "@/components/company-directory";
import { Button } from "@/components/ui/button";
import { COMPANIES_DIRECTORY_PAGE_CONTENT as C, ROUTES } from "@/const";
import { useUserRoles } from "@/hooks";
import { AppLayout } from "@/layout";
import { useCompanyDirectoryStore } from "@/store";

export function ViewCompanyPage() {
	const { companyId } = useParams<{ companyId: string }>();
	const { state: locationState } = useLocation() as {
		state?: { flow?: string };
	};
	const navigate = useNavigate();
	const { isCorporationAdmin } = useUserRoles();
	const [isEditMode, setIsEditMode] = useState(false);
	const isCorporationAdminView = isCorporationAdmin;
	const initialEditMode =
		!isCorporationAdminView && locationState?.flow === "edit";
	const viewerRole = useMemo(() => {
		if (isCorporationAdminView) return "corporationAdmin" as const;
		return "superAdmin" as const;
	}, [isCorporationAdminView]);

	const {
		companyDetail,
		companyDetailLoading,
		companyDetailError,
		fetchCompanyById,
		clearCompanyDetail,
	} = useCompanyDirectoryStore();

	useEffect(() => {
		if (companyId) fetchCompanyById(companyId);
		return () => clearCompanyDetail();
	}, [companyId, fetchCompanyById, clearCompanyDetail]);

	const breadcrumbs = [
		{ label: C.breadcrumbsTitle, path: ROUTES.companyDirectory.root },
		...(companyDetail
			? [
					{
						label: isEditMode
							? C.editBreadcrumbsTitle
							: companyDetail.legalName?.trim() ||
								companyDetail.dbaName?.trim() ||
								"Company",
						path: ROUTES.companyDirectory.viewWithIdPath(companyDetail.id),
					},
				]
			: []),
	];

	const isLoading = companyDetailLoading && !companyDetail;
	const isError = companyDetailError || !companyDetail || !companyId;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<Loader2
						className="size-8 shrink-0 animate-spin text-primary"
						aria-hidden
					/>
				</div>
			)}
			{!isLoading && isError && (
				<>
					<div className="rounded-lg bg-error-bg p-4 text-error-text">
						{companyDetailError ?? C.viewCompanyNotFound}
					</div>
					<Button
						variant="link"
						className="mt-4"
						onClick={() => navigate(ROUTES.companyDirectory.root)}
					>
						{C.backToCompanyDirectory}
					</Button>
				</>
			)}
			{!isLoading && !isError && companyDetail && (
				<ViewCompanyContent
					company={companyDetail}
					onEditModeChange={setIsEditMode}
					initialEditMode={initialEditMode}
					viewerRole={viewerRole}
				/>
			)}
		</AppLayout>
	);
}
