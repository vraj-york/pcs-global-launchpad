import { yupResolver } from "@hookform/resolvers/yup";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { FormInput, PasswordStrengthIndicator } from "@/components";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
	AUTH_TEXT_INPUT_CLASSNAME,
	FORM_PLACEHOLDERS,
	PASSWORD_VISIBILITY_LABELS,
	ROUTES,
	SET_NEW_PASSWORD_PAGE_CONTENT,
} from "@/const";
import {
	capturePasswordChangeCompleted,
	capturePasswordChangeViewed,
} from "@/lib";
import { type SetNewPasswordSchemaType, setNewPasswordSchema } from "@/schemas";
import { useAuthStore } from "@/store";
import type { SetNewPasswordFormProps } from "@/types";
import { calculatePasswordStrength } from "@/utils";

export function SetNewPasswordForm({ onSuccess }: SetNewPasswordFormProps) {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const navigate = useNavigate();
	const { confirmPasswordReset, isLoading, email, passwordResetToken } =
		useAuthStore();

	const {
		register,
		handleSubmit,
		watch,
		trigger,
		formState: { errors },
	} = useForm<SetNewPasswordSchemaType>({
		resolver: yupResolver(setNewPasswordSchema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
		mode: "onChange",
	});

	const password = watch("password");
	const confirmPassword = watch("confirmPassword");

	useEffect(() => {
		capturePasswordChangeViewed("email_password_reset");
	}, []);

	useEffect(() => {
		if (confirmPassword) {
			trigger("confirmPassword");
		}
	}, [password, confirmPassword, trigger]);

	const isStrong = calculatePasswordStrength(password) === "strong";
	const hasNoErrors = !errors.password && !errors.confirmPassword;
	const isFormValid = isStrong && hasNoErrors && confirmPassword !== "";

	const onSubmit = async (data: SetNewPasswordSchemaType) => {
		if (!email || !passwordResetToken) {
			navigate(ROUTES.auth.forgotPassword);
			return;
		}
		const success = await confirmPasswordReset(
			email,
			passwordResetToken,
			data.password,
		);
		if (success) {
			if (onSuccess) {
				capturePasswordChangeCompleted("email_password_reset");
				onSuccess();
			} else {
				navigate(ROUTES.auth.login);
			}
		}
	};

	const handleBackToLogin = () => {
		navigate(ROUTES.auth.login);
	};

	const passwordAriaLabel = showPassword
		? PASSWORD_VISIBILITY_LABELS.hide
		: PASSWORD_VISIBILITY_LABELS.show;

	const confirmPasswordAriaLabel = showConfirmPassword
		? PASSWORD_VISIBILITY_LABELS.hide
		: PASSWORD_VISIBILITY_LABELS.show;

	return (
		<Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
			<div className="flex w-full flex-col gap-16">
				<div className="flex w-full flex-col gap-3 text-center">
					<CardTitle className="w-full text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
						{SET_NEW_PASSWORD_PAGE_CONTENT.title}
					</CardTitle>
					<CardDescription className="w-full text-regular font-normal leading-regular tracking-normal text-muted-foreground">
						{SET_NEW_PASSWORD_PAGE_CONTENT.subtitle}
					</CardDescription>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
					<FormInput
						id="set-new-password"
						label={SET_NEW_PASSWORD_PAGE_CONTENT.passwordLabel}
						type={showPassword ? "text" : "password"}
						placeholder={FORM_PLACEHOLDERS.newPassword}
						autoComplete="new-password"
						className={AUTH_TEXT_INPUT_CLASSNAME}
						error={errors.password?.message}
						{...register("password")}
						rightElement={
							<Button
								type="button"
								variant="ghost"
								onClick={() => setShowPassword((prev) => !prev)}
								className="absolute right-3 top-1/2 h-auto -translate-y-1/2 cursor-pointer p-0 text-text-secondary transition-colors hover:bg-transparent hover:text-icon-primary"
								aria-label={passwordAriaLabel}
							>
								{showPassword ? (
									<EyeOff className="size-4 text-icon-secondary" />
								) : (
									<Eye className="size-4 text-icon-secondary" />
								)}
							</Button>
						}
					/>

					<div className="flex flex-col gap-2">
						<FormInput
							id="set-new-password-confirm"
							label={SET_NEW_PASSWORD_PAGE_CONTENT.confirmPasswordLabel}
							type={showConfirmPassword ? "text" : "password"}
							placeholder={FORM_PLACEHOLDERS.confirmPassword}
							autoComplete="new-password"
							className={AUTH_TEXT_INPUT_CLASSNAME}
							error={errors.confirmPassword?.message}
							{...register("confirmPassword")}
							rightElement={
								<Button
									type="button"
									variant="ghost"
									onClick={() => setShowConfirmPassword((prev) => !prev)}
									className="absolute right-3 top-1/2 h-auto -translate-y-1/2 cursor-pointer p-0 text-text-secondary transition-colors hover:bg-transparent hover:text-icon-primary"
									aria-label={confirmPasswordAriaLabel}
								>
									{showConfirmPassword ? (
										<EyeOff className="size-4 text-icon-secondary" />
									) : (
										<Eye className="size-4 text-icon-secondary" />
									)}
								</Button>
							}
						/>

						<PasswordStrengthIndicator password={password} />
					</div>

					<div className="flex flex-col gap-3">
						<Button
							type="submit"
							disabled={!isFormValid}
							isLoading={isLoading}
							size="lg"
							className="h-10 min-h-10 w-full cursor-pointer rounded-lg text-small font-semibold text-light-same"
						>
							{isLoading
								? SET_NEW_PASSWORD_PAGE_CONTENT.resetting
								: SET_NEW_PASSWORD_PAGE_CONTENT.submitButton}
						</Button>

						<Button
							type="button"
							variant="ghost"
							onClick={handleBackToLogin}
							size="lg"
							className="h-10 min-h-10 w-full cursor-pointer rounded-lg text-small font-semibold text-text-foreground hover:bg-transparent hover:text-link-hover"
						>
							{SET_NEW_PASSWORD_PAGE_CONTENT.backToLogin}
						</Button>
					</div>
				</form>
			</div>
		</Card>
	);
}
