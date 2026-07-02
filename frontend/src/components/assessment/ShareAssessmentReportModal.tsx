import { yupResolver } from "@hookform/resolvers/yup";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ContentModal } from "@/components";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	ASSESSMENT_REPORT_SHARE,
	ASSESSMENT_REPORT_SHARE_MODAL,
} from "@/const";
import { cn } from "@/lib/utils";
import { shareAssessmentReportFormSchema } from "@/schemas";
import type {
	ShareAssessmentReportFormValues,
	ShareAssessmentReportModalProps,
} from "@/types";
import { splitEmailInput, validateEmailParts } from "@/utils";

export function ShareAssessmentReportModal({
	open,
	onOpenChange,
	onShare,
	isSharing,
}: ShareAssessmentReportModalProps) {
	const {
		register,
		handleSubmit,
		watch,
		setValue,
		getValues,
		reset,
		setError,
		clearErrors,
		trigger,
		formState: { errors },
	} = useForm<ShareAssessmentReportFormValues>({
		resolver: yupResolver(shareAssessmentReportFormSchema),
		defaultValues: { draftEmail: "", recipients: [] },
		mode: "onBlur",
		reValidateMode: "onChange",
	});

	const recipients = watch("recipients") ?? [];
	const recipientsInputId = ASSESSMENT_REPORT_SHARE_MODAL.recipientsInputId;
	const formId = ASSESSMENT_REPORT_SHARE_MODAL.formId;

	useEffect(() => {
		if (open) {
			reset({ draftEmail: "", recipients: [] });
			clearErrors();
		}
	}, [open, reset, clearErrors]);

	const addEmailsFromString = (raw: string) => {
		const parts = splitEmailInput(raw);
		if (parts.length === 0) {
			return;
		}
		if (!validateEmailParts(parts)) {
			setError("draftEmail", {
				type: "manual",
				message: ASSESSMENT_REPORT_SHARE_MODAL.invalidEmail,
			});
			return;
		}
		const current = getValues("recipients") ?? [];
		const next = [...current];
		for (const p of parts) {
			if (!next.includes(p)) {
				next.push(p);
			}
		}
		setValue("recipients", next, { shouldValidate: true });
		setValue("draftEmail", "");
		clearErrors("draftEmail");
	};

	const handleDraftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "Enter") {
			return;
		}
		e.preventDefault();
		addEmailsFromString(getValues("draftEmail") ?? "");
	};

	const handleRemoveRecipient = (email: string) => {
		setValue(
			"recipients",
			recipients.filter((r) => r !== email),
			{ shouldValidate: true },
		);
	};

	const onValid = async (values: ShareAssessmentReportFormValues) => {
		const list = [...(values.recipients ?? [])];
		const draftParts = splitEmailInput(values.draftEmail ?? "");
		for (const p of draftParts) {
			if (!list.includes(p)) {
				list.push(p);
			}
		}
		await onShare(list);
	};

	const handleDialogOpenChange = (next: boolean) => {
		if (!next && isSharing) {
			return;
		}
		onOpenChange(next);
	};

	return (
		<ContentModal
			open={open}
			onOpenChange={handleDialogOpenChange}
			title={ASSESSMENT_REPORT_SHARE_MODAL.title}
			contentClassName={cn(
				"flex w-full max-w-2xl flex-col gap-0 overflow-hidden p-0",
				"max-h-[90vh] rounded-xl border border-border ring-0",
			)}
		>
			<div className="flex flex-col">
				<form
					id={formId}
					className="flex flex-col"
					onSubmit={handleSubmit(onValid)}
					noValidate
				>
					<div className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto px-6 py-6">
						<div className="flex flex-col gap-1">
							<Label
								htmlFor={recipientsInputId}
								className="gap-1 text-small font-medium leading-small"
							>
								<span className="text-destructive" aria-hidden>
									*
								</span>
								{ASSESSMENT_REPORT_SHARE_MODAL.recipientsLabel}
							</Label>
							<Input
								id={recipientsInputId}
								placeholder={
									ASSESSMENT_REPORT_SHARE_MODAL.recipientsPlaceholder
								}
								{...register("draftEmail", {
									onBlur: () => {
										void trigger("draftEmail");
									},
								})}
								onKeyDown={handleDraftKeyDown}
								disabled={isSharing}
								autoComplete="off"
								aria-invalid={Boolean(errors.draftEmail)}
								aria-required
								className={cn(errors.draftEmail && "border-destructive")}
							/>
							{errors.draftEmail ? (
								<p
									id={`${recipientsInputId}-error`}
									className="text-small text-destructive"
									role="alert"
								>
									{errors.draftEmail.message}
								</p>
							) : null}
						</div>

						<div
							className="h-px w-full shrink-0 bg-border"
							role="presentation"
							aria-hidden
						/>

						<div className="flex flex-col gap-2">
							<p className="text-small font-normal leading-small text-text-secondary">
								{ASSESSMENT_REPORT_SHARE_MODAL.recipientsCount(
									recipients.length,
								)}
							</p>
							{recipients.length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{recipients.map((email) => (
										<span
											key={email}
											className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-brand-gray-bg px-2 py-1.5 text-mini font-semibold leading-mini text-brand-gray-text"
										>
											<span className="truncate">{email}</span>
											<button
												type="button"
												className="shrink-0 rounded p-0.5 text-brand-gray-text hover:text-text-foreground"
												onClick={() => handleRemoveRecipient(email)}
												aria-label={`${ASSESSMENT_REPORT_SHARE_MODAL.removeRecipientAriaLabel} ${email}`}
												tabIndex={0}
											>
												<X className="size-3.5" aria-hidden />
											</button>
										</span>
									))}
								</div>
							) : null}
						</div>
					</div>
				</form>
				<div className="shrink-0 border-t border-border px-6 py-5">
					<DialogFooter className="mt-0 gap-2 sm:gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSharing}
						>
							{ASSESSMENT_REPORT_SHARE_MODAL.cancel}
						</Button>
						<Button type="submit" form={formId} isLoading={isSharing}>
							{isSharing
								? ASSESSMENT_REPORT_SHARE.sharing
								: ASSESSMENT_REPORT_SHARE_MODAL.shareResult}
						</Button>
					</DialogFooter>
				</div>
			</div>
		</ContentModal>
	);
}
