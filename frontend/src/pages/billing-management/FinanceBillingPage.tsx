import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { APP_LOADING_MESSAGE, ROUTES } from "@/const";
import { useUserRoles } from "@/hooks";
import { CompanyAdminBillingPage } from "../company-admin-billing/CompanyAdminBillingPage";
import { BillingManagementPage } from "./BillingManagementPage";

/**
 * `/finance/billing` — Super Admin list or Company Admin self-service billing.
 */
export function FinanceBillingPage() {
	const { isSuperAdmin, isCompanyAdmin, ready: groupsReady } = useUserRoles();

	if (!groupsReady) {
		return (
			<div
				className="flex min-h-[40vh] items-center justify-center"
				role="status"
				aria-live="polite"
			>
				<Loader2
					className="size-6 animate-spin text-muted-foreground"
					aria-hidden
				/>
				<span className="sr-only">{APP_LOADING_MESSAGE}</span>
			</div>
		);
	}

	if (isSuperAdmin) {
		return <BillingManagementPage />;
	}

	if (isCompanyAdmin) {
		return <CompanyAdminBillingPage />;
	}

	return <Navigate to={ROUTES.dashboard.root} replace />;
}
