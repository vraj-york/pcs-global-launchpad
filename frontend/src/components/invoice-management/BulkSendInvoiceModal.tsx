import { yupResolver } from "@hookform/resolvers/yup";
import { Info, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ContentModal } from "@/components";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	FORM_PLACEHOLDERS,
	INVOICE_BULK_SEND_MODAL,
	INVOICE_BULK_SEND_PROGRESS,
} from "@/const";
import { cn } from "@/lib/utils";
import {
	type BulkSendInvoiceFormValues,
	bulkSendInvoiceFormSchema,
} from "@/schemas";
import type { BulkSendInvoiceModalProps } from "@/types";
import { splitEmailInput, validateEmailParts } from "@/utils";

export function BulkSendInvoiceModal({
	open,
	onOpenChange,
	onSend,
	isSending,
	sendFailures,
}: BulkSendInvoiceModalProps) {
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
	} = useForm<BulkSendInvoiceFormValues>({
		resolver: yupResolver(bulkSendInvoiceFormSchema),
		defaultValues: { draftEmail: "", recipients: [] },
		mode: "onBlur",
		reValidateMode: "onChange",
	});

	const recipients = watch("recipients") ?? [];
	const showFailureDetails = sendFailures != null && sendFailures.length > 0;

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
				message: INVOICE_BULK_SEND_MODAL.invalidEmail,
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

	const onValid = async (values: BulkSendInvoiceFormValues) => {
		const list = [...(values.recipients ?? [])];
		const draftParts = splitEmailInput(values.draftEmail ?? "");
		for (const p of draftParts) {
			if (!list.includes(p)) {
				list.push(p);
			}
		}
		await onSend(list);
	};

	const handleDialogOpenChange = (next: boolean) => {
		if (!next && isSending) {
			return;
		}
		onOpenChange(next);
	};

	return (
		<ContentModal
			open={open}
			onOpenChange={handleDialogOpenChange}
			title={INVOICE_BULK_SEND_MODAL.title}
			contentClassName={cn(
				"flex h-128 max-h-[90vh] w-full max-w-2xl",
				"flex-col gap-0 overflow-hidden p-0",
				"rounded-xl border border-border ring-0",
			)}
		>
			<div className="flex min-h-0 flex-1 flex-col">
				{showFailureDetails ? (
					<>
						<div
							className="min-h-0 flex-1 overflow-y-auto px-6 py-4"
							role="alert"
							aria-live="assertive"
						>
							<p className="text-heading-4 font-semibold text-text-foreground">
								{INVOICE_BULK_SEND_PROGRESS.failuresHeading}
							</p>
							<p className="mt-2 text-small text-text-secondary">
								{INVOICE_BULK_SEND_PROGRESS.partialFailed(sendFailures.length)}
							</p>
							<ul className="mt-4 list-none space-y-2 text-small text-text-foreground">
								{sendFailures.map((f, index) => (
									<li
										key={`${index}-${f.target}`}
										className="rounded-md border border-border bg-card px-3 py-2"
									>
										<span className="font-medium text-text-foreground">
											{f.target}
										</span>
										<span className="text-text-secondary">
											{" — "}
											{f.message}
										</span>
									</li>
								))}
							</ul>
						</div>
						<div className="shrink-0 border-t border-border px-6 py-4">
							<DialogFooter className="mt-0 justify-end sm:justify-end">
								<Button type="button" onClick={() => onOpenChange(false)}>
									{INVOICE_BULK_SEND_PROGRESS.closeAfterFailures}
								</Button>
							</DialogFooter>
						</div>
					</>
				) : (
					<>
						<form
							id="bulk-send-invoice-form"
							className="flex min-h-0 flex-1 flex-col overflow-hidden"
							onSubmit={handleSubmit(onValid)}
							noValidate
						>
							<div className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto px-6 py-4">
								<div
									className="flex flex-col gap-2 rounded-lg border border-info/25 bg-info-bg p-3 text-small text-text-secondary sm:flex-row sm:items-start sm:gap-3"
									role="note"
								>
									<Info
										className="mt-0.5 size-4 shrink-0 text-icon-info"
										aria-hidden
									/>
									<div className="min-w-0 flex-1">
										<p className="font-medium">
											{INVOICE_BULK_SEND_MODAL.noteTitle}
										</p>
										<p className="mt-1">
											{INVOICE_BULK_SEND_MODAL.noteBeforeBold}
											<strong className="font-semibold">
												{INVOICE_BULK_SEND_MODAL.noteBoldPhrase}
											</strong>
											{INVOICE_BULK_SEND_MODAL.noteAfterBold}
										</p>
									</div>
								</div>

								<div className="mt-4 border-t border-border pt-4">
									<div className="flex flex-col gap-2">
										<Label htmlFor="bulk-recipients-input">
											{INVOICE_BULK_SEND_MODAL.recipientsLabel}
										</Label>
										<Input
											id="bulk-recipients-input"
											placeholder={FORM_PLACEHOLDERS.recipients}
											{...register("draftEmail", {
												onBlur: () => {
													void trigger("draftEmail");
												},
											})}
											onKeyDown={handleDraftKeyDown}
											disabled={isSending}
											autoComplete="off"
											aria-invalid={Boolean(errors.draftEmail)}
											className={cn(errors.draftEmail && "border-destructive")}
										/>
										{errors.draftEmail ? (
											<p
												id="bulk-recipients-input-error"
												className="text-small text-destructive"
												role="alert"
											>
												{errors.draftEmail.message}
											</p>
										) : null}
									</div>

									<div className="mt-4 flex flex-col gap-2">
										<p className="text-small font-medium text-text-secondary">
											{INVOICE_BULK_SEND_MODAL.recipientsCount(
												recipients.length,
											)}
										</p>
										{recipients.length > 0 ? (
											<div className="flex flex-wrap gap-2">
												{recipients.map((email) => (
													<span
														key={email}
														className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-gray-bg px-2 py-1 text-xs text-brand-gray-text"
													>
														<span className="truncate">{email}</span>
														<button
															type="button"
															className="shrink-0 rounded p-0.5 text-brand-gray-text hover:text-text-foreground"
															onClick={() => handleRemoveRecipient(email)}
															aria-label={`${INVOICE_BULK_SEND_MODAL.removeRecipientAriaLabel} ${email}`}
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
							</div>
						</form>
						<div className="shrink-0 border-t border-border px-6 py-4">
							<DialogFooter className="mt-0 gap-2 sm:gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
									disabled={isSending}
								>
									{INVOICE_BULK_SEND_MODAL.cancel}
								</Button>
								<Button
									type="submit"
									form="bulk-send-invoice-form"
									isLoading={isSending}
								>
									{isSending
										? INVOICE_BULK_SEND_PROGRESS.sending
										: INVOICE_BULK_SEND_MODAL.sendInvoice}
								</Button>
							</DialogFooter>
						</div>
					</>
				)}
			</div>
		</ContentModal>
	);
}
