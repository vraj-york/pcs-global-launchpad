import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ViewCorporationContent } from "@/components/corporate-directory";
import { Button } from "@/components/ui/button";
import { CORPORATE_DIRECTORY_PAGE_CONTENT as C, ROUTES } from "@/const";
import { AppLayout } from "@/layout";
import { useCorporationsStore } from "@/store";

export function ViewCorporationPage() {
	const { corporationId } = useParams<{ corporationId: string }>();
	const { state: locationState } = useLocation() as {
		state?: { flow?: string };
	};
	const navigate = useNavigate();
	const [isEditMode, setIsEditMode] = useState(false);
	const initialEditMode = locationState?.flow === "edit";

	const {
		corporationDetail,
		corporationDetailLoading,
		corporationDetailError,
		fetchCorporationById,
		clearCorporationDetail,
	} = useCorporationsStore();

	useEffect(() => {
		if (corporationId) fetchCorporationById(corporationId);
		return () => clearCorporationDetail();
	}, [corporationId, fetchCorporationById, clearCorporationDetail]);

	const breadcrumbs = [
		{ label: C.breadcrumbsTitle, path: ROUTES.corporateDirectory.root },
		...(corporationDetail
			? [
					{
						label: isEditMode
							? C.editBreadcrumbsTitle
							: corporationDetail.legalName,
						path: ROUTES.corporateDirectory.viewWithIdPath(
							corporationDetail.id,
						),
					},
				]
			: []),
	];

	const isLoading = corporationDetailLoading && !corporationDetail;
	const isError =
		corporationDetailError || !corporationDetail || !corporationId;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<Loader2
						className="size-8 animate-spin shrink-0 text-primary"
						aria-hidden
					/>
				</div>
			)}
			{!isLoading && isError && (
				<>
					<div className="rounded-lg bg-error-bg p-4 text-error-text">
						{corporationDetailError ?? C.viewCorporationNotFound}
					</div>
					<Button
						variant="link"
						className="mt-4"
						onClick={() => navigate(ROUTES.corporateDirectory.root)}
					>
						{C.backToCorporationDirectory}
					</Button>
				</>
			)}
			{!isLoading && !isError && corporationDetail && (
				<ViewCorporationContent
					corporation={corporationDetail}
					onEditModeChange={setIsEditMode}
					initialEditMode={initialEditMode}
				/>
			)}
		</AppLayout>
	);
}
