import { yupResolver } from "@hookform/resolvers/yup";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { ContentModal } from "@/components";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	CORPORATION_ACTION_REASONS,
	FORM_PLACEHOLDERS,
	SUSPEND_COMPANY_MODAL,
} from "@/const";
import { cn } from "@/lib/utils";
import {
	type CompanySuspendFormSchemaType,
	companySuspendFormSchema,
} from "@/schemas";
import type { SuspendCompanyModalProps } from "@/types";

const defaultValues: CompanySuspendFormSchemaType = {
	reason: "",
	notes: "",
};

export function SuspendCompanyModal({
	open,
	onOpenChange,
	companyName,
	onConfirm,
	isConfirming = false,
	contentClassName,
}: SuspendCompanyModalProps) {
	const {
		control,
		handleSubmit,
		register,
		reset,
		formState: { errors },
		watch,
	} = useForm<CompanySuspendFormSchemaType>({
		defaultValues,
		resolver: yupResolver(companySuspendFormSchema),
	});

	const selectedReason = watch("reason");
	const notesValue = watch("notes");
	const isOtherSelected = selectedReason === "Other";

	useEffect(() => {
		if (!open) {
			reset(defaultValues);
		}
	}, [open, reset]);

	const onSubmit = async (data: CompanySuspendFormSchemaType) => {
		await onConfirm(data.reason ?? "", data.notes ?? "");
	};

	return (
		<ContentModal
			open={open}
			onOpenChange={onOpenChange}
			contentClassName={cn("max-w-2xl gap-0 p-0", contentClassName)}
			title={SUSPEND_COMPANY_MODAL.title}
			description={SUSPEND_COMPANY_MODAL.subtitle(companyName)}
		>
			<div className="flex flex-col gap-6 px-6 py-6">
				<div className="flex gap-3 rounded-lg bg-error-bg p-4" role="alert">
					<div className="flex h-5 shrink-0 items-center pt-0.5">
						<AlertTriangle className="size-4 text-destructive" aria-hidden />
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-1.5 text-small">
						<p className="font-semibold text-error-text">
							{SUSPEND_COMPANY_MODAL.warningTitle}
						</p>
						<ul className="list-inside list-disc space-y-0.5 text-text-foreground">
							{SUSPEND_COMPANY_MODAL.impactList.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</div>
				</div>

				<form
					id="company-suspend-form"
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<div className="space-y-1">
						<Label
							htmlFor="company-suspend-reason"
							className="text-small font-medium text-text-foreground"
						>
							<span className="text-destructive">*</span>{" "}
							{SUSPEND_COMPANY_MODAL.preDefinedReasonsLabel}
						</Label>
						<Controller
							name="reason"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										id="company-suspend-reason"
										className={cn(
											"h-9 w-full rounded-lg",
											errors.reason && "border-destructive",
										)}
										aria-required
										aria-invalid={!!errors.reason}
									>
										<SelectValue placeholder={FORM_PLACEHOLDERS.selectReason} />
									</SelectTrigger>
									<SelectContent>
										{CORPORATION_ACTION_REASONS.map((r) => (
											<SelectItem key={r.value} value={r.value}>
												{r.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.reason?.message ? (
							<p className="text-mini text-destructive">
								{errors.reason.message}
							</p>
						) : null}
					</div>
					<div className="space-y-1">
						<Label
							htmlFor="company-suspend-notes"
							className="text-small font-medium text-text-foreground"
						>
							{isOtherSelected ? (
								<span className="text-destructive">*</span>
							) : null}{" "}
							{SUSPEND_COMPANY_MODAL.additionalNotesLabel}
						</Label>
						<Textarea
							id="company-suspend-notes"
							placeholder={FORM_PLACEHOLDERS.typeNotes}
							className={cn(
								"max-h-20 resize-none rounded-lg",
								errors.notes && "border-destructive",
							)}
							rows={3}
							aria-required={isOtherSelected}
							aria-invalid={!!errors.notes}
							{...register("notes")}
						/>
						{errors.notes?.message ? (
							<p className="text-mini text-destructive">
								{errors.notes.message}
							</p>
						) : null}
					</div>
				</form>
			</div>

			<DialogFooter className="mt-0 flex gap-2 border-t border-border px-6 py-5 sm:justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={() => onOpenChange(false)}
					disabled={isConfirming}
					tabIndex={0}
					aria-label={SUSPEND_COMPANY_MODAL.cancelButton}
				>
					{SUSPEND_COMPANY_MODAL.cancelButton}
				</Button>
				<Button
					type="submit"
					form="company-suspend-form"
					variant="destructive"
					isLoading={isConfirming}
					disabled={
						!selectedReason?.trim() || (isOtherSelected && !notesValue?.trim())
					}
					tabIndex={0}
					aria-label={SUSPEND_COMPANY_MODAL.confirmButton}
				>
					{SUSPEND_COMPANY_MODAL.confirmButton}
				</Button>
			</DialogFooter>
		</ContentModal>
	);
}
