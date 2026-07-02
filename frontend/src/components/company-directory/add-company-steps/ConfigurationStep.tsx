import { yupResolver } from "@hookform/resolvers/yup";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { deleteCompanyBrandLogo } from "@/api";
import {
	CollapsibleCard,
	FileUploadArea,
	FormStepSkeleton,
} from "@/components/common";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ADD_NEW_COMPANY_CONFIGURATION_OPTIONS,
	ADD_NEW_COMPANY_CONTENT,
	BRAND_LOGO_ALLOWED_TYPES,
	BRAND_LOGO_MAX_SIZE_BYTES,
	FORM_PLACEHOLDERS,
} from "@/const";
import {
	type AddCompanyConfigurationSchemaType,
	addCompanyConfigurationSchema,
	getAddCompanyConfigurationDefaultValues,
	getAddCompanyConfigurationValuesFromCompanyDetail,
} from "@/schemas";
import { useCompanyDirectoryStore } from "@/store";
import type { AddCompanyConfigurationStepProps } from "@/types";
import { getBrandLogoDisplayUrl } from "@/utils";

const content = ADD_NEW_COMPANY_CONTENT.configuration;
const gs = content.generalSettings;
const b = content.branding;
const options = ADD_NEW_COMPANY_CONFIGURATION_OPTIONS;

const brandLogoValidationOptions = {
	maxSizeBytes: BRAND_LOGO_MAX_SIZE_BYTES,
	allowedMimeTypes: BRAND_LOGO_ALLOWED_TYPES,
	messageUnsupportedFormat: b.errors.unsupportedFormat,
	messageFileTooLarge: b.errors.fileTooLarge,
};

