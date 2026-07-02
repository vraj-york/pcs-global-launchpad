import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ViewCorporationContent } from "@/components";
import { Button } from "@/components/ui/button";
import { CORPORATE_DIRECTORY_PAGE_CONTENT as C, ROUTES } from "@/const";
import { AppLayout } from "@/layout";
import { useCorporationsStore, useUsersStore } from "@/store";

export function CorporationOverviewPage() {
	const navigate = useNavigate();
	const {
		userProfile,
		userProfileLoading,
		userProfileError,
		fetchUserProfile,
	} = useUsersStore();

	const {
		corporationDetail,
		corporationDetailLoading,
		corporationDetailError,
		fetchCorporationById,
		clearCorporationDetail,
	} = useCorporationsStore();

	const corporationId = useMemo(
		() => userProfile?.corporationId?.trim() || null,
		[userProfile?.corporationId],
	);

	const profileError = useMemo(() => {
		if (userProfileError) return userProfileError;
		if (!userProfileLoading && userProfile && !corporationId) {
			return C.corporationOverviewNoCorporationLinked;
		}
		if (!userProfileLoading && !userProfile) {
			return C.corporationOverviewProfileError;
		}
		return null;
	}, [userProfileError, userProfileLoading, userProfile, corporationId]);

	useEffect(() => {
		if (!userProfile && !userProfileLoading) {
			void fetchUserProfile();
		}
	}, [userProfile, userProfileLoading, fetchUserProfile]);

	useEffect(() => {
		if (!corporationId) return;
		void fetchCorporationById(corporationId);
		return () => clearCorporationDetail();
	}, [corporationId, fetchCorporationById, clearCorporationDetail]);

	const breadcrumbs = [
		{
			label: C.corporationOverviewTitle,
			path: ROUTES.corporationOverview.root,
		},
	];

	const isLoadingDetail =
		(userProfileLoading ||
			(Boolean(corporationId) && corporationDetailLoading)) &&
		!corporationDetail;
	const isError =
		profileError != null ||
		corporationDetailError != null ||
		(Boolean(corporationId) && !corporationDetail && !corporationDetailLoading);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			{isLoadingDetail && (
				<div className="flex items-center justify-center py-12">
					<Loader2
						className="size-8 animate-spin shrink-0 text-primary"
						aria-hidden
					/>
				</div>
			)}
			{!isLoadingDetail && isError && (
				<>
					<div className="rounded-lg bg-error-bg p-4 text-error-text">
						{profileError ??
							corporationDetailError ??
							C.viewCorporationNotFound}
					</div>
					<Button
						variant="link"
						className="mt-4"
						onClick={() => navigate(ROUTES.dashboard.root)}
					>
						{C.corporationOverviewBackToDashboard}
					</Button>
				</>
			)}
			{!isLoadingDetail && !isError && corporationDetail && (
				<ViewCorporationContent
					corporation={corporationDetail}
					viewerRole="corporationAdmin"
					directoryBack={null}
				/>
			)}
		</AppLayout>
	);
}
