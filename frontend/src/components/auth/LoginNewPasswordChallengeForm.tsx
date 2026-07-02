import { yupResolver } from "@hookform/resolvers/yup";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { FormInput, PasswordStrengthIndicator } from "@/components";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
	AUTH_TEXT_INPUT_CLASSNAME,
	FIRST_LOGIN_NEW_PASSWORD_PAGE_CONTENT,
	FORM_PLACEHOLDERS,
	PASSWORD_VISIBILITY_LABELS,
	SET_NEW_PASSWORD_PAGE_CONTENT,
} from "@/const";
import {
	capturePasswordChangeViewed,
	resolvePostLoginNavigationTarget,
} from "@/lib";
import {
	type CognitoNewPasswordChallengeSchemaType,
	cognitoNewPasswordChallengeSchema,
} from "@/schemas";
import { useAuthStore } from "@/store";
import type { PostLoginRedirectLocationState } from "@/types";
import { calculatePasswordStrength } from "@/utils";

export function LoginNewPasswordChallengeForm() {
	const navigate = useNavigate();
	const location = useLocation();
	const {
		completeNewPasswordChallenge,
		cancelNewPasswordChallenge,
		isLoading,
		email,
	} = useAuthStore();

	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const passwordForm = useForm<CognitoNewPasswordChallengeSchemaType>({
		resolver: yupResolver(cognitoNewPasswordChallengeSchema),
		defaultValues: { password: "", confirmPassword: "" },
		mode: "onChange",
	});

	const { trigger, watch, register, handleSubmit, formState } = passwordForm;
	const pwd = watch("password");
	const confirmPwd = watch("confirmPassword");

	useEffect(() => {
		capturePasswordChangeViewed("cognito_new_password_required");
	}, []);

	useEffect(() => {
		if (confirmPwd) {
			void trigger("confirmPassword");
		}
	}, [pwd, confirmPwd, trigger]);

	const passwordOk =
		calculatePasswordStrength(pwd ?? "") === "strong" &&
		!formState.errors.password &&
		!formState.errors.confirmPassword &&
		confirmPwd !== "";

	const onSubmit = async (data: CognitoNewPasswordChallengeSchemaType) => {
		const ok = await completeNewPasswordChallenge(data.password);
		if (ok) {
			const state = location.state as PostLoginRedirectLocationState | null;
			try {
				const target = await resolvePostLoginNavigationTarget({
					locationStateFrom: state?.from,
					search: location.search,
				});
				navigate(target, { replace: true });
			} finally {
				useAuthStore.setState({ isLoading: false });
			}
		}
	};

	const onBack = () => {
		void cancelNewPasswordChallenge();
	};

	return (
		<Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
			<div className="flex w-full flex-col gap-16">
				<div className="flex w-full flex-col gap-3 text-center">
					<CardTitle className="w-full text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
						{FIRST_LOGIN_NEW_PASSWORD_PAGE_CONTENT.title}
					</CardTitle>
					<CardDescription className="w-full text-regular font-normal leading-regular tracking-normal text-muted-foreground">
						{FIRST_LOGIN_NEW_PASSWORD_PAGE_CONTENT.subtitle}
						{email ? (
							<>
								<br />
								<span className="text-link">{email}</span>
							</>
						) : null}
					</CardDescription>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
					<div className="flex flex-col gap-6">
						<FormInput
							id="first-login-new-password"
							label={SET_NEW_PASSWORD_PAGE_CONTENT.passwordLabel}
							type={showPassword ? "text" : "password"}
							autoComplete="new-password"
							placeholder={FORM_PLACEHOLDERS.newPassword}
							className={AUTH_TEXT_INPUT_CLASSNAME}
							error={formState.errors.password?.message}
							{...register("password")}
							rightElement={
								<Button
									type="button"
									variant="ghost"
									onClick={() => setShowPassword((v) => !v)}
									className="absolute right-3 top-1/2 h-auto -translate-y-1/2 cursor-pointer p-0 text-text-secondary transition-colors hover:bg-transparent hover:text-icon-primary"
									aria-label={
										showPassword
											? PASSWORD_VISIBILITY_LABELS.hide
											: PASSWORD_VISIBILITY_LABELS.show
									}
								>
									{showPassword ? (
										<EyeOff className="size-4 text-icon-secondary" />
									) : (
										<Eye className="size-4 text-icon-secondary" />
									)}
								</Button>
							}
						/>

						<div className="flex flex-col gap-1">
							<FormInput
								id="first-login-confirm-password"
								label={SET_NEW_PASSWORD_PAGE_CONTENT.confirmPasswordLabel}
								type={showConfirmPassword ? "text" : "password"}
								autoComplete="new-password"
								placeholder={FORM_PLACEHOLDERS.confirmPassword}
								className={AUTH_TEXT_INPUT_CLASSNAME}
								error={formState.errors.confirmPassword?.message}
								{...register("confirmPassword")}
								rightElement={
									<Button
										type="button"
										variant="ghost"
										onClick={() => setShowConfirmPassword((v) => !v)}
										className="absolute right-3 top-1/2 h-auto -translate-y-1/2 cursor-pointer p-0 text-text-secondary transition-colors hover:bg-transparent hover:text-icon-primary"
										aria-label={
											showConfirmPassword
												? PASSWORD_VISIBILITY_LABELS.hide
												: PASSWORD_VISIBILITY_LABELS.show
										}
									>
										{showConfirmPassword ? (
											<EyeOff className="size-4 text-icon-secondary" />
										) : (
											<Eye className="size-4 text-icon-secondary" />
										)}
									</Button>
								}
							/>

							<PasswordStrengthIndicator
								password={pwd ?? ""}
								className="pt-1"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-3">
						<Button
							type="submit"
							disabled={!passwordOk}
							isLoading={isLoading}
							size="lg"
							className="h-10 min-h-10 w-full cursor-pointer rounded-lg text-small font-semibold text-light-same"
						>
							{isLoading
								? FIRST_LOGIN_NEW_PASSWORD_PAGE_CONTENT.submitting
								: FIRST_LOGIN_NEW_PASSWORD_PAGE_CONTENT.submitButton}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={onBack}
							disabled={isLoading}
							size="lg"
							className="h-10 min-h-10 w-full cursor-pointer rounded-lg text-small font-semibold"
						>
							{FIRST_LOGIN_NEW_PASSWORD_PAGE_CONTENT.backToSignIn}
						</Button>
					</div>
				</form>
			</div>
		</Card>
	);
}
