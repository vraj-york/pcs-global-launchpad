import { yupResolver } from "@hookform/resolvers/yup";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CollapsibleCard, FormInput, WhiteBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	FORM_PLACEHOLDERS,
	INVITE_MANAGEMENT_INVITE_TYPE,
	INVITE_MANAGEMENT_PAGE_CONTENT,
	MORE_FILTERS_TIMEZONE_OPTIONS,
	ROUTES,
} from "@/const";
import { cn } from "@/lib/utils";
import {
	type SendAssessmentInviteFormSchemaType,
	sendAssessmentInviteFormSchema,
} from "@/schemas";
import { useInviteManagementStore } from "@/store";
import type {
	AssessmentInvitePromoSelectProps,
	PromoCodeAvailableForCompanySetupItem,
} from "@/types";
import { computeNetAmountAfterPromo, formatCurrencyAmount } from "@/utils";

const C = INVITE_MANAGEMENT_PAGE_CONTENT;

function formatPromoSelectLabel(row: PromoCodeAvailableForCompanySetupItem) {
	if (row.discountType === "percent") {
		return `${row.code} (${row.discountValue}%)`;
	}
	return `${row.code} (${formatCurrencyAmount(row.discountValue)})`;
}

function AssessmentInvitePromoSelect({
	id,
	value,
	onChange,
	error,
	options,
	loading,
	loadError,
}: AssessmentInvitePromoSelectProps) {
	const items = useMemo(() => options.map((row) => row.id), [options]);

	const itemToStringLabel = useCallback(
		(promoId: string) => {
			const row = options.find((o) => o.id === promoId);
			return row ? formatPromoSelectLabel(row) : promoId;
		},
		[options],
	);

	const comboboxValue = useMemo(() => {
		const trimmed = value.trim();
		if (!trimmed) return null;
		return options.some((o) => o.id === trimmed) ? trimmed : null;
	}, [value, options]);

	const disabled = loading || options.length === 0;

	return (
		<div className="flex min-w-0 w-full flex-col gap-1">
			<Label htmlFor={id} className="text-sm font-medium text-text-foreground">
				<span className="text-destructive">*</span> {C.fieldPromoCode}
			</Label>
			{loadError ? (
				<p className="text-mini text-destructive" role="alert">
					{C.promoCodesLoadError} {loadError}
				</p>
			) : null}
			<Combobox
				items={items}
				value={comboboxValue}
				onValueChange={(v) => onChange(v ?? "")}
				itemToStringLabel={itemToStringLabel}
				isItemEqualToValue={(a, b) => a === b}
				disabled={disabled}
			>
				<ComboboxInput
					id={id}
					className={cn("h-10 w-full min-w-0", error && "border-destructive")}
					placeholder={FORM_PLACEHOLDERS.searchOrSelectPromoCode}
					aria-label={C.fieldPromoCode}
					aria-invalid={!!error}
				/>
				<ComboboxContent>
					<ComboboxList>
						{(item: string) => (
							<ComboboxItem key={item} value={item}>
								{itemToStringLabel(item)}
							</ComboboxItem>
						)}
					</ComboboxList>
					<ComboboxEmpty>{C.promoCodeComboboxNoMatches}</ComboboxEmpty>
				</ComboboxContent>
			</Combobox>
			{error ? (
				<p className="text-mini text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}

export function SendAssessmentInviteContent() {
	const navigate = useNavigate();
	const formId = "send-assessment-invite-form";

	const {
		assessmentInviteOptions,
		assessmentInviteOptionsLoading,
		assessmentInviteOptionsError,
		isSendAssessmentInviteSubmitting,
		fetchAssessmentInviteOptions,
		sendAssessmentInvite,
	} = useInviteManagementStore();

	const {
		register,
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = useForm<SendAssessmentInviteFormSchemaType>({
		resolver: yupResolver(
			sendAssessmentInviteFormSchema,
		) as Resolver<SendAssessmentInviteFormSchemaType>,
		mode: "onTouched",
		reValidateMode: "onChange",
		defaultValues: {
			firstName: "",
			lastName: "",
			nickname: "",
			email: "",
			workPhone: "",
			cellPhone: "",
			timezone: "",
			inviteeType: INVITE_MANAGEMENT_INVITE_TYPE.fullAccountUser,
			hasPromoCode: false,
			promoCodeId: "",
		},
	});

	const hasPromoCode = watch("hasPromoCode");
	const promoCodeId = watch("promoCodeId");

	useEffect(() => {
		void fetchAssessmentInviteOptions();
	}, [fetchAssessmentInviteOptions]);

	useEffect(() => {
		if (!hasPromoCode) {
			setValue("promoCodeId", "", { shouldValidate: false });
		}
	}, [hasPromoCode, setValue]);

	const handleCancel = useCallback(() => {
		void navigate(ROUTES.inviteManagement.root);
	}, [navigate]);

	const handleFormSubmit = useCallback(
		async (values: SendAssessmentInviteFormSchemaType) => {
			const payload = {
				firstName: values.firstName.trim(),
				lastName: values.lastName.trim(),
				email: values.email.trim(),
				workPhone: values.workPhone.trim(),
				timezone: values.timezone,
				hasPromoCode: values.hasPromoCode,
			};
			const nick = values.nickname.trim();
			if (nick) Object.assign(payload, { nickname: nick });
			const cell = values.cellPhone?.trim() ?? "";
			if (cell) Object.assign(payload, { cellPhone: cell });
			if (values.hasPromoCode) {
				Object.assign(payload, {
					promoCodeId: (values.promoCodeId ?? "").trim(),
				});
			}

			const ok = await sendAssessmentInvite(payload);
			if (!ok) return;
			void navigate(ROUTES.inviteManagement.root);
		},
		[navigate, sendAssessmentInvite],
	);

	const promoOptions = assessmentInviteOptions?.promoCodes ?? [];
	const depsLoading =
		assessmentInviteOptionsLoading || !!assessmentInviteOptionsError;

	const invoiceAmountDisplay = useMemo(() => {
		if (!assessmentInviteOptions) return "";
		const baseAmount = assessmentInviteOptions.invoiceAmount;
		if (!hasPromoCode) return formatCurrencyAmount(baseAmount);

		const selectedPromoId = (promoCodeId ?? "").trim();
		if (!selectedPromoId) return formatCurrencyAmount(baseAmount);

		const selectedPromo =
			promoOptions.find((promo) => promo.id === selectedPromoId) ?? null;
		return formatCurrencyAmount(
			computeNetAmountAfterPromo(baseAmount, selectedPromo),
		);
	}, [assessmentInviteOptions, hasPromoCode, promoCodeId, promoOptions]);

	const assessmentTypeDisplay = assessmentInviteOptions?.assessmentType ?? "";

	if (assessmentInviteOptionsLoading && !assessmentInviteOptions) {
		return (
			<div className="mt-6 flex min-h-48 items-center justify-center py-8">
				<Loader2
					className="size-8 shrink-0 animate-spin text-primary"
					aria-hidden
				/>
			</div>
		);
	}

	return (
		<form
			id={formId}
			onSubmit={handleSubmit(handleFormSubmit)}
			className="mt-6 flex flex-1 flex-col"
		>
			<WhiteBox padding="md" className="mb-6 flex flex-col gap-6">
				{assessmentInviteOptionsError && (
					<p className="text-small text-destructive">
						{assessmentInviteOptionsError}
					</p>
				)}

				<div className="flex flex-col gap-4">
					<CollapsibleCard title={C.cardBasicInfo} className="w-full min-w-0">
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								<FormInput
									id="send-invite-first-name"
									label={C.fieldFirstName}
									required
									autoComplete="given-name"
									placeholder={FORM_PLACEHOLDERS.firstNameNico}
									error={errors.firstName?.message}
									{...register("firstName")}
								/>
								<FormInput
									id="send-invite-last-name"
									label={C.fieldLastName}
									required
									autoComplete="family-name"
									placeholder={FORM_PLACEHOLDERS.lastNameRobin}
									error={errors.lastName?.message}
									{...register("lastName")}
								/>
								<FormInput
									id="send-invite-nickname"
									label={C.fieldNickname}
									autoComplete="nickname"
									placeholder={FORM_PLACEHOLDERS.nicknameNicbin}
									error={errors.nickname?.message}
									{...register("nickname")}
								/>
								<FormInput
									id="send-invite-email"
									label={C.fieldEmail}
									required
									type="email"
									autoComplete="email"
									placeholder={FORM_PLACEHOLDERS.emailNicoRobin}
									error={errors.email?.message}
									{...register("email")}
								/>
								<FormInput
									id="send-invite-work-phone"
									label={C.fieldWorkPhone}
									required
									type="tel"
									autoComplete="tel"
									placeholder={FORM_PLACEHOLDERS.phoneFormatted}
									error={errors.workPhone?.message}
									{...register("workPhone")}
								/>
								<FormInput
									id="send-invite-cell-phone"
									label={C.fieldCellPhone}
									type="tel"
									autoComplete="tel"
									placeholder={FORM_PLACEHOLDERS.cellPhone}
									error={errors.cellPhone?.message}
									{...register("cellPhone")}
								/>
								<Field data-invalid={!!errors.timezone}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{C.fieldTimezone}
									</FieldLabel>
									<Controller
										name="timezone"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													className="h-10 w-full"
													aria-invalid={!!errors.timezone}
												>
													<SelectValue
														placeholder={FORM_PLACEHOLDERS.selectTimeZone}
													/>
												</SelectTrigger>
												<SelectContent>
													{MORE_FILTERS_TIMEZONE_OPTIONS.map((o) => (
														<SelectItem key={o.value} value={o.value}>
															{o.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									<FieldError>{errors.timezone?.message}</FieldError>
								</Field>
								<Field data-invalid={!!errors.inviteeType}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{C.fieldInviteeType}
									</FieldLabel>
									<Controller
										name="inviteeType"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
												disabled
											>
												<SelectTrigger
													className="h-10 w-full"
													aria-invalid={!!errors.inviteeType}
													aria-label={C.fieldInviteeType}
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem
														value={
															INVITE_MANAGEMENT_INVITE_TYPE.fullAccountUser
														}
													>
														{INVITE_MANAGEMENT_INVITE_TYPE.fullAccountUser}
													</SelectItem>
												</SelectContent>
											</Select>
										)}
									/>
									<FieldError>{errors.inviteeType?.message}</FieldError>
								</Field>
							</div>
						</FieldGroup>
					</CollapsibleCard>

					<CollapsibleCard
						title={C.cardAssessmentInfo}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								<FormInput
									id="send-invite-assessment-type"
									label={C.fieldAssessmentType}
									value={assessmentTypeDisplay}
									readOnly
									disabled
								/>
								<FormInput
									id="send-invite-invoice-amount"
									label={C.fieldInvoiceAmount}
									value={invoiceAmountDisplay}
									readOnly
									disabled
								/>

								<div className="col-span-full flex items-center justify-between rounded-lg border border-border bg-background p-4">
									<div className="flex flex-col gap-1">
										<span className="text-sm font-medium text-text-foreground">
											{C.hasPromoCodeLabel}
										</span>
										<span className="text-xs tracking-wide text-muted-foreground">
											{C.hasPromoCodeDescription}
										</span>
									</div>
									<Controller
										name="hasPromoCode"
										control={control}
										render={({ field }) => (
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={depsLoading}
												aria-label={C.hasPromoCodeLabel}
											/>
										)}
									/>
								</div>

								{hasPromoCode && (
									<Controller
										name="promoCodeId"
										control={control}
										render={({ field }) => (
											<AssessmentInvitePromoSelect
												id="send-invite-promo-code"
												value={field.value ?? ""}
												onChange={field.onChange}
												error={errors.promoCodeId?.message}
												options={promoOptions}
												loading={assessmentInviteOptionsLoading}
												loadError={assessmentInviteOptionsError}
											/>
										)}
									/>
								)}
							</div>
						</FieldGroup>
					</CollapsibleCard>
				</div>

				<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						className="min-w-20"
					>
						{C.cancelButton}
					</Button>
					<Button
						type="submit"
						form={formId}
						disabled={depsLoading}
						isLoading={isSendAssessmentInviteSubmitting}
					>
						{C.sendInvitationButton}
					</Button>
				</div>
			</WhiteBox>
		</form>
	);
}
