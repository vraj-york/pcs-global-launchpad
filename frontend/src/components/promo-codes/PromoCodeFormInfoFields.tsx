import { Info } from "lucide-react";
import { DatePickerInput, FormInput } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { FORM_PLACEHOLDERS, PROMO_CODES_PAGE_CONTENT } from "@/const";
import { cn } from "@/lib/utils";
import type { CreatePromoCodeFormValues } from "@/schemas";
import type { PromoCodeFormInfoFieldsProps } from "@/types";

const C = PROMO_CODES_PAGE_CONTENT;

const selectTriggerClassName = "h-10 min-h-10 w-full";

function PromoFormLabelWithTooltip({
	htmlFor,
	labelText,
	tooltip,
}: {
	htmlFor: string;
	labelText: string;
	tooltip: string;
}) {
	return (
		<div className="flex min-h-5 items-center gap-1">
			<Label
				htmlFor={htmlFor}
				className="text-small font-medium leading-snug text-text-foreground"
			>
				{labelText}
			</Label>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label={tooltip}
					>
						<Info className="size-3.5" aria-hidden />
					</button>
				</TooltipTrigger>
				<TooltipContent sideOffset={6} className="max-w-xs">
					{tooltip}
				</TooltipContent>
			</Tooltip>
		</div>
	);
}

export function PromoCodeFormInfoFields({
	register,
	errors,
	setValue,
	watch,
	planTypes,
	plansLoading,
	discountType,
	duration,
	minExpiryDate,
	scheduleLocked,
	scheduleLockedHint,
}: PromoCodeFormInfoFieldsProps) {
	return (
		<>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="min-w-0">
					<FormInput
						id="promo-code"
						label={C.form.promoCode}
						required
						autoComplete="off"
						placeholder={FORM_PLACEHOLDERS.promoCode}
						error={errors.code?.message}
						{...register("code")}
					/>
				</div>
				<div className="flex min-w-0 flex-col gap-2">
					<Label
						htmlFor="plan-type"
						className="text-small font-medium text-text-foreground"
					>
						<span className="text-destructive">*</span>
						{C.form.plan}
					</Label>
					<Select
						disabled={plansLoading}
						value={watch("planTypeId")}
						onValueChange={(v) =>
							setValue(
								"planTypeId",
								v as CreatePromoCodeFormValues["planTypeId"],
								{ shouldValidate: true },
							)
						}
					>
						<SelectTrigger id="plan-type" className={selectTriggerClassName}>
							<SelectValue placeholder={FORM_PLACEHOLDERS.selectItem} />
						</SelectTrigger>
						<SelectContent>
							{planTypes.map((pt) => (
								<SelectItem key={pt.id} value={pt.id}>
									{pt.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.planTypeId ? (
						<p className="text-mini text-destructive">
							{errors.planTypeId.message}
						</p>
					) : null}
				</div>
				<div className="flex min-w-0 flex-col gap-2">
					<Label
						htmlFor="instalment"
						className="text-small font-medium text-text-foreground"
					>
						<span className="text-destructive">*</span>
						{C.form.instalmentType}
					</Label>
					<Select
						value={duration}
						onValueChange={(v) =>
							setValue("duration", v as "once" | "forever", {
								shouldValidate: true,
							})
						}
					>
						<SelectTrigger id="instalment" className={selectTriggerClassName}>
							<SelectValue placeholder={C.form.instalmentOnce} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="once">{C.form.instalmentOnce}</SelectItem>
							<SelectItem value="forever">
								{C.form.instalmentForever}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="w-full min-w-0">
				<FormInput
					id="promo-description"
					label={C.form.description}
					placeholder={FORM_PLACEHOLDERS.enterPromoDescription}
					error={errors.description?.message}
					{...register("description")}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="flex min-w-0 flex-col gap-2">
					<Label
						htmlFor="discount-type"
						className={cn(
							"text-small font-medium text-text-foreground",
							"min-h-5",
						)}
					>
						<span className="text-destructive">*</span>
						{C.form.discountType}
					</Label>
					<Select
						value={discountType}
						onValueChange={(v) =>
							setValue("discountType", v as "percent" | "fixed_amount", {
								shouldValidate: true,
							})
						}
					>
						<SelectTrigger
							id="discount-type"
							className={selectTriggerClassName}
						>
							<SelectValue placeholder={FORM_PLACEHOLDERS.selectItem} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="percent">
								{C.form.discountTypePercent}
							</SelectItem>
							<SelectItem value="fixed_amount">
								{C.form.discountTypeFixed}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="min-w-0">
					<FormInput
						id="discount-value"
						label={
							discountType === "percent"
								? C.form.discountLabelPercent
								: C.form.discountLabelFixed
						}
						required
						type="text"
						inputMode="decimal"
						autoComplete="off"
						placeholder={
							discountType === "percent"
								? FORM_PLACEHOLDERS.discountPercent
								: FORM_PLACEHOLDERS.discountFixed
						}
						error={errors.discountValue?.message}
						{...register("discountValue")}
					/>
				</div>
				<div className="min-w-0">
					<div className="space-y-2">
						<PromoFormLabelWithTooltip
							htmlFor="max-redemptions"
							labelText={C.form.maxUsage}
							tooltip={C.form.maxUsageTooltip}
						/>
						<Input
							id="max-redemptions"
							type="text"
							inputMode="numeric"
							autoComplete="off"
							placeholder={FORM_PLACEHOLDERS.maxUsage}
							disabled={scheduleLocked}
							title={scheduleLocked ? scheduleLockedHint : undefined}
							className={cn(
								"h-10 min-h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-none transition-colors placeholder:text-muted-foreground focus-visible:border-border focus-visible:outline-none focus-visible:ring-0 disabled:bg-card disabled:text-muted-foreground disabled:opacity-100",
								errors.maxRedemptions && "border-destructive",
							)}
							aria-invalid={!!errors.maxRedemptions}
							{...register("maxRedemptions")}
						/>
						{errors.maxRedemptions?.message ? (
							<p className="text-mini text-destructive">
								{errors.maxRedemptions.message}
							</p>
						) : null}
					</div>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="w-full max-w-md min-w-0 space-y-2">
					<PromoFormLabelWithTooltip
						htmlFor="expiry-date"
						labelText={C.form.expiryDate}
						tooltip={C.form.expiryDateTooltip}
					/>
					<DatePickerInput
						id="expiry-date"
						value={watch("expiresAt") ?? ""}
						onChange={(v) =>
							setValue("expiresAt", v, {
								shouldValidate: true,
							})
						}
						placeholder={FORM_PLACEHOLDERS.selectExpiryDate}
						error={errors.expiresAt?.message}
						min={minExpiryDate}
						disabled={scheduleLocked}
					/>
				</div>
			</div>
		</>
	);
}
