import { CircleCheck, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ContentModal, OTPInput } from "@/components";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { SETTINGS_PRIVACY_CONTENT, SETTINGS_PRIVACY_OTP_CONFIG } from "@/const";
import { cn } from "@/lib/utils";
import { usePrivacyDataStore } from "@/store";
import type {
	DataDownloadOtpFormValues,
	SettingsDataDownloadDialogProps,
	SettingsDataDownloadDialogStep,
} from "@/types";
import { formatTime } from "@/utils";

const C = SETTINGS_PRIVACY_CONTENT;
const OTP = SETTINGS_PRIVACY_OTP_CONFIG;

export function SettingsDataDownloadDialog({
	open,
	onOpenChange,
}: SettingsDataDownloadDialogProps) {
	const {
		sendDataDownloadOtp,
		resendDataDownloadOtp,
		verifyDataDownloadOtp,
		isDataDownloadOtpSending,
		isDataDownloadOtpResending,
		isDataDownloadVerifySubmitting,
	} = usePrivacyDataStore();

	const [step, setStep] = useState<SettingsDataDownloadDialogStep>("otp");
	const [otpSent, setOtpSent] = useState(false);
	const [timer, setTimer] = useState<number>(OTP.timerDurationSeconds);

	const { control, handleSubmit, reset, watch } =
		useForm<DataDownloadOtpFormValues>({
			defaultValues: {
				code: Array(OTP.codeLength).fill(""),
			},
		});

	const code = watch("code");
	const isCodeComplete = code.every((digit) => digit !== "");
	const isBusy =
		isDataDownloadOtpSending ||
		isDataDownloadOtpResending ||
		isDataDownloadVerifySubmitting;

	const handleSendOtp = useCallback(async () => {
		const success = await sendDataDownloadOtp();
		if (success) {
			setOtpSent(true);
			setTimer(OTP.timerDurationSeconds);
		}
	}, [sendDataDownloadOtp]);

	useEffect(() => {
		if (!open) {
			setStep("otp");
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
		if (timer > 0 || isDataDownloadOtpResending) return;
		const success = await resendDataDownloadOtp();
		if (success) {
			setTimer(OTP.timerDurationSeconds);
			reset({ code: Array(OTP.codeLength).fill("") });
		}
	};

	const onSubmit = async (data: DataDownloadOtpFormValues) => {
		const otp = data.code.join("");
		const success = await verifyDataDownloadOtp({ otp });
		if (success) {
			setStep("success");
		}
	};

	const handleAcknowledge = () => {
		handleOpenChange(false);
	};

	if (step === "success") {
		return (
			<ContentModal
				open={open}
				onOpenChange={handleOpenChange}
				contentClassName="flex max-w-96 flex-col gap-0 p-0"
				showCloseButton={false}
			>
				<div className="flex flex-col items-center gap-6 p-8">
					<div
						className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-success p-4 max-w-"
						aria-hidden
					>
						<CircleCheck className="size-12 text-light-same" strokeWidth={2} />
					</div>
					<div className="flex max-w-xs flex-col items-center gap-1.5 text-center">
						<p className="text-heading-4 font-semibold text-text-foreground">
							{C.requestSubmittedTitle}
						</p>
						<p className="text-small text-text-secondary">
							{C.requestSubmittedBody}
						</p>
					</div>
					<div className="rounded-md bg-info-bg px-3 py-2">
						<p className="text-mini font-semibold text-link">
							{C.requestSubmittedTimeframe}
						</p>
					</div>
				</div>
				<DialogFooter className="flex-col border-t border-border px-6 py-5 sm:flex-col !mt-0">
					<Button
						type="button"
						className="w-full"
						onClick={handleAcknowledge}
						aria-label={C.okUnderstoodButton}
						tabIndex={0}
					>
						{C.okUnderstoodButton}
					</Button>
				</DialogFooter>
			</ContentModal>
		);
	}

	return (
		<ContentModal
			open={open}
			onOpenChange={handleOpenChange}
			contentClassName="flex max-w-md flex-col gap-0 p-0"
			title={C.dialogTitle}
			description={C.dialogSubtitle}
		>
			<form
				onSubmit={handleSubmit(onSubmit)}
				className="flex flex-col gap-6 p-6"
			>
				<Banner
					title={C.noteTitle}
					titleClassName="text-info-text"
					childrenClassName="text-text-foreground"
				>
					{C.noteBody}
				</Banner>

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
								{isDataDownloadOtpSending ? (
									<Loader2
										className="size-5 shrink-0 animate-spin text-primary"
										aria-hidden
									/>
								) : null}
								<p className="text-center text-small text-muted-foreground">
									{C.sendingCode}
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
							{C.resendPrompt}
						</span>
						<Button
							type="button"
							variant="link"
							onClick={handleResend}
							disabled={
								timer > 0 ||
								isDataDownloadOtpResending ||
								isDataDownloadOtpSending
							}
							className="h-auto min-h-8 cursor-pointer px-0 py-0 text-small font-medium text-link underline hover:text-link-hover disabled:cursor-not-allowed disabled:opacity-50"
							aria-label={C.resendLink}
							tabIndex={otpSent ? 0 : -1}
						>
							{isDataDownloadOtpResending ? C.resending : C.resendLink}
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
						disabled={
							!otpSent || !isCodeComplete || isBusy || isDataDownloadOtpSending
						}
					>
						{isDataDownloadVerifySubmitting
							? C.requestDataSubmitting
							: C.requestDataButton}
					</Button>
				</DialogFooter>
			</form>
		</ContentModal>
	);
}
