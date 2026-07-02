import { yupResolver } from "@hookform/resolvers/yup";
import { Lock } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppLoader, SettingsProfileAvatar } from "@/components";
import { FormInput } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	FORM_PLACEHOLDERS,
	MORE_FILTERS_TIMEZONE_OPTIONS,
	SETTINGS_PAGE_CONTENT,
} from "@/const";
import { useIsEndUser, useIsSuperAdmin } from "@/hooks";
import {
	type SettingsProfileFormSchemaType,
	settingsProfileFormSchema,
} from "@/schemas";
import { useUsersStore } from "@/store";
import type {
	PatchMyProfilePayload,
	SettingsProfileOverviewFormProps,
	SettingsProfileOverviewTabProps,
	UserProfile,
} from "@/types";

const C = SETTINGS_PAGE_CONTENT;
const P = FORM_PLACEHOLDERS;

const lockedFieldRightElement = (
	<span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
		<Lock className="size-4" aria-hidden />
	</span>
);

function buildFormValues(profile: UserProfile): SettingsProfileFormSchemaType {
	return {
		nickname: profile.nickname?.trim() ?? "",
		workPhone: profile.workPhone?.trim() ?? "",
		cellPhone: profile.cellPhone?.trim() ?? "",
		timezone: profile.timezone?.trim() ?? "",
	};
}

function buildPatchPayload(
	values: SettingsProfileFormSchemaType,
	profile: UserProfile,
): PatchMyProfilePayload {
	const payload: PatchMyProfilePayload = {};
	const nickname = values.nickname.trim();
	const workPhone = values.workPhone.trim();
	const cellPhone = values.cellPhone?.trim() ?? "";

	if (nickname !== (profile.nickname?.trim() ?? "")) {
		payload.nickname = nickname;
	}
	if (workPhone !== (profile.workPhone?.trim() ?? "")) {
		payload.workPhone = workPhone;
	}
	if (cellPhone !== (profile.cellPhone?.trim() ?? "")) {
		payload.cellPhone = cellPhone;
	}
	const timezone = values.timezone.trim();
	const storedTimezone = profile.timezone?.trim() ?? "";
	if (timezone !== storedTimezone) {
		payload.timezone = timezone;
	}
	return payload;
}

