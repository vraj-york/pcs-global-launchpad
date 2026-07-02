import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useMemo } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
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
	EDIT_USER_PAGE,
	EDIT_USER_STATUS_OPTIONS,
	FORM_PLACEHOLDERS,
	INVITE_EXCLUDED_CATEGORY_NAME_SET,
	INVITE_USER_TYPE,
	MORE_FILTERS_TIMEZONE_OPTIONS,
	VIEW_USER_DETAILS_PAGE as V,
} from "@/const";
import { type EditUserFormSchemaType, editUserFormSchema } from "@/schemas";
import type {
	EditUserDetailsContentProps,
	PatchUserPayload,
	UserDetails,
} from "@/types";
import { formatCode } from "@/utils";

function normalizePatchStatus(status: string): string {
	const s = status.trim().toLowerCase();
	const map: Record<string, string> = {
		active: "Active",
		blocked: "Blocked",
		pending: "Pending",
		expired: "Expired",
	};
	return (
		map[s] ??
		`${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()}`
	);
}

/** Form initial category/role from GET /users/:id (`categoryId`, `roleId` only). */
function resolveCategoryRoleIds(user: UserDetails): {
	categoryId: string;
	roleId: string;
} {
	const categoryId = String(user.categoryId ?? "").trim();
	const roleId = String(user.roleId ?? "").trim();
	return { categoryId, roleId };
}

function corporationDisplay(u: UserDetails): string {
	if (!u.corporation) return "";
	const code = formatCode(u.corporation.corporationCode, "CORP");
	return `${u.corporation.legalName} (${code})`;
}

