import { useUserRoles } from "@/hooks";
import {
	companyAdminHasActiveSubscription,
	useCompanyAdminDashboardStore,
} from "@/store";

/** Read-only company admin payment gate state (fetch runs in ProtectedRoute). */
export function useCompanyAdminPaymentGate() {
	const { isCompanyAdmin, ready } = useUserRoles();
	const { companies, loading, loadError } = useCompanyAdminDashboardStore();

	const hasActiveSubscription =
		!isCompanyAdmin || companyAdminHasActiveSubscription(companies);

	const paymentRequired =
		isCompanyAdmin &&
		ready &&
		!loading &&
		!loadError &&
		companies !== null &&
		!companyAdminHasActiveSubscription(companies);

	return {
		loading: isCompanyAdmin && (!ready || loading),
		paymentRequired,
		hasActiveSubscription,
		companies,
		loadError,
	};
}