function SettingsProfileOverviewForm({
	profile,
	showCorporationCompanySection,
}: SettingsProfileOverviewFormProps) {
	const {
		updateMyProfile,
		uploadMyAvatar,
		removeMyAvatar,
		isMyProfileSaving,
		isMyAvatarUploading,
		isMyAvatarRemoving,
	} = useUsersStore();

	const { isSuperAdmin, ready: rolesReady } = useIsSuperAdmin();
	const managedByOrgTooltip =
		rolesReady && !isSuperAdmin ? C.managedByOrganizationTooltip : undefined;

	const profileFormValues = useMemo(
		(): SettingsProfileFormSchemaType => buildFormValues(profile),
		[
			profile.cognitoSub,
			profile.nickname,
			profile.workPhone,
			profile.cellPhone,
			profile.timezone,
		],
	);

	const {
		register,
		control,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
	} = useForm<SettingsProfileFormSchemaType>({
		resolver: yupResolver(
			settingsProfileFormSchema,
		) as Resolver<SettingsProfileFormSchemaType>,
		mode: "onTouched",
		reValidateMode: "onChange",
		values: profileFormValues,
		defaultValues: profileFormValues,
	});

	const handleCancel = useCallback(() => {
		reset(buildFormValues(profile));
	}, [profile, reset]);

	const handleAvatarUpload = useCallback(
		async (file: File) => {
			await uploadMyAvatar(file);
		},
		[uploadMyAvatar],
	);

	const handleAvatarRemove = useCallback(async () => {
		await removeMyAvatar();
	}, [removeMyAvatar]);

	const handleSave = handleSubmit(async (values) => {
		const payload = buildPatchPayload(values, profile);
		await updateMyProfile(payload);
	});

	return (
		<form
			id="settings-profile-form"
			onSubmit={handleSave}
			className="w-full pb-6"
		>
			<div className="rounded-xl border border-border bg-background">
				<div className="flex flex-col flex-wrap items-start gap-6 p-6 lg:flex-row">
					<SettingsProfileAvatar
						avatarUrl={profile.avatar}
						firstName={profile.firstName}
						lastName={profile.lastName}
						isUploading={isMyAvatarUploading}
						isRemoving={isMyAvatarRemoving}
						onUpload={handleAvatarUpload}
						onRemove={handleAvatarRemove}
						onValidationError={(message) => toast.error(message)}
					/>

					<div className="flex min-w-0 flex-1 flex-col gap-4">
						<div className="w-full rounded-xl border border-border bg-background">
							<div className="flex h-14 items-center border-b border-border px-4">
								<p className="text-base font-medium text-text-secondary">
									{C.cardPersonalDetails}
								</p>
							</div>
							<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
								<FormInput
									id="settings-first-name"
									label={C.fieldFirstName}
									tooltip={managedByOrgTooltip}
									readOnly
									disabled
									value={profile.firstName}
									className="bg-card text-muted-foreground"
									rightElement={lockedFieldRightElement}
									aria-readonly
								/>
								<FormInput
									id="settings-last-name"
									label={C.fieldLastName}
									tooltip={managedByOrgTooltip}
									readOnly
									disabled
									value={profile.lastName}
									className="bg-card text-muted-foreground"
									rightElement={lockedFieldRightElement}
									aria-readonly
								/>
								<FormInput
									id="settings-nickname"
									label={C.fieldNickname}
									autoComplete="nickname"
									placeholder={P.nicknameNicbin}
									error={errors.nickname?.message}
									{...register("nickname")}
								/>
								<FormInput
									id="settings-email"
									label={C.fieldEmail}
									tooltip={managedByOrgTooltip}
									readOnly
									disabled
									value={profile.email ?? ""}
									className="bg-card text-muted-foreground"
									rightElement={lockedFieldRightElement}
									aria-readonly
								/>
								<FormInput
									id="settings-work-phone"
									label={C.fieldWorkPhone}
									required
									type="tel"
									autoComplete="tel"
									placeholder={P.phoneFormatted}
									error={errors.workPhone?.message}
									{...register("workPhone")}
								/>
								<FormInput
									id="settings-cell-phone"
									label={C.fieldCellPhone}
									type="tel"
									autoComplete="tel"
									placeholder={P.cellPhone}
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
													id="settings-timezone"
													className="h-10 w-full"
													aria-invalid={!!errors.timezone}
												>
													<SelectValue placeholder={P.selectTimeZone} />
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
						</div>

						{showCorporationCompanySection ? (
							<div className="w-full rounded-xl border border-border bg-background">
								<div className="flex h-14 items-center border-b border-border px-4">
									<p className="text-base font-medium text-text-secondary">
										{C.cardCorporationCompany}
									</p>
								</div>
								<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
									<FormInput
										id="settings-corporation"
										label={C.fieldAssignedCorporation}
										tooltip={C.managedByOrganizationTooltip}
										readOnly
										disabled
										value={profile.corporation ?? ""}
										className="bg-card text-muted-foreground"
										rightElement={lockedFieldRightElement}
										aria-readonly
									/>
									<FormInput
										id="settings-company"
										label={C.fieldAssignedCompany}
										tooltip={C.managedByOrganizationTooltip}
										readOnly
										disabled
										value={profile.companyName ?? ""}
										className="bg-card text-muted-foreground"
										rightElement={lockedFieldRightElement}
										aria-readonly
									/>
									<FormInput
										id="settings-role-name"
										label={C.fieldRoleName}
										tooltip={C.managedByOrganizationTooltip}
										readOnly
										disabled
										value={profile.roleName?.trim() || C.roleNameNotAvailable}
										className="bg-card text-muted-foreground"
										rightElement={lockedFieldRightElement}
										aria-readonly
									/>
								</div>
							</div>
						) : null}
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-5">
					<Button
						type="button"
						variant="outline"
						disabled={isMyProfileSaving || !isDirty}
						onClick={handleCancel}
					>
						{C.cancelButton}
					</Button>
					<Button
						type="submit"
						disabled={isMyProfileSaving || !isDirty}
						aria-label={C.saveButton}
					>
						{isMyProfileSaving ? C.savingButton : C.saveButton}
					</Button>
				</div>
			</div>
		</form>
	);
}

export function SettingsProfileOverviewTab({
	profileLoading,
	profileError,
	onRetryLoad,
}: SettingsProfileOverviewTabProps) {
	const profile = useUsersStore((s) => s.userProfile);
	const { isEndUser, ready: groupsReady } = useIsEndUser();

	const showCorporationCompanySection = groupsReady && isEndUser;

	if (profileLoading && !profile) {
		return <AppLoader className="min-h-80" />;
	}

	if (profileError || !profile) {
		return (
			<div className="flex min-h-40 flex-col items-start gap-3">
				<p className="text-sm text-destructive">
					{profileError ?? C.loadError}
				</p>
				<Button type="button" variant="outline" onClick={onRetryLoad}>
					{C.retryButton}
				</Button>
			</div>
		);
	}

	return (
		<SettingsProfileOverviewForm
			key={profile.cognitoSub}
			profile={profile}
			showCorporationCompanySection={showCorporationCompanySection}
		/>
	);
}