export function EditUserDetailsContent({
	user,
	categoriesWithRoles,
	rolesTreeLoading,
	rolesTreeError,
	onCancel,
	onSave,
	isSaving,
	formId = "edit-user-form",
}: EditUserDetailsContentProps) {
	const corpLine = corporationDisplay(user);
	const companyLine = user.company?.legalName?.trim() ?? "";
	const showOrgRoleSections =
		user.inviteType !== INVITE_USER_TYPE.assessmentOnly;

	const userFormValues = useMemo(() => {
		const { categoryId, roleId } = resolveCategoryRoleIds(user);
		return {
			status: normalizePatchStatus(user.status),
			firstName: user.firstName ?? "",
			lastName: user.lastName ?? "",
			nickname: user.nickname ?? "",
			workPhone: user.workPhone ?? "",
			cellPhone: user.cellPhone ?? "",
			timezone: user.timezone?.trim() ?? "",
			inviteType: user.inviteType?.trim() ?? "",
			categoryId,
			roleId,
		};
	}, [user]);

	const {
		register,
		control,
		handleSubmit,
		watch,
		setValue,
		getValues,
		clearErrors,
		formState: { errors },
	} = useForm<EditUserFormSchemaType>({
		resolver: yupResolver(
			editUserFormSchema,
		) as Resolver<EditUserFormSchemaType>,
		mode: "onTouched",
		reValidateMode: "onChange",
		values: userFormValues,
		defaultValues: userFormValues,
	});

	const watchedCategoryId = watch("categoryId");

	const categoriesForRoleSelect = useMemo(
		() =>
			categoriesWithRoles.filter(
				(c) =>
					!INVITE_EXCLUDED_CATEGORY_NAME_SET.has(c.name) &&
					(c.roles?.length ?? 0) > 0,
			),
		[categoriesWithRoles],
	);

	const userCategoryFromTree = useMemo(() => {
		const id = String(user.categoryId ?? "").trim();
		if (!id) return undefined;
		return categoriesWithRoles.find((c) => c.id === id);
	}, [categoriesWithRoles, user.categoryId]);

	const isLockedOrgAdminRole = useMemo(() => {
		if (!showOrgRoleSections) return false;
		if (userCategoryFromTree)
			return INVITE_EXCLUDED_CATEGORY_NAME_SET.has(userCategoryFromTree.name);
		const name = user.category?.trim() ?? "";
		return INVITE_EXCLUDED_CATEGORY_NAME_SET.has(name);
	}, [showOrgRoleSections, userCategoryFromTree, user.category]);

	const lockedCategoryDisplay = useMemo(
		() => user.category?.trim() ?? userCategoryFromTree?.name ?? "",
		[user.category, userCategoryFromTree?.name],
	);

	const lockedRoleDisplay = useMemo(() => {
		const rid = String(user.roleId ?? "").trim();
		const fromTree =
			rid && userCategoryFromTree?.roles
				? userCategoryFromTree.roles.find((r) => r.id === rid)?.name
				: undefined;
		return user.roleName?.trim() ?? fromTree ?? "";
	}, [user.roleName, user.roleId, userCategoryFromTree]);

	const selectedCategory = useMemo(
		() => categoriesForRoleSelect.find((c) => c.id === watchedCategoryId),
		[categoriesForRoleSelect, watchedCategoryId],
	);
	const roleOptions = selectedCategory?.roles ?? [];

	useEffect(() => {
		if (!showOrgRoleSections) return;
		if (rolesTreeLoading) return;
		if (rolesTreeError) return;
		if (categoriesWithRoles.length === 0) return;

		const { categoryId, roleId } = resolveCategoryRoleIds(user);
		const cat = categoriesWithRoles.find(
			(c) => c.id === categoryId && (c.roles?.length ?? 0) > 0,
		);
		if (!categoryId || !cat) return;

		setValue("categoryId", categoryId, {
			shouldDirty: false,
			shouldValidate: false,
		});
		if (roleId && cat.roles.some((r) => r.id === roleId)) {
			setValue("roleId", roleId, {
				shouldDirty: false,
				shouldValidate: false,
			});
		}
		clearErrors("categoryId");
		clearErrors("roleId");
	}, [
		showOrgRoleSections,
		rolesTreeLoading,
		rolesTreeError,
		categoriesWithRoles,
		user,
		setValue,
		clearErrors,
	]);

	useEffect(() => {
		if (!showOrgRoleSections) return;
		if (!selectedCategory) return;
		const roles = selectedCategory.roles;
		const currentRoleId = getValues("roleId");
		const ok = roles.some((r) => r.id === currentRoleId);
		if (!ok) {
			setValue("roleId", roles[0]?.id ?? "", { shouldValidate: false });
			clearErrors("roleId");
		}
	}, [
		showOrgRoleSections,
		watchedCategoryId,
		selectedCategory,
		setValue,
		getValues,
		clearErrors,
	]);

	const handleFormSubmit = useCallback(
		async (values: EditUserFormSchemaType) => {
			const base: PatchUserPayload = {
				status: values.status,
				firstName: values.firstName.trim(),
				lastName: values.lastName.trim(),
				nickname: values.nickname.trim(),
				workPhone: values.workPhone.trim(),
				cellPhone: values.cellPhone?.trim() ?? "",
				timezone: values.timezone,
			};
			const payload: PatchUserPayload = showOrgRoleSections
				? { ...base, roleId: values.roleId ?? "" }
				: base;
			await onSave(payload);
		},
		[onSave, showOrgRoleSections],
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
						{EDIT_USER_PAGE.formTitle}
					</h2>
					<p className="text-small text-muted-foreground">
						{EDIT_USER_PAGE.subtitle}
					</p>
				</div>

				<div className="flex flex-col gap-4">
					{showOrgRoleSections && (
						<CollapsibleCard
							title={EDIT_USER_PAGE.cardRoleTeam}
							className="w-full min-w-0"
						>
							{rolesTreeError && !isLockedOrgAdminRole && (
								<p className="mb-4 text-small text-destructive">
									{rolesTreeError}
								</p>
							)}
							<FieldGroup className="gap-4">
								<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
									{isLockedOrgAdminRole ? (
										<>
											<FormInput
												id="edit-user-category-readonly"
												label={EDIT_USER_PAGE.fieldCategory}
												readOnly
												disabled
												value={lockedCategoryDisplay}
												className="h-10 bg-card text-muted-foreground"
											/>
											<FormInput
												id="edit-user-role-readonly"
												label={EDIT_USER_PAGE.fieldRoleName}
												readOnly
												disabled
												value={lockedRoleDisplay}
												className="h-10 bg-card text-muted-foreground"
											/>
										</>
									) : (
										<>
											<Field data-invalid={!!errors.categoryId}>
												<FieldLabel className="text-small font-medium text-text-foreground">
													<span className="text-destructive">*</span>
													{EDIT_USER_PAGE.fieldCategory}
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
																{categoriesForRoleSelect.map((c) => (
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
													{EDIT_USER_PAGE.fieldRoleName}
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
										</>
									)}
								</div>
							</FieldGroup>
						</CollapsibleCard>
					)}

					<CollapsibleCard
						title={EDIT_USER_PAGE.cardBasicInfo}
						className="w-full min-w-0"
					>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								<Field data-invalid={!!errors.status}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{EDIT_USER_PAGE.fieldStatus}
									</FieldLabel>
									<Controller
										name="status"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value || undefined}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													className="h-10 w-full"
													aria-invalid={!!errors.status}
												>
													<SelectValue
														placeholder={FORM_PLACEHOLDERS.selectStatus}
													/>
												</SelectTrigger>
												<SelectContent>
													{EDIT_USER_STATUS_OPTIONS.map((o) => (
														<SelectItem key={o.value} value={o.value}>
															{o.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
									<FieldError>{errors.status?.message}</FieldError>
								</Field>
								<FormInput
									id="edit-user-first-name"
									label={EDIT_USER_PAGE.fieldFirstName}
									required
									autoComplete="given-name"
									error={errors.firstName?.message}
									{...register("firstName")}
								/>
								<FormInput
									id="edit-user-last-name"
									label={EDIT_USER_PAGE.fieldLastName}
									required
									autoComplete="family-name"
									error={errors.lastName?.message}
									{...register("lastName")}
								/>
								<FormInput
									id="edit-user-nickname"
									label={V.fieldNickname}
									autoComplete="nickname"
									placeholder={FORM_PLACEHOLDERS.nicknameNicbin}
									error={errors.nickname?.message}
									{...register("nickname")}
								/>
								<FormInput
									id="edit-user-email"
									label={V.fieldEmail}
									readOnly
									disabled
									value={user.email}
									className="h-10 bg-card text-muted-foreground"
								/>
								<FormInput
									id="edit-user-work-phone"
									label={V.fieldWorkPhone}
									required
									type="tel"
									autoComplete="tel"
									error={errors.workPhone?.message}
									{...register("workPhone")}
								/>
								<FormInput
									id="edit-user-cell-phone"
									label={V.fieldCellPhone}
									type="tel"
									autoComplete="tel"
									placeholder={FORM_PLACEHOLDERS.cellPhone}
									error={errors.cellPhone?.message}
									{...register("cellPhone")}
								/>
								<Field data-invalid={!!errors.timezone}>
									<FieldLabel className="text-small font-medium text-text-foreground">
										<span className="text-destructive">*</span>
										{V.fieldTimezone}
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

					{showOrgRoleSections && (
						<CollapsibleCard
							title={EDIT_USER_PAGE.cardCorporationCompany}
							className="w-full min-w-0"
						>
							<FieldGroup className="gap-4">
								<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
									<FormInput
										id="edit-user-corporation"
										label={V.fieldCorporation}
										readOnly
										disabled
										value={corpLine}
										className="h-10 bg-card text-muted-foreground"
									/>
									<FormInput
										id="edit-user-company"
										label={V.fieldCompany}
										readOnly
										disabled
										value={companyLine}
										className="h-10 bg-card text-muted-foreground"
									/>
								</div>
							</FieldGroup>
						</CollapsibleCard>
					)}
				</div>

				<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isSaving}
						className="min-w-20"
					>
						{EDIT_USER_PAGE.cancelButton}
					</Button>
					<Button
						type="submit"
						form={formId}
						disabled={
							showOrgRoleSections &&
							!isLockedOrgAdminRole &&
							(rolesTreeLoading || !!rolesTreeError)
						}
						isLoading={isSaving}
					>
						{EDIT_USER_PAGE.saveButton}
					</Button>
				</div>
			</WhiteBox>
		</form>
	);
}
