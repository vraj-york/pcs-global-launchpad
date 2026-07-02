import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ViewCompanyContent } from "@/components";
import { Button } from "@/components/ui/button";
import { COMPANIES_DIRECTORY_PAGE_CONTENT as C, ROUTES } from "@/const";
import { AppLayout } from "@/layout";
import { useCompanyDirectoryStore, useUsersStore } from "@/store";

export function CompanyOverviewPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const {
		userProfile,
		userProfileLoading,
		userProfileError,
		fetchUserProfile,
	} = useUsersStore();

	const {
		companyDetail,
		companyDetailLoading,
		companyDetailError,
		fetchCompanyById,
		clearCompanyDetail,
	} = useCompanyDirectoryStore();

	const queryCompanyId = searchParams.get("companyId")?.trim() || null;

	const companyId = useMemo(() => {
		if (queryCompanyId) return queryCompanyId;
		return userProfile?.companyId?.trim() || null;
	}, [queryCompanyId, userProfile?.companyId]);

	const profileError = useMemo(() => {
		if (queryCompanyId) return null;
		if (userProfileError) return userProfileError;
		if (!userProfileLoading && userProfile && !companyId) {
			return C.companyOverviewNoCompanyLinked;
		}
		if (!userProfileLoading && !userProfile) {
			return C.companyOverviewProfileError;
		}
		return null;
	}, [
		queryCompanyId,
		userProfileError,
		userProfileLoading,
		userProfile,
		companyId,
	]);

	useEffect(() => {
		if (!queryCompanyId && !userProfile && !userProfileLoading) {
			void fetchUserProfile();
		}
	}, [queryCompanyId, userProfile, userProfileLoading, fetchUserProfile]);

	useEffect(() => {
		if (!companyId) return;
		void fetchCompanyById(companyId);
		return () => clearCompanyDetail();
	}, [companyId, fetchCompanyById, clearCompanyDetail]);

	const breadcrumbs = [
		{
			label: C.companyOverviewTitle,
			path: ROUTES.companyOverview.root,
		},
	];

	const isLoadingDetail =
		((!queryCompanyId && userProfileLoading) ||
			(Boolean(companyId) && companyDetailLoading)) &&
		!companyDetail;
	const isError =
		profileError != null ||
		companyDetailError != null ||
		(!queryCompanyId && !userProfileLoading && !companyId) ||
		(Boolean(companyId) && !companyDetail && !companyDetailLoading);

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
						{profileError ?? companyDetailError ?? C.viewCompanyNotFound}
					</div>
					<Button
						variant="link"
						className="mt-4"
						onClick={() => navigate(ROUTES.dashboard.root)}
					>
						{C.companyOverviewBackToDashboard}
					</Button>
				</>
			)}
			{!isLoadingDetail && !isError && companyDetail && (
				<ViewCompanyContent
					company={companyDetail}
					viewerRole="companyAdmin"
					directoryBack={null}
				/>
			)}
		</AppLayout>
	);
}
