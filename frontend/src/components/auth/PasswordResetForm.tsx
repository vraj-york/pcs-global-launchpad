import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { OTPInput } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
	PASSWORD_RESET_CONFIG,
	PASSWORD_RESET_PAGE_CONTENT,
	ROUTES,
} from "@/const";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import type { PasswordResetFormData, PasswordResetFormProps } from "@/types";
import { formatTime, maskEmail } from "@/utils";

export function PasswordResetForm({
	email,
	onSuccess,
}: PasswordResetFormProps) {
	const [timer, setTimer] = useState<number>(
		PASSWORD_RESET_CONFIG.timerDuration,
	);
	const [isVerifying, setIsVerifying] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const navigate = useNavigate();
	const { validatePasswordReset, resendPasswordReset } = useAuthStore();

	const { control, handleSubmit, watch } = useForm<PasswordResetFormData>({
		defaultValues: {
			code: Array(PASSWORD_RESET_CONFIG.codeLength).fill(""),
		},
	});

	const code = watch("code");
	const isCodeComplete = code.every((digit) => digit !== "");

	useEffect(() => {
		if (timer <= 0) return;

		const interval = setInterval(() => {
			setTimer((prev) => prev - 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [timer]);

	const onSubmit = async () => {
		if (!email) {
			navigate(ROUTES.auth.forgotPassword);
			return;
		}
		setIsVerifying(true);
		const response = await validatePasswordReset(email, code.join(""));
		setIsVerifying(false);
		if (response && onSuccess) {
			onSuccess();
		}
	};

	const handleResend = async () => {
		if (email) {
			setIsResending(true);
			const response = await resendPasswordReset(email);
			setIsResending(false);
			if (response) {
				setTimer(PASSWORD_RESET_CONFIG.timerDuration);
			}
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
						{PASSWORD_RESET_PAGE_CONTENT.title}
					</CardTitle>
					<CardDescription className="w-full text-regular font-normal leading-regular tracking-normal text-text-secondary">
						{PASSWORD_RESET_PAGE_CONTENT.subtitle}
						{email ? (
							<>
								<br />
								<span className="text-link">{maskEmail(email)}</span>
							</>
						) : null}
					</CardDescription>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-1">
							<div className="flex items-center justify-between gap-2">
								<span className="text-small font-medium leading-small text-text-foreground">
									{PASSWORD_RESET_PAGE_CONTENT.codeLabel}
								</span>
								<span
									className={cn(
										"shrink-0 text-small leading-small text-text-secondary",
										timer <= 30 && "!text-brand-red",
									)}
								>
									{formatTime(timer)}
								</span>
							</div>
							<Controller
								name="code"
								control={control}
								render={({ field }) => (
									<OTPInput
										length={PASSWORD_RESET_CONFIG.codeLength}
										value={field.value}
										onChange={field.onChange}
									/>
								)}
							/>
						</div>
					</div>
					<div className="flex flex-col gap-3">
						<Button
							type="submit"
							disabled={!isCodeComplete}
							isLoading={isVerifying}
							size="lg"
							className="h-10 min-h-10 w-full rounded-lg text-small font-semibold text-light-same"
						>
							{isVerifying
								? PASSWORD_RESET_PAGE_CONTENT.verifyingText
								: PASSWORD_RESET_PAGE_CONTENT.submitButton}
						</Button>

						<div className="flex justify-center text-center">
							<Button
								type="button"
								variant="ghost"
								onClick={handleBackToLogin}
								className="h-auto min-h-8 cursor-pointer px-1.5 py-1.5 text-small font-medium text-foreground no-underline hover:bg-transparent hover:text-link-hover hover:no-underline"
							>
								{PASSWORD_RESET_PAGE_CONTENT.backToLogin}
							</Button>
						</div>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-1 text-center">
						<span className="text-small font-normal leading-small text-text-secondary">
							{PASSWORD_RESET_PAGE_CONTENT.resendText}
						</span>
						<Button
							type="button"
							variant="link"
							onClick={handleResend}
							disabled={isResending || timer > 0}
							className="h-auto min-h-8 cursor-pointer px-1.5 py-1.5 text-small font-semibold text-link underline hover:text-link-hover disabled:opacity-50"
						>
							{PASSWORD_RESET_PAGE_CONTENT.resendLink}
						</Button>
					</div>
				</form>
			</div>
		</Card>
	);
}
