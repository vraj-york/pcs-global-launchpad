import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { FormInput } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
	AUTH_TEXT_INPUT_CLASSNAME,
	FORGOT_PASSWORD_PAGE_CONTENT,
	FORM_PLACEHOLDERS,
	ROUTES,
} from "@/const";
import { type ForgotPasswordSchemaType, forgotPasswordSchema } from "@/schemas";
import { useAuthStore } from "@/store";
import type { ForgotPasswordFormProps } from "@/types";

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
	const navigate = useNavigate();
	const { requestPasswordReset, isLoading } = useAuthStore();

	const {
		register,
		handleSubmit,
		formState: { errors, isValid },
	} = useForm<ForgotPasswordSchemaType>({
		resolver: yupResolver(forgotPasswordSchema),
		mode: "onChange",
	});

	const onSubmit = async (data: ForgotPasswordSchemaType) => {
		const success = await requestPasswordReset(data.email.trim().toLowerCase());

		if (success) {
			onSuccess?.();
		}
	};

	const handleBackToLogin = () => {
		navigate(ROUTES.auth.login);
	};

	return (
		<Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
			<div className="flex w-full flex-col gap-16">
				<div className="flex w-full flex-col gap-3 text-center">
					<CardTitle className="w-full text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
						{FORGOT_PASSWORD_PAGE_CONTENT.title}
					</CardTitle>
					<CardDescription className="w-full text-regular font-normal leading-regular tracking-normal text-muted-foreground">
						{FORGOT_PASSWORD_PAGE_CONTENT.subtitle}
					</CardDescription>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
					<div className="flex flex-col gap-6">
						<FormInput
							id="forgot-password-email"
							label={FORGOT_PASSWORD_PAGE_CONTENT.emailLabel}
							type="email"
							placeholder={FORM_PLACEHOLDERS.enterEmailExtended}
							autoComplete="email"
							className={AUTH_TEXT_INPUT_CLASSNAME}
							error={errors.email?.message}
							{...register("email")}
						/>
					</div>

					<Button
						type="submit"
						disabled={!isValid}
						isLoading={isLoading}
						size="lg"
						className="h-10 min-h-10 w-full rounded-lg text-small font-semibold text-light-same mt-2"
					>
						{isLoading
							? "Sending..."
							: FORGOT_PASSWORD_PAGE_CONTENT.submitButton}
					</Button>

					<div className="flex justify-center text-center">
						<Button
							type="button"
							variant="ghost"
							onClick={handleBackToLogin}
							className="h-auto min-h-8 cursor-pointer px-1.5 py-1.5 text-small font-medium text-foreground no-underline hover:bg-transparent hover:text-link-hover hover:no-underline"
						>
							{FORGOT_PASSWORD_PAGE_CONTENT.backToLogin}
						</Button>
					</div>
				</form>
			</div>
		</Card>
	);
}
