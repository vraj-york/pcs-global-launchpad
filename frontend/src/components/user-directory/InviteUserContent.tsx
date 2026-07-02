import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
	getActiveCompanies,
	getCorporationsList,
	getRoleCategoriesWithRoles,
} from "@/api";
import { CollapsibleCard, FormInput, WhiteBox } from "@/components";
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
	FORM_PLACEHOLDERS,
	INVITE_USER_PAGE,
	INVITE_USER_TYPE,
	MORE_FILTERS_TIMEZONE_OPTIONS,
	ROUTES,
	SEND_INVITE_CONTACT_EXCLUDED_ROLE_CATEGORY_NAMES,
} from "@/const";
import { useUserRoles } from "@/hooks";
import { type InviteUserFormSchemaType, inviteUserFormSchema } from "@/schemas";
import { useUsersStore } from "@/store";
import type {
	ActiveCompanyListItem,
	CorporationListOption,
	InviteUserPayload,
	RoleCategoryWithRoles,
} from "@/types";

export function InviteUserContent() {
	const navigate = useNavigate();
	const formId = "invite-user-form";

	const [corpOptionsLoading, setCorpOptionsLoading] = useState(false);
	const [corporationOptions, setCorporationOptions] = useState<
		CorporationListOption[]
	>([]);
	const [activeCompaniesLoading, setActiveCompaniesLoading] = useState(false);
	const [activeCompanies, setActiveCompanies] = useState<
		ActiveCompanyListItem[]
	>([]);
	const [rolesTreeLoading, setRolesTreeLoading] = useState(false);
	const [rolesTreeError, setRolesTreeError] = useState<string | null>(null);
	const [categoriesWithRoles, setCategoriesWithRoles] = useState<
		RoleCategoryWithRoles[]
	>([]);

	const {
		isInviteUserSubmitting,
		inviteUser,
		userProfile,
		userProfileLoading,
		fetchUserProfile,
	} = useUsersStore();

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

	const {
		register,
		control,
		handleSubmit,
		watch,
		setValue,
		getValues,
		clearErrors,
		formState: { errors },
	} = useForm<InviteUserFormSchemaType>({
		resolver: yupResolver(
			inviteUserFormSchema,
		) as Resolver<InviteUserFormSchemaType>,
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
			categoryId: "",
			roleId: "",
			teamId: "",
		},
	});

	const watchedCorporationId = watch("corporationId");
	const watchedCategoryId = watch("categoryId");

	const profileCorporationId = userProfile?.corporationId?.trim() ?? "";
	const profileCompanyId = userProfile?.companyId?.trim() ?? "";

	const selectedCategory = useMemo(
		() => categoriesWithRoles.find((c) => c.id === watchedCategoryId),
		[categoriesWithRoles, watchedCategoryId],
	);
	const roleOptions = selectedCategory?.roles ?? [];

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
		let cancelled = false;
		setRolesTreeLoading(true);
		setRolesTreeError(null);
		void getRoleCategoriesWithRoles().then((result) => {
			if (cancelled) return;
			setRolesTreeLoading(false);
			if (!result.ok) {
				setRolesTreeError(INVITE_USER_PAGE.rolesLoadError);
				toast.error(result.message);
				return;
			}
			const excluded = new Set<string>(
				SEND_INVITE_CONTACT_EXCLUDED_ROLE_CATEGORY_NAMES,
			);
			setCategoriesWithRoles(
				result.data.filter(
					(c) => !excluded.has(c.name) && (c.roles?.length ?? 0) > 0,
				),
			);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!selectedCategory) return;
		const roles = selectedCategory.roles;
		const currentRoleId = getValues("roleId");
		const ok = roles.some((r) => r.id === currentRoleId);
		if (!ok) {
			setValue("roleId", roles[0]?.id ?? "", { shouldValidate: false });
			clearErrors("roleId");
		}
	}, [watchedCategoryId, selectedCategory, setValue, getValues, clearErrors]);

	useEffect(() => {
		if (isCompanyLocked || !watchedCorporationId?.trim()) return;
		setValue("companyId", "", { shouldValidate: false });
		clearErrors("companyId");
	}, [watchedCorporationId, isCompanyLocked, setValue, clearErrors]);

	const handleCancel = useCallback(() => {
		void navigate(ROUTES.userDirectory.root);
	}, [navigate]);

	const handleFormSubmit = useCallback(
		async (values: InviteUserFormSchemaType) => {
			const payload: InviteUserPayload = {
				firstName: values.firstName.trim(),
				lastName: values.lastName.trim(),
				email: values.email.trim(),
				workPhone: values.workPhone.trim(),
				timezone: values.timezone,
				inviteType: INVITE_USER_TYPE.bspBlueprint,
				corporationId: (
					values.corporationId?.trim() ||
					(isCorporationLocked ? profileCorporationId : "")
				).trim(),
				companyId: (
					values.companyId?.trim() || (isCompanyLocked ? profileCompanyId : "")
				).trim(),
				roleId: (values.roleId ?? "").trim(),
			};
			const nick = values.nickname.trim();
			if (nick) payload.nickname = nick;
			const cell = values.cellPhone?.trim() ?? "";
			if (cell) payload.cellPhone = cell;

			const ok = await inviteUser(payload);
			if (!ok) return;
			void navigate(ROUTES.userDirectory.root);
		},
		[
			navigate,
			inviteUser,
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

	const depsLoading =
		orgOptionsLoading ||
		companyOptionsLoading ||
		rolesTreeLoading ||
		!!rolesTreeError;

	return (
		<form
			id={formId}
			onSubmit={handleSubmit(handleFormSubmit)}
			className="mt-6 flex flex-1 flex-col"
		>
			<WhiteBox padding="md" className="mb-6 flex flex-col gap-6">
				<div className="flex flex-col gap-4">
					<CollapsibleCard
						title={INVITE_USER_PAGE.cardRoleTeam}
						className="w-full min-w-0"
					>
						{rolesTreeError && (
							<p className="mb-4 text-small text-destructive">
								{rolesTreeError}
							</p>
						)}
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<Field data-invalid={!!errors.categoryId}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{INVITE_USER_PAGE.fieldCategory}
									</FieldLabel>
									<Controller
										name="categoryId"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value || undefined}
												onValueChange={field.onChange}
												disabled={rolesTreeLoading}
											>
												<SelectTrigger
													className="h-10 w-full"
													aria-invalid={!!errors.categoryId}
												>
													<SelectValue
														placeholder={FORM_PLACEHOLDERS.selectCategory}
													/>
												</SelectTrigger>
												<SelectContent>
													{categoriesWithRoles.map((c) => (
														<SelectItem key={c.id} value={c.id}>
															{c.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									<FieldError>{errors.categoryId?.message}</FieldError>
								</Field>
								<Field data-invalid={!!errors.roleId}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{INVITE_USER_PAGE.fieldRoleName}
									</FieldLabel>
									<Controller
										name="roleId"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value || undefined}
												onValueChange={field.onChange}
												disabled={
													rolesTreeLoading ||
													!!rolesTreeError ||
													!selectedCategory
												}
											>
												<SelectTrigger
													className="h-10 w-full"
													aria-invalid={!!errors.roleId}
												>
													<SelectValue
														placeholder={FORM_PLACEHOLDERS.selectRoleName}
													/>
												</SelectTrigger>
												<SelectContent>
													{roleOptions.map((r) => (
														<SelectItem key={r.id} value={r.id}>
															{r.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									<FieldError>{errors.roleId?.message}</FieldError>
								</Field>
							</div>
						</FieldGroup>
					</CollapsibleCard>

					<CollapsibleCard
						title={INVITE_USER_PAGE.cardBasicInfo}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								<FormInput
									id="invite-first-name"
									label={INVITE_USER_PAGE.fieldFirstName}
									required
									autoComplete="given-name"
									placeholder={FORM_PLACEHOLDERS.firstNameNico}
									error={errors.firstName?.message}
									{...register("firstName")}
								/>
								<FormInput
									id="invite-last-name"
									label={INVITE_USER_PAGE.fieldLastName}
									required
									autoComplete="family-name"
									placeholder={FORM_PLACEHOLDERS.lastNameRobin}
									error={errors.lastName?.message}
									{...register("lastName")}
								/>
								<FormInput
									id="invite-nickname"
									label={INVITE_USER_PAGE.fieldNickname}
									autoComplete="nickname"
									placeholder={FORM_PLACEHOLDERS.nicknameNicbin}
									error={errors.nickname?.message}
									{...register("nickname")}
								/>
								<FormInput
									id="invite-email"
									label={INVITE_USER_PAGE.fieldEmail}
									required
									type="email"
									autoComplete="email"
									placeholder={FORM_PLACEHOLDERS.emailNicoRobin}
									error={errors.email?.message}
									{...register("email")}
								/>
								<FormInput
									id="invite-work-phone"
									label={INVITE_USER_PAGE.fieldWorkPhone}
									required
									type="tel"
									autoComplete="tel"
									placeholder={FORM_PLACEHOLDERS.phoneFormatted}
									error={errors.workPhone?.message}
									{...register("workPhone")}
								/>
								<FormInput
									id="invite-cell-phone"
									label={INVITE_USER_PAGE.fieldCellPhone}
									type="tel"
									autoComplete="tel"
									placeholder={FORM_PLACEHOLDERS.cellPhone}
									error={errors.cellPhone?.message}
									{...register("cellPhone")}
								/>
								<Field data-invalid={!!errors.timezone}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{INVITE_USER_PAGE.fieldTimezone}
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
							</div>
						</FieldGroup>
					</CollapsibleCard>

					<CollapsibleCard
						title={INVITE_USER_PAGE.cardCorporationCompany}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
								<Field data-invalid={!!errors.corporationId}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{INVITE_USER_PAGE.fieldCorporation}
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
										<span className="text-destructive">*</span>
										{INVITE_USER_PAGE.fieldCompany}
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
				</div>

				<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						className="min-w-20"
					>
						{INVITE_USER_PAGE.cancelButton}
					</Button>
					<Button
						type="submit"
						form={formId}
						disabled={depsLoading}
						isLoading={isInviteUserSubmitting}
					>
						{INVITE_USER_PAGE.sendInviteButton}
					</Button>
				</div>
			</WhiteBox>
		</form>
	);
}
