import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { getActiveCompanies, getCorporationsList } from "@/api";
import { CollapsibleCard, FormInput, WhiteBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	VIEW_CONTACT_DETAILS_PAGE as C,
	CONTACT_TYPE_FILTER_OPTIONS,
	EDIT_CONTACT_PAGE,
	FORM_PLACEHOLDERS,
	MORE_FILTERS_TIMEZONE_OPTIONS,
} from "@/const";
import {
	type EditContactFormSchemaType,
	editContactFormSchema,
} from "@/schemas";
import type {
	ActiveCompanyListItem,
	CorporationListOption,
	EditContactDetailsContentProps,
	KeyContactDetails,
	PatchKeyContactPayload,
} from "@/types";
import { formatCode } from "@/utils";

const CONTACT_TYPE_EDIT_OPTIONS = CONTACT_TYPE_FILTER_OPTIONS.filter(
	(o) => o.value !== "all",
);

function contactTypeFieldValue(raw: string): string {
	const t = raw.trim();
	const byValue = CONTACT_TYPE_EDIT_OPTIONS.find((o) => o.value === t);
	if (byValue) return byValue.value;
	const byLabel = CONTACT_TYPE_EDIT_OPTIONS.find((o) => o.label.trim() === t);
	return byLabel?.value ?? "";
}

function corporationDisplay(c: KeyContactDetails): string {
	if (!c.corporation) return "";
	const code = formatCode(c.corporation.corporationCode, "CORP");
	return `${c.corporation.legalName} (${code})`;
}

