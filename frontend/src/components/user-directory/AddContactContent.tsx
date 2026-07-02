import { yupResolver } from "@hookform/resolvers/yup";
import { Info } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
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
	ADD_CONTACT_PAGE,
	buildUserDirectoryListingSearch,
	CONTACT_TYPE_FILTER_OPTIONS,
	FORM_PLACEHOLDERS,
	MORE_FILTERS_TIMEZONE_OPTIONS,
	parseUserDirectoryTabFromSearch,
	ROUTES,
} from "@/const";
import { useUserRoles } from "@/hooks";
import { type AddContactFormSchemaType, addContactFormSchema } from "@/schemas";
import { useKeyContactsStore, useUsersStore } from "@/store";
import type {
	ActiveCompanyListItem,
	CorporationListOption,
	CreateKeyContactPayload,
} from "@/types";

const CONTACT_TYPE_ADD_OPTIONS = CONTACT_TYPE_FILTER_OPTIONS.filter(
	(o) => o.value !== "all",
);

export function AddContactContent() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const formId = "add-contact-form";

	const [corpOptionsLoading, setCorpOptionsLoading] = useState(false);
	const [corporationOptions, setCorporationOptions] = useState<
		CorporationListOption[]
	>([]);
	const [activeCompaniesLoading, setActiveCompaniesLoading] = useState(false);
	const [activeCompanies, setActiveCompanies] = useState<
		ActiveCompanyListItem[]
	>([]);

	const { createKeyContact, isCreateKeyContactSubmitting } =
		useKeyContactsStore();
	const { userProfile, userProfileLoading, fetchUserProfile } = useUsersStore();

	const {
		isSuperAdmin,
		isCorporationAdmin,
		isCompanyAdmin,
		ready: groupsReady,
	} = useUserRoles();
	const isCorporationLocked = isCorporationAdmin || isCompanyAdmin;
	const isCompanyLocked = isCompanyAdmin && !isCorporationAdmin;
	const shouldFetchCorporations = groupsReady && isSuperAdmin;
	const shouldFetchActiveCompanies =
		groupsReady && (isSuperAdmin || isCorporationAdmin);

	const profileCorporationId = userProfile?.corporationId?.trim() ?? "";
	const profileCompanyId = userProfile?.companyId?.trim() ?? "";

	const {
		register,
		control,
		handleSubmit,
		watch,
		setValue,
		clearErrors,
		formState: { errors },
	} = useForm<AddContactFormSchemaType>({
		resolver: yupResolver(
			addContactFormSchema,
		) as Resolver<AddContactFormSchemaType>,
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
			corporationId: "",
			companyId: "",
			contactType: "",
			jobRole: "",
		},
	});

	const watchedCorporationId = watch("corporationId");

	const corporationSelectOptions = useMemo(() => {
		if (isCorporationLocked && profileCorporationId) {
			return [
				{
					id: profileCorporationId,
					legalName: userProfile?.corporation?.trim() || profileCorporationId,
				} as CorporationListOption,
			];
		}
		return corporationOptions;
	}, [
		isCorporationLocked,
		profileCorporationId,
		userProfile?.corporation,
		corporationOptions,
	]);

	const companyChoices = useMemo(() => {
		if (isCompanyLocked && profileCompanyId) {
			return [
				{
					id: profileCompanyId,
					label: userProfile?.companyName?.trim() || profileCompanyId,
				},
			];
		}
		const cid = watchedCorporationId?.trim() || profileCorporationId;
		if (!cid) return [];
		return activeCompanies
			.filter((c) => c.corporationId === cid)
			.map((c) => ({ id: c.id, label: c.legalName }));
	}, [
		isCompanyLocked,
		profileCompanyId,
		userProfile?.companyName,
		activeCompanies,
		watchedCorporationId,
		profileCorporationId,
	]);

	const corporationSelectPlaceholder = useMemo(() => {
		if (isCorporationLocked) {
			return (
				userProfile?.corporation?.trim() || FORM_PLACEHOLDERS.selectCorporation
			);
		}
		return FORM_PLACEHOLDERS.selectCorporation;
	}, [isCorporationLocked, userProfile?.corporation]);

	const companySelectPlaceholder = useMemo(() => {
		if (isCompanyLocked) {
			return (
				userProfile?.companyName?.trim() || FORM_PLACEHOLDERS.selectCompany
			);
		}
		if (
			!(watchedCorporationId?.trim() || profileCorporationId) ||
			activeCompaniesLoading
		) {
			return FORM_PLACEHOLDERS.selectCompany;
		}
		return companyChoices.length === 0
			? FORM_PLACEHOLDERS.noActiveCompanies
			: FORM_PLACEHOLDERS.selectCompany;
	}, [
		isCompanyLocked,
		userProfile?.companyName,
		watchedCorporationId,
		profileCorporationId,
		activeCompaniesLoading,
		companyChoices.length,
	]);

	useEffect(() => {
		if (!groupsReady || !isCorporationLocked) return;
		if (!userProfile && !userProfileLoading) {
			void fetchUserProfile();
		}
		if (!userProfile) return;

		if (profileCorporationId) {
			setValue("corporationId", profileCorporationId, {
				shouldValidate: false,
			});
		}
		if (isCompanyLocked && profileCompanyId) {
			setValue("companyId", profileCompanyId, { shouldValidate: false });
		}
	}, [
		groupsReady,
		isCorporationLocked,
		isCompanyLocked,
		userProfile,
		userProfileLoading,
		profileCorporationId,
		profileCompanyId,
		fetchUserProfile,
		setValue,
	]);

	useEffect(() => {
		if (!shouldFetchCorporations) {
			setCorporationOptions([]);
			setCorpOptionsLoading(false);
			return;
		}

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
	}, [shouldFetchCorporations]);

	useEffect(() => {
		if (!shouldFetchActiveCompanies) {
			setActiveCompanies([]);
			setActiveCompaniesLoading(false);
			return;
		}

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
	}, [shouldFetchActiveCompanies]);

	useEffect(() => {
		if (isCompanyLocked || !watchedCorporationId?.trim()) return;
		setValue("companyId", "", { shouldValidate: false });
		clearErrors("companyId");
	}, [watchedCorporationId, isCompanyLocked, setValue, clearErrors]);

	const handleCancel = useCallback(() => {
		const tab = parseUserDirectoryTabFromSearch(searchParams);
		void navigate({
			pathname: ROUTES.userDirectory.root,
			search: buildUserDirectoryListingSearch(tab),
		});
	}, [navigate, searchParams]);

	const handleFormSubmit = useCallback(
		async (values: AddContactFormSchemaType) => {
			const payload: CreateKeyContactPayload = {
				firstName: values.firstName,
				lastName: values.lastName,
				email: values.email,
				workPhone: values.workPhone,
				contactType: values.contactType,
			};
			if (values.nickname) payload.nickname = values.nickname;
			if (values.cellPhone) payload.cellPhone = values.cellPhone;
			if (values.timezone) payload.timezone = values.timezone;
			const corporationId = (
				values.corporationId?.trim() ||
				(isCorporationLocked ? profileCorporationId : "")
			).trim();
			const companyId = (
				values.companyId?.trim() || (isCompanyLocked ? profileCompanyId : "")
			).trim();
			if (corporationId) payload.corporationId = corporationId;
			if (companyId) payload.companyId = companyId;
			if (values.jobRole) payload.jobRole = values.jobRole;

			const ok = await createKeyContact(payload);
			if (!ok) return;
			const tab = parseUserDirectoryTabFromSearch(searchParams);
			navigate({
				pathname: ROUTES.userDirectory.root,
				search: buildUserDirectoryListingSearch(tab),
			});
		},
		[
			navigate,
			searchParams,
			createKeyContact,
			isCorporationLocked,
			isCompanyLocked,
			profileCorporationId,
			profileCompanyId,
		],
	);

	const orgOptionsLoading = isCorporationLocked
		? userProfileLoading
		: corpOptionsLoading;
	const companyOptionsLoading = isCompanyLocked
		? userProfileLoading
		: activeCompaniesLoading;

	const depsLoading = orgOptionsLoading || companyOptionsLoading;

	return (
		<form
			id={formId}
			onSubmit={handleSubmit(handleFormSubmit)}
			className="mt-6 flex flex-1 flex-col"
		>
			<WhiteBox padding="md" className="mb-6 flex flex-col gap-4 rounded-xl">
				<div
					role="status"
					aria-live="polite"
					className="flex gap-3 rounded-lg bg-info-bg p-4"
				>
					<Info className="mt-0.5 size-4 shrink-0 text-icon-info" aria-hidden />
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<p className="text-small font-semibold text-text-foreground">
							{ADD_CONTACT_PAGE.noteTitle}
						</p>
						<p className="text-small text-text-secondary">
							{ADD_CONTACT_PAGE.noteBody}
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-4">
					<CollapsibleCard
						title={ADD_CONTACT_PAGE.cardBasicInfo}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								<FormInput
									id="add-contact-first-name"
									label={ADD_CONTACT_PAGE.fieldFirstName}
									required
									autoComplete="given-name"
									placeholder={FORM_PLACEHOLDERS.firstNameNico}
									error={errors.firstName?.message}
									{...register("firstName")}
								/>
								<FormInput
									id="add-contact-last-name"
									label={ADD_CONTACT_PAGE.fieldLastName}
									required
									autoComplete="family-name"
									placeholder={FORM_PLACEHOLDERS.lastNameRobin}
									error={errors.lastName?.message}
									{...register("lastName")}
								/>
								<FormInput
									id="add-contact-nickname"
									label={ADD_CONTACT_PAGE.fieldNickname}
									autoComplete="nickname"
									placeholder={FORM_PLACEHOLDERS.nicknameNicbin}
									error={errors.nickname?.message}
									{...register("nickname")}
								/>
								<FormInput
									id="add-contact-email"
									label={ADD_CONTACT_PAGE.fieldEmail}
									required
									type="email"
									autoComplete="email"
									placeholder={FORM_PLACEHOLDERS.emailNicoRobin}
									error={errors.email?.message}
									{...register("email")}
								/>
								<FormInput
									id="add-contact-work-phone"
									label={ADD_CONTACT_PAGE.fieldWorkPhone}
									required
									type="tel"
									autoComplete="tel"
									placeholder={FORM_PLACEHOLDERS.phoneFormatted}
									error={errors.workPhone?.message}
									{...register("workPhone")}
								/>
								<FormInput
									id="add-contact-cell-phone"
									label={ADD_CONTACT_PAGE.fieldCellPhone}
									type="tel"
									autoComplete="tel"
									placeholder={FORM_PLACEHOLDERS.cellPhone}
									error={errors.cellPhone?.message}
									{...register("cellPhone")}
								/>
								<Field data-invalid={!!errors.timezone}>
									<FieldLabel
										htmlFor="add-contact-timezone"
										className="text-small font-medium text-text-foreground"
									>
										{ADD_CONTACT_PAGE.fieldTimezone}
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
													id="add-contact-timezone"
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
						title={ADD_CONTACT_PAGE.cardCorporationCompany}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<Field data-invalid={!!errors.corporationId}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										{ADD_CONTACT_PAGE.fieldCorporation}
									</FieldLabel>
									<Controller
										name="corporationId"
										control={control}
										render={({ field }) => (
											<Select
												value={
													field.value?.trim() ||
													(isCorporationLocked ? profileCorporationId : "") ||
													undefined
												}
												onValueChange={field.onChange}
												disabled={
													isCorporationLocked ||
													orgOptionsLoading ||
													corporationSelectOptions.length === 0
												}
											>
												<SelectTrigger
													className="h-10 w-full"
													aria-invalid={!!errors.corporationId}
												>
													<SelectValue
														placeholder={corporationSelectPlaceholder}
													/>
												</SelectTrigger>
												<SelectContent>
													{corporationSelectOptions.map((c) => (
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
										{ADD_CONTACT_PAGE.fieldCompany}
									</FieldLabel>
									<Controller
										name="companyId"
										control={control}
										render={({ field }) => (
											<Select
												value={
													field.value?.trim() ||
													(isCompanyLocked ? profileCompanyId : "") ||
													undefined
												}
												onValueChange={field.onChange}
												disabled={
													isCompanyLocked ||
													companyOptionsLoading ||
													(!isCompanyLocked &&
														!(
															watchedCorporationId?.trim() ||
															profileCorporationId
														)) ||
													companyChoices.length === 0
												}
											>
												<SelectTrigger
													className="h-10 w-full"
													aria-invalid={!!errors.companyId}
												>
													<SelectValue placeholder={companySelectPlaceholder} />
												</SelectTrigger>
												<SelectContent>
													{!isCompanyLocked &&
													!companyOptionsLoading &&
													(watchedCorporationId?.trim() ||
														profileCorporationId) &&
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
							</div>
						</FieldGroup>
					</CollapsibleCard>

					<CollapsibleCard
						title={ADD_CONTACT_PAGE.cardRoleTeam}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<Field data-invalid={!!errors.contactType}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{ADD_CONTACT_PAGE.fieldContactType}
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
													aria-label={FORM_PLACEHOLDERS.selectContactType}
												>
													<SelectValue
														placeholder={FORM_PLACEHOLDERS.selectContactType}
													/>
												</SelectTrigger>
												<SelectContent>
													{CONTACT_TYPE_ADD_OPTIONS.map((o) => (
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
									id="add-contact-job-role"
									label={ADD_CONTACT_PAGE.fieldJobRole}
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
						onClick={handleCancel}
						className="min-w-20"
					>
						{ADD_CONTACT_PAGE.cancelButton}
					</Button>
					<Button
						type="submit"
						form={formId}
						disabled={depsLoading}
						isLoading={isCreateKeyContactSubmitting}
					>
						{ADD_CONTACT_PAGE.addContactSubmitButton}
					</Button>
				</div>
			</WhiteBox>
		</form>
	);
}
