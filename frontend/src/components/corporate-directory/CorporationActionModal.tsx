import { yupResolver } from "@hookform/resolvers/yup";
import { AlertTriangle, Ban } from "lucide-react";
import { useEffect } from "react";
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
	CLOSE_CORPORATION_MODAL as CLOSE_M,
	CORPORATION_ACTION_REASONS,
	FORM_PLACEHOLDERS,
	CORPORATION_ACTION_MODAL_SHARED as SHARED,
	SUSPEND_CORPORATION_MODAL as SUSPEND_M,
} from "@/const";
import {
	type CorporationActionFormSchemaType,
	corporationActionFormSchema,
} from "@/schemas";
import type { CorporationActionModalProps } from "@/types";

const defaultValues: CorporationActionFormSchemaType = {
	reason: "",
	notes: "",
};

export function CorporationActionModal({
	open,
	onOpenChange,
	action,
	corporationName,
	onConfirm,
	contentClassName,
}: CorporationActionModalProps) {
	const isClose = action === "close";
	const M = isClose ? CLOSE_M : SUSPEND_M;

	const {
		control,
		handleSubmit,
		register,
		reset,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<CorporationActionFormSchemaType>({
		defaultValues,
		resolver: yupResolver(corporationActionFormSchema),
	});

	const selectedReason = watch("reason");
	const isOtherSelected = selectedReason === "Other";
	const notesValue = watch("notes");

	useEffect(() => {
		if (!open) reset(defaultValues);
	}, [open, action, reset]);

	const onSubmit = async (data: CorporationActionFormSchemaType) => {
		await onConfirm(action, data.reason ?? "", data.notes ?? "");
		onOpenChange(false);
	};

	return (
		<ContentModal
			open={open}
			onOpenChange={onOpenChange}
			contentClassName={contentClassName}
			title={M.title}
			description={M.subtitle(corporationName)}
		>
			<div className="flex flex-col gap-6 px-6 py-6">
				<div className="flex flex-col gap-2">
					<div
						className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
						role="alert"
					>
						<div className="flex h-5 shrink-0 items-center">
							{isClose ? (
								<Ban className="size-4 text-red-600" aria-hidden />
							) : (
								<AlertTriangle className="size-4 text-red-600" aria-hidden />
							)}
						</div>
						<div className="flex min-w-0 flex-1 flex-col gap-1.5 text-small">
							<p className="font-semibold">{M.warningTitle}</p>
							<ul className="list-inside list-disc space-y-0.5">
								{M.impactList.map((item) => (
									<li key={item} className="text-text-foreground">
										{item}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				<form
					id="corporation-action-form"
					onSubmit={handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<div className="space-y-1">
						<Label
							htmlFor="corporation-action-reason"
							className="text-small font-medium text-text-foreground"
						>
							<span className="text-destructive">*</span>{" "}
							{SHARED.preDefinedReasonsLabel}
						</Label>
						<Controller
							name="reason"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										id="corporation-action-reason"
										className={`h-9 w-full rounded-lg ${errors.reason ? "border-destructive" : ""}`}
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
						{errors.reason?.message && (
							<p className="text-mini text-destructive">
								{errors.reason.message}
							</p>
						)}
					</div>
					<div className="space-y-1">
						<Label
							htmlFor="corporation-action-notes"
							className="text-small font-medium text-text-foreground"
						>
							{isOtherSelected && <span className="text-destructive">*</span>}{" "}
							{SHARED.additionalNotesLabel}
						</Label>
						<Textarea
							id="corporation-action-notes"
							placeholder={FORM_PLACEHOLDERS.typeNotes}
							className={`max-h-24 resize-none rounded-lg ${errors.notes ? "border-destructive" : ""}`}
							rows={3}
							aria-required={isOtherSelected}
							aria-invalid={!!errors.notes}
							{...register("notes")}
						/>
						{errors.notes?.message && (
							<p className="text-mini text-destructive">
								{errors.notes.message}
							</p>
						)}
					</div>
				</form>
			</div>

			<DialogFooter className="mt-0 flex gap-2 border-t border-border px-6 py-5 sm:justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={() => onOpenChange(false)}
				>
					{SHARED.cancelButton}
				</Button>
				<Button
					type="submit"
					form="corporation-action-form"
					variant="destructive"
					isLoading={isSubmitting}
					disabled={
						!selectedReason?.trim() || (isOtherSelected && !notesValue?.trim())
					}
				>
					{M.confirmButton}
				</Button>
			</DialogFooter>
		</ContentModal>
	);
}
