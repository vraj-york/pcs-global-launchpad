import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ContentModal, OTPInput } from "@/components";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
	SETTINGS_PAGE_CONTENT,
	SETTINGS_SECURITY_CONTENT,
	SETTINGS_SECURITY_OTP_CONFIG,
} from "@/const";
import { cn } from "@/lib/utils";
import { useAccountSecurityStore } from "@/store";
import type { MfaOtpFormValues, SettingsMfaDialogProps } from "@/types";
import { formatTime } from "@/utils";

const C = SETTINGS_SECURITY_CONTENT;
const OTP = SETTINGS_SECURITY_OTP_CONFIG;
const PAGE = SETTINGS_PAGE_CONTENT;

export function SettingsMfaDialog({
	open,
	onOpenChange,
	mode,
	email,
}: SettingsMfaDialogProps) {
	const {
		sendMfaOtp,
		resendMfaOtp,
		verifyMfaOtp,
		isMfaOtpSending,
		isMfaOtpResending,
		isMfaVerifySubmitting,
	} = useAccountSecurityStore();

	const [otpSent, setOtpSent] = useState(false);
	const [timer, setTimer] = useState<number>(OTP.timerDurationSeconds);

	const { control, handleSubmit, reset, watch } = useForm<MfaOtpFormValues>({
		defaultValues: {
			code: Array(OTP.codeLength).fill(""),
		},
	});

	const code = watch("code");
	const isCodeComplete = code.every((digit) => digit !== "");
	const isBusy = isMfaOtpSending || isMfaOtpResending || isMfaVerifySubmitting;

	const dialogTitle =
		mode === "enable" ? C.mfaDialogTitleEnable : C.mfaDialogTitleDisable;
	const dialogSubtitle =
		mode === "enable" ? C.mfaDialogSubtitleEnable : C.mfaDialogSubtitleDisable;

	const handleSendOtp = useCallback(async () => {
		const success = await sendMfaOtp(mode);
		if (success) {
			setOtpSent(true);
			setTimer(OTP.timerDurationSeconds);
		}
	}, [mode, sendMfaOtp]);

	useEffect(() => {
		if (!open) {
			setOtpSent(false);
			setTimer(OTP.timerDurationSeconds);
			reset({ code: Array(OTP.codeLength).fill("") });
			return;
		}
		void handleSendOtp();
	}, [open, handleSendOtp, reset]);

	useEffect(() => {
		if (!open || !otpSent || timer <= 0) return;
		const interval = setInterval(() => {
			setTimer((prev) => prev - 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [open, otpSent, timer]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen && isBusy) {
			return;
		}
		onOpenChange(nextOpen);
	};

	const handleResend = async () => {
		if (timer > 0 || isMfaOtpResending) return;
		const success = await resendMfaOtp(mode);
		if (success) {
			setTimer(OTP.timerDurationSeconds);
			reset({ code: Array(OTP.codeLength).fill("") });
		}
	};

	const onSubmit = async (data: MfaOtpFormValues) => {
		const otp = data.code.join("");
		const success = await verifyMfaOtp(mode, { otp });
		if (success) {
			handleOpenChange(false);
		}
	};

	const displayEmail = email?.trim() ?? "";

	return (
		<ContentModal
			open={open}
			onOpenChange={handleOpenChange}
			contentClassName="flex max-w-xl flex-col gap-0 p-0"
			title={dialogTitle}
			description={dialogSubtitle}
		>
			<form
				onSubmit={handleSubmit(onSubmit)}
				className="flex flex-col gap-6 p-6"
			>
				<Banner title={C.mfaNoteTitle}>{C.mfaNoteBody}</Banner>

				<div className="flex flex-col gap-1">
					<span className="text-small font-medium text-text-foreground">
						{C.fieldEmail}
					</span>
					<div className="flex min-h-10 items-center rounded-lg border border-input bg-card px-4 py-2">
						<span className="text-small text-muted-foreground">
							{displayEmail || "—"}
						</span>
					</div>
				</div>

				<Separator />

				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-1">
						<div
							className={cn(
								"flex min-h-5 items-start justify-between gap-2",
								!otpSent && "invisible",
							)}
							aria-hidden={!otpSent}
						>
							<span className="text-small font-medium text-text-foreground">
								{C.fieldCode}
							</span>
							<span className="shrink-0 text-small text-destructive tabular-nums">
								{formatTime(timer)}
							</span>
						</div>

						{otpSent ? (
							<Controller
								name="code"
								control={control}
								render={({ field }) => (
									<OTPInput
										length={OTP.codeLength}
										value={field.value}
										onChange={field.onChange}
									/>
								)}
							/>
						) : (
							<div
								className="flex min-h-9 items-center justify-center gap-2"
								role="status"
								aria-live="polite"
							>
								{isMfaOtpSending ? (
									<Loader2
										className="size-5 shrink-0 animate-spin text-primary"
										aria-hidden
									/>
								) : null}
								<p className="text-center text-small text-muted-foreground">
									{C.mfaSendingCode}
								</p>
							</div>
						)}
					</div>

					<div
						className={cn(
							"flex min-h-8 flex-wrap items-center gap-1.5",
							!otpSent && "invisible",
						)}
						aria-hidden={!otpSent}
					>
						<span className="text-small text-muted-foreground">
							{C.mfaResendPrompt}
						</span>
						<Button
							type="button"
							variant="link"
							onClick={handleResend}
							disabled={timer > 0 || isMfaOtpResending || isMfaOtpSending}
							className="h-auto min-h-8 cursor-pointer px-0 py-0 text-small font-medium text-link underline hover:text-link-hover disabled:cursor-not-allowed disabled:opacity-50"
							aria-label={C.mfaResendLink}
							tabIndex={otpSent ? 0 : -1}
						>
							{isMfaOtpResending ? C.mfaResending : C.mfaResendLink}
						</Button>
					</div>
				</div>

				<DialogFooter className="mt-0 flex-row justify-end gap-2 border-t border-border px-0 pt-5 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						disabled={isBusy}
						onClick={() => handleOpenChange(false)}
					>
						{C.cancelButton}
					</Button>
					<Button
						type="submit"
						disabled={!otpSent || !isCodeComplete || isBusy || isMfaOtpSending}
					>
						{isMfaVerifySubmitting ? C.mfaVerifying : PAGE.saveButton}
					</Button>
				</DialogFooter>
			</form>
		</ContentModal>
	);
}
