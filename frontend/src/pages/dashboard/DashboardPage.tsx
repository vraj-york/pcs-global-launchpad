import {
	AppLoader,
	CompanyAdminOnboardingGate,
	CorporationAdminDashboard,
	DashboardAccessPlaceholder,
	IndividualPaymentFlow,
	SuperAdminDashboard,
	UserDashboardContent,
} from "@/components";
import {
	COMPANY_ADMIN_ONBOARDING_GATE,
	DASHBOARD_PAGE_CONTENT,
	ROUTES,
	SUBMODULE_KEYS,
} from "@/const";
import {
	useCompanyAdminPaymentGate,
	useIndividualPaymentGate,
	usePermissions,
	useUserRoles,
} from "@/hooks";
import { AppLayout } from "@/layout";

const breadcrumbs = [
	{ label: DASHBOARD_PAGE_CONTENT.title, path: ROUTES.dashboard.root },
];

function LoadingView() {
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<AppLoader className="min-h-80" />
		</AppLayout>
	);
}

function CompanyAdminLoadError() {
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<p className="text-sm text-destructive">
				{COMPANY_ADMIN_ONBOARDING_GATE.loadError}
			</p>
		</AppLayout>
	);
}

export function DashboardPage() {
	const { isSuperAdmin, isCompanyAdmin, isCorporationAdmin, ready } =
		useUserRoles();
	const {
		can,
		ready: permissionsReady,
		loading: permissionsLoading,
	} = usePermissions();
	const canViewDashboard = can(SUBMODULE_KEYS.DASHBOARD);
	const {
		loading: paymentGateLoading,
		paymentRequired,
		loadError: paymentLoadError,
	} = useCompanyAdminPaymentGate();
	const {
		loading: individualPaymentGateLoading,
		paymentRequired: individualPaymentRequired,
		isIndividualUser,
	} = useIndividualPaymentGate();

	if (!ready) return <LoadingView />;

	if (isIndividualUser && individualPaymentGateLoading) {
		return <LoadingView />;
	}

	if (individualPaymentRequired) {
		return (
			<AppLayout breadcrumbs={[]} showSidebar={false}>
				<IndividualPaymentFlow />
			</AppLayout>
		);
	}

	if (permissionsLoading || !permissionsReady) {
		return <LoadingView />;
	}

	if (!canViewDashboard) {
		return (
			<AppLayout breadcrumbs={breadcrumbs}>
				<DashboardAccessPlaceholder />
			</AppLayout>
		);
	}

	// Company admin payment setup only when dashboard content is allowed.
	if (isSuperAdmin) {
		return (
			<AppLayout breadcrumbs={breadcrumbs}>
				<SuperAdminDashboard />
			</AppLayout>
		);
	}

	if (isCompanyAdmin && paymentGateLoading) {
		return <LoadingView />;
	}

	if (isCompanyAdmin && paymentLoadError) {
		return <CompanyAdminLoadError />;
	}

	if (isCompanyAdmin && paymentRequired) {
		return (
			<AppLayout breadcrumbs={breadcrumbs}>
				<div className="flex min-h-0 flex-1 flex-col">
					<CompanyAdminOnboardingGate />
				</div>
			</AppLayout>
		);
	}

	if (isCorporationAdmin) {
		return (
			<AppLayout breadcrumbs={breadcrumbs}>
				<div className="flex min-h-0 flex-1 flex-col">
					<CorporationAdminDashboard />
				</div>
			</AppLayout>
		);
	}

	if (isCompanyAdmin) {
		return (
			<AppLayout breadcrumbs={breadcrumbs}>
				<div className="flex min-h-0 flex-1 flex-col">
					<CompanyAdminOnboardingGate />
				</div>
			</AppLayout>
		);
	}

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<UserDashboardContent />
		</AppLayout>
	);
}
