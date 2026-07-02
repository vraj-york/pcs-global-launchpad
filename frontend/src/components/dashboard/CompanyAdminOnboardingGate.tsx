import { useEffect, useState } from "react";
import { AppLoader } from "@/components";
import {
	COGNITO_COMPANY_ADMIN_GROUP,
	COMPANY_ADMIN_ONBOARDING_GATE,
} from "@/const";
import { captureFirstDashboardView } from "@/lib";
import {
	companyAdminHasActiveSubscription,
	useCompanyAdminDashboardStore,
} from "@/store";
import type {
	CompanyAdminDashboardDetail,
	CompanyAdminOnboardingGateProps,
} from "@/types";
import { CompanyAdminCompaniesList } from "./CompanyAdminCompaniesList";
import { CompanyAdminOnboardingFlow } from "./CompanyAdminOnboardingFlow";
import { CompanyAdminDashboard } from "./company-admin-dashboard";

export function CompanyAdminOnboardingGate({
	mixedCompanyPayments = false,
	onReturnToList,
	loadingFallback,
	loadErrorFallback,
	emptyCompaniesFallback,
}: CompanyAdminOnboardingGateProps) {
	const C = COMPANY_ADMIN_ONBOARDING_GATE;
	const { companies, loading, loadError } = useCompanyAdminDashboardStore();
	const [detail, setDetail] = useState<CompanyAdminDashboardDetail | null>(
		null,
	);

	useEffect(() => {
		if (mixedCompanyPayments || !companies) {
			return;
		}
		captureFirstDashboardView(COGNITO_COMPANY_ADMIN_GROUP);
	}, [companies, mixedCompanyPayments]);

	if (loading) {
		return loadingFallback ?? <AppLoader className="min-h-80" />;
	}

	if (loadError) {
		return (
			loadErrorFallback ?? (
				<p className="text-sm text-destructive">{C.loadError}</p>
			)
		);
	}

	if (!companies || companies.length === 0) {
		return (
			emptyCompaniesFallback ?? (
				<p className="text-sm text-muted-foreground">{C.emptyCompanies}</p>
			)
		);
	}

	if (!mixedCompanyPayments && companyAdminHasActiveSubscription(companies)) {
		return <CompanyAdminDashboard />;
	}

	const multi = companies.length > 1;

	const handleBackToList = () => {
		setDetail(null);
		onReturnToList?.();
	};

	if (detail?.kind === "onboarding") {
		return (
			<CompanyAdminOnboardingFlow
				review={detail.company}
				onBackToList={multi ? handleBackToList : undefined}
			/>
		);
	}

	if (companies.length === 1) {
		return <CompanyAdminOnboardingFlow review={companies[0]} />;
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<CompanyAdminCompaniesList
				companies={companies}
				onProceedToPayment={(company) =>
					setDetail({ kind: "onboarding", company })
				}
			/>
		</div>
	);
}
