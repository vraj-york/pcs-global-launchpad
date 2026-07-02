import { yupResolver } from "@hookform/resolvers/yup";
import { Info } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm, useWatch } from "react-hook-form";
import { mapCorporationDetailToBasicInfoForm } from "@/api";
import {
	AddressAutocomplete,
	CollapsibleCard,
	FormInput,
} from "@/components/common";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	ADD_NEW_CORPORATION_CONTENT,
	ADD_NEW_CORPORATION_DROPDOWN_OPTIONS,
	FORM_PLACEHOLDERS,
} from "@/const";
import { cn } from "@/lib/utils";
import {
	type CreateCorporationSchemaType,
	createCorporationSchema,
} from "@/schemas";
import { useCorporationsStore } from "@/store";
import type { BasicInfoStepProps } from "@/types";

const defaultValuesQuick: CreateCorporationSchemaType = {
	mode: "quick",
	legalName: "",
	dbaName: "",
	website: "",
	ownershipType: ADD_NEW_CORPORATION_DROPDOWN_OPTIONS.ownershipTypes[0].value,
	dataResidencyRegion: ADD_NEW_CORPORATION_DROPDOWN_OPTIONS.regions[0].value,
	industry: "",
	phoneNo: "",
	address: {
		addressLine: "",
		state: "",
		city: "",
		country: "",
		zip: "",
		timezone: "",
	},
	executiveSponsor: {
		sameAsCorpAdmin: false,
		firstName: "",
		lastName: "",
		nickname: "",
		jobRole: "",
		email: "",
		workPhone: "",
		cellPhone: "",
	},
	corporationAdmin: {
		firstName: "",
		lastName: "",
		nickname: "",
		jobRole: "",
		email: "",
		workPhone: "",
		cellPhone: "",
	},
};

const defaultValuesAdvanced: CreateCorporationSchemaType = {
	...defaultValuesQuick,
	mode: "advanced",
};

