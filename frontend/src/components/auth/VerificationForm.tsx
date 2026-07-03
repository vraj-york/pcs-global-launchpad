import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OTPInput } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
	AUTH_TOAST_MESSAGES,
	VERIFICATION_CONFIG,
	VERIFICATION_PAGE_CONTENT,
} from "@/const";
import { resolvePostLoginNavigationTarget } from "@/lib";
import { useAuthStore } from "@/store";
import type {
	PostLoginRedirectLocationState,
	VerificationFormData,
	VerificationFormProps,
} from "@/types";
import { formatTime, maskEmail } from "@/utils";

export function VerificationForm({ email, password }: VerificationFormProps) {
	const [timer, setTimer] = useState<number>(VERIFICATION_CONFIG.timerDuration);
	const [isVerifying, setIsVerifying] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();
	const { confirmSignIn, login, rememberMe, error, clearError } =
		useAuthStore();

	const { control, handleSubmit, watch } = useForm<VerificationFormData>({
		defaultValues: {
			code: Array(VERIFICATION_CONFIG.codeLength).fill(""),
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

	const onSubmit = async (data: VerificationFormData) => {
		const verificationCode = data.code.join("");
		setIsVerifying(true);
		const success = await confirmSignIn(verificationCode);
		setIsVerifying(false);

		if (success) {
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

	const handleResend = async () => {
		if (!email || !password) return;

		clearError();
		setIsResending(true);
		const result = await login({
			email: email.trim().toLowerCase(),
			password: password,
			rememberMe,
		});
		setIsResending(false);

		if (result === "verification") {
			setTimer(VERIFICATION_CONFIG.timerDuration);
			toast.success(AUTH_TOAST_MESSAGES.codeResent);
		}
	};

	return (
		<Card className="gap-0 rounded-none border-0 bg-transparent py-0 shadow-none">
			<div className="flex w-full flex-col gap-16">
				<div className="flex w-full flex-col gap-3 text-center">
					<CardTitle className="w-full text-balance text-heading-2 font-semibold leading-heading-2 tracking-heading-2 text-text-foreground">
						{VERIFICATION_PAGE_CONTENT.title}
					</CardTitle>
					<CardDescription className="w-full text-regular font-normal leading-regular tracking-normal text-text-secondary">
						{VERIFICATION_PAGE_CONTENT.subtitle}
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
									{VERIFICATION_PAGE_CONTENT.codeLabel}
								</span>
								<span className="shrink-0 text-small leading-small text-text-secondary">
									{formatTime(timer)}
								</span>
							</div>
							<div className="flex flex-col gap-2">
								<Controller
									name="code"
									control={control}
									render={({ field }) => (
										<OTPInput
											length={VERIFICATION_CONFIG.codeLength}
											value={field.value}
											onChange={(value) => {
												if (error) clearError();
												field.onChange(value);
											}}
											error={!!error}
										/>
									)}
								/>
								{error ? (
									<p
										className="text-small leading-small text-destructive"
										role="alert"
									>
										{error}
									</p>
								) : null}
							</div>
						</div>
					</div>

					<Button
						type="submit"
						disabled={!isCodeComplete}
						isLoading={isVerifying}
						size="lg"
						className="h-10 min-h-10 w-full rounded-lg text-small font-semibold text-light-same"
					>
						{isVerifying
							? VERIFICATION_PAGE_CONTENT.loadingText
							: VERIFICATION_PAGE_CONTENT.submitButton}
					</Button>

					<div className="flex flex-wrap items-center justify-center gap-1 text-center">
						<span className="text-small font-normal leading-small text-text-secondary">
							{VERIFICATION_PAGE_CONTENT.resendText}
						</span>
						<Button
							type="button"
							variant="link"
							onClick={handleResend}
							disabled={isResending || timer > 0}
							className="h-auto min-h-8 cursor-pointer px-1.5 py-1.5 text-small font-semibold text-link underline hover:text-link-hover disabled:cursor-not-allowed disabled:opacity-50"
						>
							{VERIFICATION_PAGE_CONTENT.resendLink}
						</Button>
					</div>
				</form>
			</div>
		</Card>
	);
}