export function ConfigurationStep({
	companyId,
	onSuccess,
	section = "all",
}: AddCompanyConfigurationStepProps) {
	const submitCompanyConfiguration = useCompanyDirectoryStore(
		(s) => s.submitCompanyConfiguration,
	);
	const { fetchCompanyById, companyDetail, companyDetailLoading } =
		useCompanyDirectoryStore();

	const [removingLogo, setRemovingLogo] = useState(false);

	const formDefaults = useMemo(
		() => getAddCompanyConfigurationValuesFromCompanyDetail(companyDetail),
		[companyDetail],
	);

	const {
		control,
		handleSubmit,
		reset,
		setValue,
		setError,
		clearErrors,
		watch,
		formState: { errors },
	} = useForm<AddCompanyConfigurationSchemaType>({
		resolver: yupResolver(
			addCompanyConfigurationSchema,
		) as Resolver<AddCompanyConfigurationSchemaType>,
		mode: "onChange",
		defaultValues: getAddCompanyConfigurationDefaultValues(),
	});

	useEffect(() => {
		reset(formDefaults);
	}, [formDefaults, reset]);

	const logoFile = watch("logo");

	const existingLogoDisplayUrl = useMemo(
		() => getBrandLogoDisplayUrl(companyDetail?.brandLogo),
		[companyDetail?.brandLogo],
	);

	const previewUrl = useMemo(() => {
		if (!logoFile || !(logoFile instanceof File)) return null;
		return URL.createObjectURL(logoFile);
	}, [logoFile]);

	const displayLogoSrc = useMemo(() => {
		if (logoFile instanceof File) return previewUrl;
		return existingLogoDisplayUrl;
	}, [logoFile, previewUrl, existingLogoDisplayUrl]);

	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	const handleLogoUpload = useCallback(
		async (file: File) => {
			clearErrors("logo");
			setValue("logo", file, {
				shouldValidate: true,
				shouldDirty: true,
			});
		},
		[clearErrors, setValue],
	);

	const handleRemoveLogo = useCallback(async () => {
		if (logoFile instanceof File) {
			setValue("logo", null, { shouldValidate: true, shouldDirty: true });
			clearErrors("logo");
			return;
		}
		if (!companyId || !companyDetail?.brandLogo) return;

		setRemovingLogo(true);
		try {
			const result = await deleteCompanyBrandLogo(companyId);

			if (result.ok) {
				const body = result.data as { message?: string } | undefined;
				toast.success(
					typeof body?.message === "string"
						? body.message
						: b.logoRemovedSuccess,
				);
				await fetchCompanyById(companyId);
				clearErrors("logo");
				return;
			}

			const message =
				!result.ok && "message" in result
					? result.message
					: b.errors.removeFailed;
			toast.error(message);
		} finally {
			setRemovingLogo(false);
		}
	}, [
		logoFile,
		companyId,
		companyDetail?.brandLogo,
		setValue,
		clearErrors,
		fetchCompanyById,
	]);

	const handleValidationError = useCallback(
		(err: string | null) => {
			if (err) {
				setError("logo", { type: "manual", message: err });
				toast.error(err);
			} else {
				clearErrors("logo");
			}
		},
		[clearErrors, setError],
	);

	const onSubmit = async (data: AddCompanyConfigurationSchemaType) => {
		if (!companyId) {
			toast.error(content.errors.missingCompanyId);
			return;
		}
		const result = await submitCompanyConfiguration(companyId, data);
		if (result.ok) onSuccess?.();
	};

	const isEditLoading = Boolean(companyId && companyDetailLoading);
	if (isEditLoading) {
		return <FormStepSkeleton fieldCount={8} />;
	}

	return (
		<form
			id="add-company-configuration-form"
			key={`configuration-${companyId ?? "new"}-${companyDetail?.id ?? ""}-${companyDetail?.configuration?.id ?? "none"}`}
			className="space-y-4"
			onSubmit={handleSubmit(onSubmit)}
			noValidate
		>
			{(section === "all" || section === "general") && (
				<CollapsibleCard title={gs.title}>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label
								htmlFor="authMethod"
								className="text-small font-medium text-text-foreground"
							>
								{gs.authenticationMethod}
							</Label>
							<Controller
								name="authMethod"
								control={control}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled
									>
										<SelectTrigger
											id="authMethod"
											className={`h-10 w-full disabled:opacity-100 ${errors.authMethod ? "border-destructive" : ""}`}
											aria-label={gs.authenticationMethod}
										>
											<SelectValue
												placeholder={
													FORM_PLACEHOLDERS.selectAuthenticationMethod
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.authenticationMethods.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.authMethod?.message && (
								<p className="text-mini text-destructive" role="alert">
									{errors.authMethod.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="passwordPolicy"
								className="text-small font-medium text-text-foreground"
							>
								{gs.passwordPolicy}
							</Label>
							<Controller
								name="passwordPolicy"
								control={control}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled
									>
										<SelectTrigger
											id="passwordPolicy"
											className={`h-10 w-full disabled:opacity-100 ${errors.passwordPolicy ? "border-destructive" : ""}`}
											aria-label={gs.passwordPolicy}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectPasswordPolicy}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.passwordPolicies.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.passwordPolicy?.message && (
								<p className="text-mini text-destructive" role="alert">
									{errors.passwordPolicy.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="mfa"
								className="text-small font-medium text-text-foreground"
							>
								{gs.twoFaRequirement}
							</Label>
							<Controller
								name="mfa"
								control={control}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled
									>
										<SelectTrigger
											id="mfa"
											className={`h-10 w-full disabled:opacity-100 ${errors.mfa ? "border-destructive" : ""}`}
											aria-label={gs.twoFaRequirement}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectTwoFaRequirement}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.twoFaRequirements.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.mfa?.message && (
								<p className="text-mini text-destructive" role="alert">
									{errors.mfa.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="sessionTimeout"
								className="text-small font-medium text-text-foreground"
							>
								{gs.sessionTimeout}
							</Label>
							<Controller
								name="sessionTimeout"
								control={control}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled
									>
										<SelectTrigger
											id="sessionTimeout"
											className={`h-10 w-full disabled:opacity-100 ${errors.sessionTimeout ? "border-destructive" : ""}`}
											aria-label={gs.sessionTimeout}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectSessionTimeout}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.sessionTimeouts.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.sessionTimeout?.message && (
								<p className="text-mini text-destructive" role="alert">
									{errors.sessionTimeout.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="securityPosture"
								className="text-small font-medium text-text-foreground"
							>
								{gs.securityPosture}
							</Label>
							<Controller
								name="securityPosture"
								control={control}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled
									>
										<SelectTrigger
											id="securityPosture"
											className={`h-10 w-full disabled:opacity-100 ${errors.securityPosture ? "border-destructive" : ""}`}
											aria-label={gs.securityPosture}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectSecurityPosture}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.securityPostures.map((posture) => (
												<SelectItem key={posture.value} value={posture.value}>
													{posture.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.securityPosture?.message && (
								<p className="text-mini text-destructive" role="alert">
									{errors.securityPosture.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="primaryLanguage"
								className="text-small font-medium text-text-foreground"
							>
								{gs.primaryLanguage}
							</Label>
							<Controller
								name="primaryLanguage"
								control={control}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled
									>
										<SelectTrigger
											id="primaryLanguage"
											className={`h-10 w-full disabled:opacity-100 ${errors.primaryLanguage ? "border-destructive" : ""}`}
											aria-label={gs.primaryLanguage}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectPrimaryLanguage}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.primaryLanguages.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.primaryLanguage?.message && (
								<p className="text-mini text-destructive" role="alert">
									{errors.primaryLanguage.message}
								</p>
							)}
						</div>
					</div>
				</CollapsibleCard>
			)}

			{(section === "all" || section === "branding") && (
				<CollapsibleCard title={b.title}>
					<div className="flex flex-col gap-4">
						<Banner title={b.noteTitle}>{b.noteDescription}</Banner>

						<div className="space-y-4">
							<Label className="text-small font-medium text-text-secondary">
								{b.uploadLogo}
							</Label>

							<FileUploadArea
								onUpload={handleLogoUpload}
								validationOptions={brandLogoValidationOptions}
								uploadLabel={b.uploadLabel}
								uploadHint={b.uploadHint}
								accept=".png,.jpg,.jpeg,image/png,image/jpeg,image/jpg"
								isUploading={false}
								onValidationError={handleValidationError}
								ariaLabel={b.uploadLabel}
								className="rounded-lg"
							/>

							{errors.logo?.message && (
								<p className="text-small text-destructive" role="alert">
									{String(errors.logo.message)}
								</p>
							)}

							{displayLogoSrc && (
								<Card className="flex size-72 flex-col items-center justify-center rounded-lg border border-border bg-white p-6">
									<div className="relative flex size-64 items-center justify-center overflow-hidden rounded-lg bg-white group">
										<img
											src={displayLogoSrc}
											alt={b.logoAlt}
											className="max-h-full max-w-full object-contain"
											crossOrigin={
												logoFile instanceof File ? undefined : "anonymous"
											}
											referrerPolicy={
												logoFile instanceof File ? undefined : "no-referrer"
											}
											onError={() => {
												toast.error(b.errors.imageLoadFailed);
											}}
										/>
										<Button
											type="button"
											variant="ghost"
											aria-label={b.removeLogo}
											onClick={(e) => {
												e.preventDefault();
												void handleRemoveLogo();
											}}
											className="absolute inset-0 size-full rounded-lg border-0 p-0 font-normal shadow-none bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60 hover:text-white focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
											icon={Trash2}
											isLoading={removingLogo}
										/>
									</div>
								</Card>
							)}
						</div>
					</div>
				</CollapsibleCard>
			)}
		</form>
	);
}