function BasicInfoFormInner({
	mode = "quick",
	corporationDetail,
	onSuccess,
	onApiError,
}: BasicInfoStepProps) {
	const c = ADD_NEW_CORPORATION_CONTENT;
	const f = c.fields;
	const options = ADD_NEW_CORPORATION_DROPDOWN_OPTIONS;
	const { createCorporation, updateCorporation } = useCorporationsStore();
	const isEditMode = Boolean(corporationDetail?.id);
	const isAdvanced = mode === "advanced";

	const formDefaultValues = useMemo((): CreateCorporationSchemaType => {
		const baseDefaults = isAdvanced
			? defaultValuesAdvanced
			: defaultValuesQuick;
		if (!corporationDetail) return baseDefaults;
		const mapped = mapCorporationDetailToBasicInfoForm(corporationDetail);
		return {
			...baseDefaults,
			...mapped,
			mode: isAdvanced ? "advanced" : "quick",
			address: {
				...baseDefaults.address,
				...(mapped.address ?? {}),
			},
			executiveSponsor: {
				...baseDefaults.executiveSponsor,
				...(mapped.executiveSponsor ?? {}),
			},
			corporationAdmin:
				mapped.corporationAdmin && baseDefaults.corporationAdmin
					? { ...baseDefaults.corporationAdmin, ...mapped.corporationAdmin }
					: baseDefaults.corporationAdmin,
		} as CreateCorporationSchemaType;
	}, [corporationDetail, isAdvanced]);

	const {
		register,
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<CreateCorporationSchemaType>({
		resolver: yupResolver(
			createCorporationSchema,
		) as Resolver<CreateCorporationSchemaType>,
		mode: "onChange",
		defaultValues: formDefaultValues,
	});

	const sameAsCorpAdmin = watch("executiveSponsor.sameAsCorpAdmin") === true;
	const corporationAdminValues = useWatch({
		control,
		name: "corporationAdmin",
		defaultValue: undefined,
	});

	const setSponsorOpts = { shouldValidate: true };

	useEffect(() => {
		if (!sameAsCorpAdmin || !corporationAdminValues) return;
		setValue(
			"executiveSponsor.firstName",
			corporationAdminValues.firstName ?? "",
			setSponsorOpts,
		);
		setValue(
			"executiveSponsor.lastName",
			corporationAdminValues.lastName ?? "",
			setSponsorOpts,
		);
		setValue(
			"executiveSponsor.nickname",
			corporationAdminValues.nickname ?? "",
			setSponsorOpts,
		);
		setValue(
			"executiveSponsor.jobRole",
			corporationAdminValues.jobRole ?? "",
			setSponsorOpts,
		);
		setValue(
			"executiveSponsor.email",
			corporationAdminValues.email ?? "",
			setSponsorOpts,
		);
		setValue(
			"executiveSponsor.workPhone",
			corporationAdminValues.workPhone ?? "",
			setSponsorOpts,
		);
		setValue(
			"executiveSponsor.cellPhone",
			corporationAdminValues.cellPhone ?? "",
			setSponsorOpts,
		);
	}, [sameAsCorpAdmin, corporationAdminValues, setValue]);

	const onSubmit = async (data: CreateCorporationSchemaType) => {
		const payload = data;
		if (isEditMode && corporationDetail?.id) {
			const { mode: _m, ...rest } = payload;
			const result = await updateCorporation(corporationDetail.id, rest);
			if (result.ok) {
				onSuccess(corporationDetail.id);
			} else {
				onApiError?.(result.error);
			}
		} else {
			const result = await createCorporation(payload);
			if (result.ok) {
				onSuccess(result.id);
			} else {
				onApiError?.(result.error);
			}
		}
	};

	return (
		<form
			id="basic-info-form"
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-6"
		>
			<div className="space-y-6">
				<CollapsibleCard title={c.cards.corporationBasics}>
					<FormInput
						id="legalName"
						label={f.corporationLegalName}
						placeholder={FORM_PLACEHOLDERS.corporationLegalName}
						error={errors.legalName?.message}
						required
						{...register("legalName")}
					/>
					<FormInput
						id="dbaName"
						label={f.dbaName}
						placeholder={FORM_PLACEHOLDERS.dbaName}
						error={errors.dbaName?.message}
						{...register("dbaName")}
					/>
					<FormInput
						id="website"
						label={f.websiteUrl}
						type="url"
						placeholder={FORM_PLACEHOLDERS.websiteUrl}
						error={errors.website?.message}
						{...register("website")}
					/>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label
								htmlFor="ownershipType"
								className="text-small font-medium text-text-foreground"
							>
								<span className="text-destructive">*</span> {f.ownershipType}
							</Label>
							<Controller
								name="ownershipType"
								control={control}
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger
											id="ownershipType"
											className={`w-full h-10 ${errors.ownershipType ? "border-destructive" : ""}`}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectOwnershipType}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.ownershipTypes.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.ownershipType?.message && (
								<p className="text-mini text-destructive">
									{errors.ownershipType.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="dataResidencyRegion"
								className="text-small font-medium text-text-foreground"
							>
								<span className="text-destructive">*</span> {f.region}
							</Label>
							<Controller
								name="dataResidencyRegion"
								control={control}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled
									>
										<SelectTrigger
											id="dataResidencyRegion"
											className={`w-full h-10 ${errors.dataResidencyRegion ? "border-destructive" : ""}`}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectOperatingRegion}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.regions.map((region) => (
												<SelectItem key={region.value} value={region.value}>
													{region.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.dataResidencyRegion?.message && (
								<p className="text-mini text-destructive">
									{errors.dataResidencyRegion.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="industry"
								className="text-small font-medium text-text-foreground"
							>
								<span className="text-destructive">*</span> {f.industry}
							</Label>
							<Controller
								name="industry"
								control={control}
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger
											id="industry"
											className={`w-full h-10 ${errors.industry ? "border-destructive" : ""}`}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectIndustry}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.industries.map((industry) => (
												<SelectItem key={industry.value} value={industry.value}>
													{industry.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.industry?.message && (
								<p className="text-mini text-destructive">
									{errors.industry.message}
								</p>
							)}
						</div>
						<FormInput
							id="phoneNo"
							label={f.corporatePhoneNo}
							placeholder={FORM_PLACEHOLDERS.phoneSpaced}
							error={errors.phoneNo?.message}
							required
							{...register("phoneNo")}
						/>
					</div>
				</CollapsibleCard>

				<CollapsibleCard title={c.cards.corporationAddress}>
					<AddressAutocomplete
						name="address.addressLine"
						label={f.addressLine}
						placeholder={FORM_PLACEHOLDERS.enterAddressLine}
						control={control}
						setValue={setValue}
						error={errors.address?.addressLine?.message}
						required
						fieldMapping={{
							addressLine: "address.addressLine",
							city: "address.city",
							state: "address.state",
							country: "address.country",
							zip: "address.zip",
						}}
					/>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormInput
							id="address.state"
							label={f.stateProvince}
							placeholder={FORM_PLACEHOLDERS.enterStateProvince}
							error={errors.address?.state?.message}
							required
							{...register("address.state")}
						/>
						<FormInput
							id="address.city"
							label={f.city}
							placeholder={FORM_PLACEHOLDERS.enterCity}
							error={errors.address?.city?.message}
							required
							{...register("address.city")}
						/>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormInput
							id="address.country"
							label={f.country}
							placeholder={FORM_PLACEHOLDERS.enterCountry}
							error={errors.address?.country?.message}
							required
							{...register("address.country")}
						/>
						<FormInput
							id="address.zip"
							label={f.zipPostalCode}
							placeholder={FORM_PLACEHOLDERS.enterZipPostalCodeAlt}
							error={errors.address?.zip?.message}
							required
							{...register("address.zip")}
						/>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label
								htmlFor="address.timezone"
								className="text-small font-medium text-text-foreground"
							>
								<span className="text-destructive">*</span> {f.timeZone}
							</Label>
							<Controller
								name="address.timezone"
								control={control}
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger
											id="address.timezone"
											className={`w-full h-10 ${errors.address?.timezone ? "border-destructive" : ""}`}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectTimeZone}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.timeZones.map((tz) => (
												<SelectItem key={tz.value} value={tz.value}>
													{tz.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.address?.timezone?.message && (
								<p className="text-mini text-destructive">
									{errors.address.timezone.message}
								</p>
							)}
						</div>
					</div>
				</CollapsibleCard>

				<CollapsibleCard title={c.cards.corporationAdmin}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormInput
							id="corporationAdmin.firstName"
							label={f.firstName}
							placeholder={FORM_PLACEHOLDERS.firstNameMike}
							error={errors.corporationAdmin?.firstName?.message}
							required
							{...register("corporationAdmin.firstName")}
						/>
						<FormInput
							id="corporationAdmin.lastName"
							label={f.lastName}
							placeholder={FORM_PLACEHOLDERS.lastNameDavis}
							error={errors.corporationAdmin?.lastName?.message}
							required
							{...register("corporationAdmin.lastName")}
						/>
						<FormInput
							id="corporationAdmin.nickname"
							label={f.nickname}
							placeholder={FORM_PLACEHOLDERS.nicknameMd}
							error={errors.corporationAdmin?.nickname?.message}
							{...register("corporationAdmin.nickname")}
						/>
						<FormInput
							id="corporationAdmin.jobRole"
							label={f.role}
							placeholder={FORM_PLACEHOLDERS.jobRoleCeo}
							error={errors.corporationAdmin?.jobRole?.message}
							required
							{...register("corporationAdmin.jobRole")}
						/>
						<FormInput
							id="corporationAdmin.email"
							label={f.email}
							type="email"
							placeholder={FORM_PLACEHOLDERS.emailMikeDavis}
							autoComplete="email"
							error={errors.corporationAdmin?.email?.message}
							required
							disabled={isEditMode}
							{...register("corporationAdmin.email")}
						/>
						<FormInput
							id="corporationAdmin.workPhone"
							label={f.workPhoneNo}
							placeholder={FORM_PLACEHOLDERS.phoneSpaced}
							error={errors.corporationAdmin?.workPhone?.message}
							required
							{...register("corporationAdmin.workPhone")}
						/>
						<FormInput
							id="corporationAdmin.cellPhone"
							label={f.cellPhoneNo}
							placeholder={FORM_PLACEHOLDERS.phoneSpaced}
							error={errors.corporationAdmin?.cellPhone?.message}
							{...register("corporationAdmin.cellPhone")}
						/>
					</div>
				</CollapsibleCard>

				<CollapsibleCard
					title={
						<div className="flex items-center gap-2">
							<span>{c.cards.executiveSponsor}</span>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={(e) => e.stopPropagation()}
										className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										aria-label={c.referenceOnlyTooltip}
									>
										<Info className="size-4 text-icon-info" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="top" className="max-w-xs">
									{c.referenceOnlyTooltip}
								</TooltipContent>
							</Tooltip>
						</div>
					}
				>
					<div
						className={cn(
							"flex items-center gap-2",
							isEditMode && "opacity-90",
						)}
					>
						<Controller
							name="executiveSponsor.sameAsCorpAdmin"
							control={control}
							render={({ field }) => (
								<Checkbox
									id="executiveSponsor.sameAsCorpAdmin"
									checked={field.value === true}
									disabled={isEditMode}
									onCheckedChange={(checked) => {
										if (isEditMode) return;
										field.onChange(checked === true);
										if (checked !== true) {
											const opts = { shouldValidate: true };
											setValue("executiveSponsor.firstName", "", opts);
											setValue("executiveSponsor.lastName", "", opts);
											setValue("executiveSponsor.nickname", "", opts);
											setValue("executiveSponsor.jobRole", "", opts);
											setValue("executiveSponsor.email", "", opts);
											setValue("executiveSponsor.workPhone", "", opts);
											setValue("executiveSponsor.cellPhone", "", opts);
										}
									}}
									aria-label={c.sameAsCorpAdminLabel}
								/>
							)}
						/>
						<Label
							htmlFor="executiveSponsor.sameAsCorpAdmin"
							className={cn(
								"text-small font-normal text-text-foreground",
								isEditMode ? "cursor-not-allowed" : "cursor-pointer",
							)}
						>
							{c.sameAsCorpAdminLabel}
						</Label>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormInput
							id="executiveSponsor.firstName"
							label={f.firstName}
							placeholder={FORM_PLACEHOLDERS.firstNameMike}
							error={errors.executiveSponsor?.firstName?.message}
							required
							disabled={sameAsCorpAdmin}
							{...register("executiveSponsor.firstName")}
						/>
						<FormInput
							id="executiveSponsor.lastName"
							label={f.lastName}
							placeholder={FORM_PLACEHOLDERS.lastNameDavis}
							error={errors.executiveSponsor?.lastName?.message}
							required
							disabled={sameAsCorpAdmin}
							{...register("executiveSponsor.lastName")}
						/>
						<FormInput
							id="executiveSponsor.nickname"
							label={f.nickname}
							placeholder={FORM_PLACEHOLDERS.nicknameMd}
							error={errors.executiveSponsor?.nickname?.message}
							disabled={sameAsCorpAdmin}
							{...register("executiveSponsor.nickname")}
						/>
						<FormInput
							id="executiveSponsor.jobRole"
							label={f.role}
							placeholder={FORM_PLACEHOLDERS.jobRoleCeo}
							error={errors.executiveSponsor?.jobRole?.message}
							required
							disabled={sameAsCorpAdmin}
							{...register("executiveSponsor.jobRole")}
						/>
						<FormInput
							id="executiveSponsor.email"
							label={f.email}
							type="email"
							placeholder={FORM_PLACEHOLDERS.emailMikeDavis}
							autoComplete="email"
							error={errors.executiveSponsor?.email?.message}
							required
							disabled={sameAsCorpAdmin || isEditMode}
							{...register("executiveSponsor.email")}
						/>
						<FormInput
							id="executiveSponsor.workPhone"
							label={f.workPhoneNo}
							placeholder={FORM_PLACEHOLDERS.phoneSpaced}
							error={errors.executiveSponsor?.workPhone?.message}
							required
							disabled={sameAsCorpAdmin}
							{...register("executiveSponsor.workPhone")}
						/>
						<FormInput
							id="executiveSponsor.cellPhone"
							label={f.cellPhoneNo}
							placeholder={FORM_PLACEHOLDERS.phoneSpaced}
							error={errors.executiveSponsor?.cellPhone?.message}
							disabled={sameAsCorpAdmin}
							{...register("executiveSponsor.cellPhone")}
						/>
					</div>
				</CollapsibleCard>
			</div>
		</form>
	);
}

export function BasicInfoStep({
	mode = "quick",
	onSuccess,
	onApiError,
	corporationDetail,
	isLoadingDetail,
}: BasicInfoStepProps) {
	const c = ADD_NEW_CORPORATION_CONTENT;
	if (isLoadingDetail && !corporationDetail) {
		return (
			<p className="text-small text-muted-foreground">{c.loadingDetail}</p>
		);
	}
	return (
		<BasicInfoFormInner
			key={`${corporationDetail?.id ?? "new"}-${mode}`}
			mode={mode}
			corporationDetail={corporationDetail ?? undefined}
			onSuccess={onSuccess}
			onApiError={onApiError}
		/>
	);
}