export function EditContactDetailsContent({
	contact,
	onCancel,
	onSave,
	isSaving,
	formId = "edit-contact-form",
}: EditContactDetailsContentProps) {
	const corpLine = corporationDisplay(contact);
	const companyLine = contact.company?.legalName?.trim() ?? "";

	const hasCorp = Boolean(contact.corporation);
	const hasCompany = Boolean(contact.company);
	const affiliationsLocked = hasCorp && hasCompany;
	const needsAffiliationOptions = !affiliationsLocked;

	const [corpOptionsLoading, setCorpOptionsLoading] = useState(false);
	const [corporationOptions, setCorporationOptions] = useState<
		CorporationListOption[]
	>([]);
	const [activeCompaniesLoading, setActiveCompaniesLoading] = useState(false);
	const [activeCompanies, setActiveCompanies] = useState<
		ActiveCompanyListItem[]
	>([]);

	useEffect(() => {
		if (!needsAffiliationOptions) return;
		let cancelled = false;
		setCorpOptionsLoading(true);
		void getCorporationsList().then((result) => {
			if (cancelled) return;
			setCorpOptionsLoading(false);
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			setCorporationOptions(result.data);
		});
		return () => {
			cancelled = true;
		};
	}, [needsAffiliationOptions]);

	useEffect(() => {
		if (!needsAffiliationOptions) return;
		let cancelled = false;
		setActiveCompaniesLoading(true);
		void getActiveCompanies().then((result) => {
			if (cancelled) return;
			setActiveCompaniesLoading(false);
			if (!result.ok) {
				toast.error(result.message);
				setActiveCompanies([]);
				return;
			}
			setActiveCompanies(result.data);
		});
		return () => {
			cancelled = true;
		};
	}, [needsAffiliationOptions]);

	/** Keeps selects in sync on first paint (client nav) and after refetch; `reset()` in `useEffect` leaves Radix Select stuck on "". */
	const contactFormValues = useMemo(
		() => ({
			firstName: contact.firstName ?? "",
			lastName: contact.lastName ?? "",
			nickname: contact.nickname ?? "",
			email: contact.email ?? "",
			workPhone: contact.workPhone ?? "",
			cellPhone: contact.cellPhone ?? "",
			timezone: contact.timezone?.trim() ?? "",
			contactType: contactTypeFieldValue(contact.contactType),
			jobRole: contact.jobRole ?? "",
			corporationId: contact.corporation?.id ?? "",
			companyId: contact.company?.id ?? "",
		}),
		[
			contact.id,
			contact.firstName,
			contact.lastName,
			contact.nickname,
			contact.email,
			contact.workPhone,
			contact.cellPhone,
			contact.timezone,
			contact.contactType,
			contact.jobRole,
			contact.corporation?.id,
			contact.company?.id,
		],
	);

	const {
		register,
		control,
		handleSubmit,
		watch,
		setValue,
		clearErrors,
		formState: { errors },
	} = useForm<EditContactFormSchemaType>({
		resolver: yupResolver(
			editContactFormSchema,
		) as Resolver<EditContactFormSchemaType>,
		mode: "onTouched",
		reValidateMode: "onChange",
		values: contactFormValues,
		defaultValues: contactFormValues,
	});

	const watchedCorporationId = watch("corporationId");

	/** If GET detail omits `corporation.id`, match list options by legal name so company dropdown can filter. */
	useEffect(() => {
		const corp = contact.corporation;
		if (!corp || corp.id?.trim()) return;
		if (corporationOptions.length === 0) return;
		const name = corp.legalName?.trim();
		if (!name) return;
		const match = corporationOptions.find((o) => o.legalName.trim() === name);
		if (match) {
			setValue("corporationId", match.id, { shouldValidate: false });
		}
	}, [contact.corporation, corporationOptions, setValue]);

	const effectiveCorporationIdForCompanies = watchedCorporationId?.trim() ?? "";

	const companyChoices = useMemo(() => {
		const cid = effectiveCorporationIdForCompanies;
		if (!cid) return [];
		return activeCompanies
			.filter((c) => c.corporationId === cid)
			.map((c) => ({ id: c.id, label: c.legalName }));
	}, [activeCompanies, effectiveCorporationIdForCompanies]);

	const companySelectPlaceholder = useMemo(() => {
		if (!effectiveCorporationIdForCompanies.trim() || activeCompaniesLoading) {
			return FORM_PLACEHOLDERS.selectCompany;
		}
		return companyChoices.length === 0
			? FORM_PLACEHOLDERS.noActiveCompanies
			: FORM_PLACEHOLDERS.selectCompany;
	}, [
		effectiveCorporationIdForCompanies,
		activeCompaniesLoading,
		companyChoices.length,
	]);

	const prevWatchedCorpForCompanyClearRef = useRef<string | undefined>(
		undefined,
	);

	useEffect(() => {
		prevWatchedCorpForCompanyClearRef.current = undefined;
	}, [contact.id]);

	useEffect(() => {
		if (affiliationsLocked) return;
		const w = watchedCorporationId?.trim() ?? "";
		const prev = prevWatchedCorpForCompanyClearRef.current;
		prevWatchedCorpForCompanyClearRef.current = w;
		if (prev === undefined) return;
		if (prev === w) return;
		setValue("companyId", "", { shouldValidate: false });
		clearErrors("companyId");
	}, [watchedCorporationId, affiliationsLocked, setValue, clearErrors]);

	const depsLoading =
		needsAffiliationOptions && (corpOptionsLoading || activeCompaniesLoading);

	const handleFormSubmit = useCallback(
		async (values: EditContactFormSchemaType) => {
			const payload: PatchKeyContactPayload = {
				firstName: values.firstName.trim(),
				lastName: values.lastName.trim(),
				nickname: values.nickname.trim(),
				email: values.email.trim(),
				workPhone: values.workPhone.trim(),
				cellPhone: values.cellPhone?.trim() ?? "",
				timezone: values.timezone,
				contactType: values.contactType,
				jobRole: values.jobRole.trim(),
			};
			if (!affiliationsLocked) {
				const corpId = values.corporationId.trim();
				const compId = values.companyId.trim();
				if (corpId) payload.corporationId = corpId;
				if (compId) payload.companyId = compId;
			}
			await onSave(payload);
		},
		[affiliationsLocked, onSave],
	);

	return (
		<form
			id={formId}
			onSubmit={handleSubmit(handleFormSubmit)}
			className="mt-6 flex flex-1 flex-col"
		>
			<WhiteBox padding="md" className="mb-6 flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<h2 className="text-heading-4 font-semibold text-text-foreground">
						{EDIT_CONTACT_PAGE.formTitle}
					</h2>
					<p className="text-small text-muted-foreground">
						{EDIT_CONTACT_PAGE.subtitle}
					</p>
				</div>

				<div className="flex flex-col gap-4">
					<CollapsibleCard
						title={EDIT_CONTACT_PAGE.cardBasicInfo}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								<FormInput
									id="edit-contact-first-name"
									label={EDIT_CONTACT_PAGE.fieldFirstName}
									required
									autoComplete="given-name"
									placeholder={FORM_PLACEHOLDERS.firstNameNico}
									error={errors.firstName?.message}
									{...register("firstName")}
								/>
								<FormInput
									id="edit-contact-last-name"
									label={EDIT_CONTACT_PAGE.fieldLastName}
									required
									autoComplete="family-name"
									placeholder={FORM_PLACEHOLDERS.lastNameRobin}
									error={errors.lastName?.message}
									{...register("lastName")}
								/>
								<FormInput
									id="edit-contact-nickname"
									label={C.fieldNickname}
									autoComplete="nickname"
									placeholder={FORM_PLACEHOLDERS.nicknameNicbin}
									error={errors.nickname?.message}
									{...register("nickname")}
								/>
								<FormInput
									id="edit-contact-email"
									label={C.fieldEmail}
									required
									type="email"
									autoComplete="email"
									placeholder={FORM_PLACEHOLDERS.emailNicoRobin}
									error={errors.email?.message}
									{...register("email")}
								/>
								<FormInput
									id="edit-contact-work-phone"
									label={C.fieldWorkPhone}
									required
									type="tel"
									autoComplete="tel"
									placeholder={FORM_PLACEHOLDERS.phoneFormatted}
									error={errors.workPhone?.message}
									{...register("workPhone")}
								/>
								<FormInput
									id="edit-contact-cell-phone"
									label={C.fieldCellPhone}
									type="tel"
									autoComplete="tel"
									placeholder={FORM_PLACEHOLDERS.cellPhone}
									error={errors.cellPhone?.message}
									{...register("cellPhone")}
								/>
								<Field data-invalid={!!errors.timezone}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										{C.fieldTimezone}
									</FieldLabel>
									<Controller
										name="timezone"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value || undefined}
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
							</div>
						</FieldGroup>
					</CollapsibleCard>

					<CollapsibleCard
						title={EDIT_CONTACT_PAGE.cardCorporationCompany}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								{affiliationsLocked ? (
									<>
										<FormInput
											id="edit-contact-corporation"
											label={C.fieldCorporation}
											readOnly
											disabled
											value={corpLine}
											className="h-10 bg-card text-muted-foreground"
										/>
										<FormInput
											id="edit-contact-company"
											label={C.fieldCompany}
											readOnly
											disabled
											value={companyLine}
											className="h-10 bg-card text-muted-foreground"
										/>
									</>
								) : (
									<>
										<Field data-invalid={!!errors.corporationId}>
											<FieldLabel className="text-small font-medium text-text-foreground">
												{C.fieldCorporation}
											</FieldLabel>
											<Controller
												name="corporationId"
												control={control}
												render={({ field }) => (
													<Select
														value={field.value || undefined}
														onValueChange={field.onChange}
														disabled={
															depsLoading || corporationOptions.length === 0
														}
													>
														<SelectTrigger
															className="h-10 w-full"
															aria-invalid={!!errors.corporationId}
															aria-label={FORM_PLACEHOLDERS.selectCorporation}
														>
															<SelectValue
																placeholder={
																	FORM_PLACEHOLDERS.selectCorporation
																}
															/>
														</SelectTrigger>
														<SelectContent>
															{corporationOptions.map((c) => (
																<SelectItem key={c.id} value={c.id}>
																	{c.legalName}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
											<FieldError>{errors.corporationId?.message}</FieldError>
										</Field>
										<Field data-invalid={!!errors.companyId}>
											<FieldLabel className="text-small font-medium text-text-foreground">
												{C.fieldCompany}
											</FieldLabel>
											<Controller
												name="companyId"
												control={control}
												render={({ field }) => (
													<Select
														value={field.value || undefined}
														onValueChange={field.onChange}
														disabled={
															depsLoading ||
															!watchedCorporationId?.trim() ||
															companyChoices.length === 0
														}
													>
														<SelectTrigger
															className="h-10 w-full"
															aria-invalid={!!errors.companyId}
															aria-label={FORM_PLACEHOLDERS.selectCompany}
														>
															<SelectValue
																placeholder={companySelectPlaceholder}
															/>
														</SelectTrigger>
														<SelectContent>
															{!activeCompaniesLoading &&
															watchedCorporationId?.trim() &&
															companyChoices.length === 0 ? (
																<div className="px-2 py-4 text-center text-small text-muted-foreground">
																	{FORM_PLACEHOLDERS.noActiveCompanies}
																</div>
															) : (
																companyChoices.map((c) => (
																	<SelectItem key={c.id} value={c.id}>
																		{c.label}
																	</SelectItem>
																))
															)}
														</SelectContent>
													</Select>
												)}
											/>
											<FieldError>{errors.companyId?.message}</FieldError>
										</Field>
									</>
								)}
							</div>
						</FieldGroup>
					</CollapsibleCard>

					<CollapsibleCard
						title={EDIT_CONTACT_PAGE.cardRoleTeam}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<Field data-invalid={!!errors.contactType}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{EDIT_CONTACT_PAGE.fieldContactType}
									</FieldLabel>
									<Controller
										name="contactType"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value || undefined}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													className="h-10 w-full"
													aria-invalid={!!errors.contactType}
												>
													<SelectValue
														placeholder={FORM_PLACEHOLDERS.selectContactType}
													/>
												</SelectTrigger>
												<SelectContent>
													{CONTACT_TYPE_EDIT_OPTIONS.map((o) => (
														<SelectItem key={o.value} value={o.value}>
															{o.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									<FieldError>{errors.contactType?.message}</FieldError>
								</Field>
								<FormInput
									id="edit-contact-job-role"
									label={EDIT_CONTACT_PAGE.fieldJobRole}
									autoComplete="organization-title"
									placeholder={FORM_PLACEHOLDERS.enterJobRole}
									error={errors.jobRole?.message}
									{...register("jobRole")}
								/>
							</div>
						</FieldGroup>
					</CollapsibleCard>
				</div>

				<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isSaving}
						className="min-w-20"
					>
						{EDIT_CONTACT_PAGE.cancelButton}
					</Button>
					<Button
						type="submit"
						form={formId}
						disabled={depsLoading}
						isLoading={isSaving}
					>
						{EDIT_CONTACT_PAGE.saveButton}
					</Button>
				</div>
			</WhiteBox>
		</form>
	);
}
