import { useState } from "react";
import {
	LoginForm,
	LoginNewPasswordChallengeForm,
	VerificationForm,
} from "@/components";
import { AuthLayout } from "@/layout";
import { useAuthStore } from "@/store";

export function LoginPage() {
	const { requiresVerification, requiresNewPassword, email } = useAuthStore();
	const [tempPassword, setTempPassword] = useState<string>("");

	return (
		<AuthLayout>
			{requiresVerification ? (
				<VerificationForm email={email ?? undefined} password={tempPassword} />
			) : requiresNewPassword ? (
				<LoginNewPasswordChallengeForm />
			) : (
				<LoginForm setTempPassword={setTempPassword} />
			)}
		</AuthLayout>
	);
}
