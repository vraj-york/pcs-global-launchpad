import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SupportForm } from "@/components";
import { ROUTES } from "@/const";
import { AuthLayout } from "@/layout";
import { useAuthStore, useUsersStore } from "@/store";
import type { SupportLocationState } from "@/types";

export function SupportPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { isAuthenticated, email: authEmail } = useAuthStore();
	const { userProfile } = useUsersStore();

	const fromPath = (location.state as SupportLocationState | null)?.from;

	const readOnlyEmail = useMemo(() => {
		if (!isAuthenticated) return undefined;
		const profileEmail =
			typeof userProfile?.email === "string" ? userProfile.email : "";
		const storeEmail = authEmail ?? "";
		return profileEmail || storeEmail || undefined;
	}, [authEmail, isAuthenticated, userProfile?.email]);

	const handleSuccess = () => {
		if (fromPath) {
			navigate(fromPath);
			return;
		}
		navigate(isAuthenticated ? ROUTES.auth.onboarding : ROUTES.auth.login);
	};

	return (
		<AuthLayout>
			<SupportForm readOnlyEmail={readOnlyEmail} onSuccess={handleSuccess} />
		</AuthLayout>
	);
}
