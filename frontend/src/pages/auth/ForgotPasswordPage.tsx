import { useState } from "react";
import {
	ForgotPasswordForm,
	PasswordResetForm,
	PasswordResetSuccessView,
	SetNewPasswordForm,
} from "@/components/auth";
import { AuthLayout } from "@/layout";
import { useAuthStore } from "@/store";

type ForgotPasswordStep = "email" | "verification" | "newPassword" | "success";

export function ForgotPasswordPage() {
	const { email } = useAuthStore();
	const [currentStep, setCurrentStep] = useState<ForgotPasswordStep>("email");

	const handleEmailSuccess = () => {
		setCurrentStep("verification");
	};

	const handleVerificationSuccess = () => {
		setCurrentStep("newPassword");
	};

	const handleNewPasswordSuccess = () => {
		setCurrentStep("success");
	};

	return (
		<AuthLayout>
			{currentStep === "email" && (
				<ForgotPasswordForm onSuccess={handleEmailSuccess} />
			)}
			{currentStep === "verification" && (
				<PasswordResetForm
					email={email ?? undefined}
					onSuccess={handleVerificationSuccess}
				/>
			)}
			{currentStep === "newPassword" && (
				<SetNewPasswordForm onSuccess={handleNewPasswordSuccess} />
			)}
			{currentStep === "success" && <PasswordResetSuccessView />}
		</AuthLayout>
	);
}
