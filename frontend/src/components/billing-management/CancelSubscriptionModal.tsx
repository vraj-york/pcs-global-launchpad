import { yupResolver } from "@hookform/resolvers/yup";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { ContentModal } from "@/components/common/ContentModal";
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
	BILLING_CANCEL_SUBSCRIPTION_MODAL,
	BILLING_CANCEL_SUBSCRIPTION_REASONS,
	BILLING_MANAGEMENT_UI,
} from "@/const";
import { cn } from "@/lib/utils";
import {
	type BillingCancelSubscriptionFormSchemaType,
	billingCancelSubscriptionFormSchema,
} from "@/schemas";
import type { CancelSubscriptionModalProps } from "@/types";
import { formatDateShort, formatMoneyFromMinorUnits } from "@/utils";

const defaultValues: BillingCancelSubscriptionFormSchemaType = {
	reason: "",
	notes: "",
};

function SummaryField({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5 sm:w-72">
			<p className="text-small text-text-secondary">{label}</p>
			<p className="text-small font-semibold text-text-foreground">{value}</p>
		</div>
	);
}

export function CancelSubscriptionModal({
	open,
	onOpenChange,
	row,
	onConfirm,
	isConfirming = false,
}: CancelSubscriptionModalProps) {
	const {
		control,
		handleSubmit,
		register,
		reset,
		formState: { errors },
		watch,
	} = useForm<BillingCancelSubscriptionFormSchemaType>({
		defaultValues,
		resolver: yupResolver(billingCancelSubscriptionFormSchema),
	});

	const selectedReason = watch("reason");
	const notesValue = watch("notes");
	const isOtherSelected = selectedReason === "Other";

	const periodEndLabel = useMemo(() => {
		if (!row.renewalDate) {
			return null;
		}
		try {
			return formatDateShort(new Date(`${row.renewalDate}T12:00:00Z`));
		} catch {
			return row.renewalDate;
		}
	}, [row.renewalDate]);

	const nextAmountLabel = useMemo(() => {
		if (row.nextBillingAmountCents != null && row.nextBillingCurrency) {
			return formatMoneyFromMinorUnits(
				row.nextBillingAmountCents,
				row.nextBillingCurrency,
			);
		}
		return BILLING_MANAGEMENT_UI.emptyCell;
	}, [row.nextBillingAmountCents, row.nextBillingCurrency]);

	useEffect(() => {
		if (!open) {
			reset(defaultValues);
		}
	}, [open, reset]);

	const onSubmit = async (data: BillingCancelSubscriptionFormSchemaType) => {
		await onConfirm({
			reason: data.reason,
			additionalNotes: data.notes?.trim() || undefined,
		});
	};

	return (
		<ContentModal
			open={open}
			onOpenChange={onOpenChange}
			contentClassName="max-w-2xl gap-0 p-0"
			title={BILLING_CANCEL_SUBSCRIPTION_MODAL.title}
			description={BILLING_CANCEL_SUBSCRIPTION_MODAL.subtitle(row.companyName)}
		>
			<div className="flex flex-col gap-6 px-6 py-6">
				{periodEndLabel ? (
					<div
						className="flex gap-3 rounded-lg bg-warning-bg p-4"
						role="status"
					>
						<div className="flex h-5 shrink-0 items-center pt-0.5">
							<AlertTriangle
								className="size-4 text-interactive-warning-active"
								aria-hidden
							/>
						</div>
						<div className="flex min-w-0 flex-1 flex-col gap-1.5 text-small">
							<p className="font-semibold text-text-foreground">
								{BILLING_CANCEL_SUBSCRIPTION_MODAL.cancellationNoteTitle}
							</p>
							<p className="text-text-foreground">
								{BILLING_CANCEL_SUBSCRIPTION_MODAL.cancellationNoteBefore}
								<span className="font-semibold">{periodEndLabel}</span>
								{BILLING_CANCEL_SUBSCRIPTION_MODAL.cancellationNoteAfter}
							</p>
						</div>
					</div>
				) : null}

				<div className="flex flex-wrap gap-6">
					<SummaryField
						label={BILLING_CANCEL_SUBSCRIPTION_MODAL.currentPlanLabel}
						value={row.planLabel?.trim() || BILLING_MANAGEMENT_UI.emptyCell}
					/>
					<SummaryField
						label={BILLING_CANCEL_SUBSCRIPTION_MODAL.billingCycleLabel}
						value={row.billingCycle?.trim() || BILLING_MANAGEMENT_UI.emptyCell}
					/>
					<SummaryField
						label={BILLING_CANCEL_SUBSCRIPTION_MODAL.nextRenewalDateLabel}
						value={periodEndLabel ?? BILLING_MANAGEMENT_UI.emptyCell}
					/>
					<SummaryField
						label={BILLING_CANCEL_SUBSCRIPTION_MODAL.nextBillingAmountLabel}
						value={nextAmountLabel}
					/>
				</div>

				<div className="h-px w-full bg-border" aria-hidden />

				<form
					id="billing-cancel-subscription-form"
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<div className="space-y-1">
						<Label
							htmlFor="billing-cancel-reason"
							className="text-small font-medium text-text-foreground"
						>
							<span className="text-destructive">*</span>{" "}
							{BILLING_CANCEL_SUBSCRIPTION_MODAL.preDefinedReasonsLabel}
						</Label>
						<Controller
							name="reason"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										id="billing-cancel-reason"
										className={cn(
											"h-9 w-full rounded-lg",
											errors.reason && "border-destructive",
										)}
										aria-required
										aria-invalid={!!errors.reason}
									>
										<SelectValue
											placeholder={
												BILLING_CANCEL_SUBSCRIPTION_MODAL.selectPlaceholder
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{BILLING_CANCEL_SUBSCRIPTION_REASONS.map((r) => (
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
							htmlFor="billing-cancel-notes"
							className="text-small font-medium text-text-foreground"
						>
							{isOtherSelected ? (
								<span className="text-destructive">*</span>
							) : null}{" "}
							{BILLING_CANCEL_SUBSCRIPTION_MODAL.additionalNotesLabel}
						</Label>
						<Textarea
							id="billing-cancel-notes"
							placeholder={BILLING_CANCEL_SUBSCRIPTION_MODAL.notesPlaceholder}
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
					aria-label={BILLING_CANCEL_SUBSCRIPTION_MODAL.cancelButton}
				>
					{BILLING_CANCEL_SUBSCRIPTION_MODAL.cancelButton}
				</Button>
				<Button
					type="submit"
					form="billing-cancel-subscription-form"
					variant="destructive"
					isLoading={isConfirming}
					disabled={
						!selectedReason?.trim() || (isOtherSelected && !notesValue?.trim())
					}
					tabIndex={0}
					aria-label={BILLING_CANCEL_SUBSCRIPTION_MODAL.confirmButton}
				>
					{BILLING_CANCEL_SUBSCRIPTION_MODAL.confirmButton}
				</Button>
			</DialogFooter>
		</ContentModal>
	);
}
