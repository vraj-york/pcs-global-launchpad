import { yupResolver } from "@hookform/resolvers/yup";
import { Info, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import {
	AddressAutocomplete,
	CollapsibleCard,
	FormInput,
	FormStepSkeleton,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ADD_NEW_COMPANY_CONTENT,
	ADD_NEW_CORPORATION_DROPDOWN_OPTIONS,
	FORM_PLACEHOLDERS,
	ROUTES,
} from "@/const";
import { cn } from "@/lib/utils";
import {
	type AddCompanyBasicInfoSchemaType,
	addCompanyBasicInfoSchema,
} from "@/schemas";
import { useCompanyDirectoryStore } from "@/store";
import type {
	AddCompanyBasicInfoStepProps,
	BasicInfoFormInnerProps,
	CompanyBasicInfoPatchPayload,
	CompanyBasicInfoPayload,
	CompanyDetailData,
	CorporationListOption,
} from "@/types";

const c = ADD_NEW_COMPANY_CONTENT;
const f = c.fields;
const options = ADD_NEW_CORPORATION_DROPDOWN_OPTIONS;

function getDefaultValues(
	ownershipType = options.ownershipTypes[0].value,
	region = options.regions[0].value,
): AddCompanyBasicInfoSchemaType {
	return {
		parentCorporationId: "",
		ownershipType,
		legalName: "",
		dbaTradeName: "",
		websiteUrl: "",
		companyType: "",
		officeType: "",
		region,
		industry: "",
		companyPhoneNo: "",
		addressLine: "",
		state: "",
		city: "",
		country: "",
		zip: "",
		sameAsCorpAdmin: false,
		firstName: "",
		lastName: "",
		nickname: "",
		jobRole: "",
		email: "",
		workPhone: "",
		cellPhone: "",
	};
}

function getDefaultValuesFromCompanyDetail(
	companyDetail: CompanyDetailData | null,
	corporationsList: CorporationListOption[],
): AddCompanyBasicInfoSchemaType {
	const base = getDefaultValues();
	if (!companyDetail) return base;
	const selectedCorp = corporationsList.find(
		(corp) => corp.id === companyDetail.corporationId,
	);
	const ownershipType =
		selectedCorp?.ownershipType ?? options.ownershipTypes[0].value;
	const region = selectedCorp?.dataResidencyRegion ?? options.regions[0].value;
	return {
		...base,
		parentCorporationId: companyDetail.corporationId ?? "",
		ownershipType,
		region,
		legalName: companyDetail.legalName ?? "",
		dbaTradeName: companyDetail.dbaName ?? "",
		websiteUrl: companyDetail.website ?? "",
		companyType: companyDetail.companyType ?? "",
		officeType: companyDetail.officeType ?? "",
		industry: companyDetail.industry ?? "",
		companyPhoneNo: companyDetail.phoneNo ?? "",
		addressLine: companyDetail.addressLine ?? "",
		state: companyDetail.state ?? "",
		city: companyDetail.city ?? "",
		country: companyDetail.country ?? "",
		zip: companyDetail.zip ?? "",
		sameAsCorpAdmin: companyDetail.sameAsCorpAdmin ?? false,
		firstName: companyDetail.companyAdmin?.firstName ?? "",
		lastName: companyDetail.companyAdmin?.lastName ?? "",
		nickname: companyDetail.companyAdmin?.nickname ?? "",
		jobRole: companyDetail.companyAdmin?.jobRole ?? "",
		email: companyDetail.companyAdmin?.email ?? "",
		workPhone: companyDetail.companyAdmin?.workPhone ?? "",
		cellPhone: companyDetail.companyAdmin?.cellPhone ?? "",
	};
}

function mapBasicInfoFormToCompanyFields(
	values: AddCompanyBasicInfoSchemaType,
): CompanyBasicInfoPayload {
	return {
		legalName: values.legalName ?? "",
		dbaName: values.dbaTradeName ?? "",
		website: values.websiteUrl ?? "",
		companyType: values.companyType ?? "",
		officeType: values.officeType ?? "",
		industry: values.industry ?? "",
		phoneNo: values.companyPhoneNo ?? "",
		sameAsCorpAdmin: values.sameAsCorpAdmin ?? false,
		firstName: values.firstName ?? "",
		lastName: values.lastName ?? "",
		nickname: values.nickname ?? "",
		jobRole: values.jobRole ?? "",
		email: values.email ?? "",
		workPhone: values.workPhone ?? "",
		cellPhone: values.cellPhone ?? "",
		addressLine: values.addressLine ?? "",
		state: values.state ?? "",
		city: values.city ?? "",
		country: values.country ?? "",
		zip: values.zip ?? "",
	};
}

function mapFormToCompanyBasicInfoPatchPayload(
	values: AddCompanyBasicInfoSchemaType,
): CompanyBasicInfoPatchPayload {
	const body = mapBasicInfoFormToCompanyFields(values);
	const { email: _omitEmail, ...withoutEmail } = body;
	if (withoutEmail.sameAsCorpAdmin === true) {
		const {
			firstName: _fn,
			lastName: _ln,
			nickname: _nn,
			jobRole: _jr,
			workPhone: _wp,
			cellPhone: _cp,
			...patchRest
		} = withoutEmail;
		return { ...patchRest, sameAsCorpAdmin: true as const };
	}
	return { ...withoutEmail, sameAsCorpAdmin: false as const };
}

function BasicInfoFormInner({
	corporationsList,
	companyDetail,
	onSuccess,
	onApiError,
}: BasicInfoFormInnerProps) {
	const { createCompany, updateCompanyBasicInfo } = useCompanyDirectoryStore();
	const isEditMode = Boolean(companyDetail?.id);
	const companyAdminEmailLocked = Boolean(
		companyDetail?.companyAdmin?.email?.trim(),
	);

	const formDefaultValues = useMemo(
		() => getDefaultValuesFromCompanyDetail(companyDetail, corporationsList),
		[companyDetail, corporationsList],
	);

	const {
		register,
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<AddCompanyBasicInfoSchemaType>({
		resolver: yupResolver(
			addCompanyBasicInfoSchema,
		) as Resolver<AddCompanyBasicInfoSchemaType>,
		mode: "onChange",
		defaultValues: formDefaultValues,
	});

	const parentCorporationId = watch("parentCorporationId");
	const sameAsCorpAdmin = watch("sameAsCorpAdmin");

	const selectedCorporation = useMemo(
		() => corporationsList.find((corp) => corp.id === parentCorporationId),
		[corporationsList, parentCorporationId],
	);

	const parentCorporationItemIds = useMemo(
		() => corporationsList.map((corp) => corp.id),
		[corporationsList],
	);

	const parentCorporationLabelById = useMemo(() => {
		const map = new Map<string, string>();
		for (const corp of corporationsList) {
			map.set(corp.id, corp.legalName);
		}
		return map;
	}, [corporationsList]);

	const parentCorporationItemToStringLabel = useCallback(
		(id: string) => parentCorporationLabelById.get(id) ?? id,
		[parentCorporationLabelById],
	);

	useEffect(() => {
		if (!selectedCorporation) return;
		setValue("ownershipType", selectedCorporation.ownershipType, {
			shouldValidate: true,
		});
		setValue("region", selectedCorporation.dataResidencyRegion, {
			shouldValidate: true,
		});
	}, [selectedCorporation, setValue]);

	useEffect(() => {
		if (!sameAsCorpAdmin || !selectedCorporation?.corporationAdmin) return;
		const admin = selectedCorporation.corporationAdmin;
		const opts = { shouldValidate: true };
		setValue("firstName", admin.firstName ?? "", opts);
		setValue("lastName", admin.lastName ?? "", opts);
		setValue("nickname", admin.nickname ?? "", opts);
		setValue("jobRole", admin.jobRole ?? "", opts);
		setValue("email", admin.email ?? "", opts);
		setValue("workPhone", admin.workPhone ?? "", opts);
		setValue("cellPhone", admin.cellPhone ?? "", opts);
	}, [sameAsCorpAdmin, selectedCorporation, setValue]);

	const onSubmit = async (data: AddCompanyBasicInfoSchemaType) => {
		const body = mapBasicInfoFormToCompanyFields(data);
		if (isEditMode && companyDetail?.id) {
			const patchBody = mapFormToCompanyBasicInfoPatchPayload(data);
			const result = await updateCompanyBasicInfo(companyDetail.id, patchBody);
			if (result.ok) {
				onSuccess(companyDetail.id);
			} else {
				onApiError?.(result.error);
			}
			return;
		}
		const corporationId = data.parentCorporationId;
		if (!corporationId) return;
		const result = await createCompany(corporationId, {
			...body,
			securityPosture: "Standard",
		});
		if (result.ok) {
			if (result.id) onSuccess(result.id);
		} else {
			onApiError?.(result.error);
		}
	};

	return (
		<form
			id="add-company-basic-info-form"
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-6"
		>
			<CollapsibleCard title={c.cards.parentCorporation}>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<Label
							htmlFor="parentCorporationId"
							className="text-small font-medium text-text-foreground"
						>
							<span className="text-destructive">*</span>{" "}
							{f.parentCorporationLegalName}
						</Label>
						<Controller
							name="parentCorporationId"
							control={control}
							render={({ field }) => (
								<Combobox
									items={parentCorporationItemIds}
									value={field.value ? field.value : null}
									onValueChange={(v) => {
										if (isEditMode) return;
										field.onChange(v ?? "");
									}}
									itemToStringLabel={parentCorporationItemToStringLabel}
								>
									<ComboboxInput
										id="parentCorporationId"
										disabled={isEditMode}
										showTrigger={!isEditMode}
										className={cn(
											"h-10 w-full",
											errors.parentCorporationId && "border-destructive",
											isEditMode &&
												"cursor-not-allowed bg-muted text-muted-foreground",
										)}
										placeholder={FORM_PLACEHOLDERS.selectParentCorporation}
										aria-label={f.parentCorporationLegalName}
										aria-invalid={errors.parentCorporationId ? true : undefined}
									/>
									{!isEditMode ? (
										<ComboboxContent>
											<ComboboxList>
												{(item: string) => (
													<ComboboxItem key={item} value={item}>
														{parentCorporationLabelById.get(item) ?? item}
													</ComboboxItem>
												)}
											</ComboboxList>
											<ComboboxEmpty>
												{c.parentCorporationNoMatches}
											</ComboboxEmpty>
										</ComboboxContent>
									) : null}
								</Combobox>
							)}
						/>
						{errors.parentCorporationId?.message && (
							<p className="text-mini text-destructive">
								{errors.parentCorporationId.message}
							</p>
						)}
					</div>
					<div className="space-y-2">
						<Label
							htmlFor="ownershipType"
							className="text-small font-medium text-text-foreground"
						>
							{f.ownershipType}
						</Label>
						<Controller
							name="ownershipType"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value}
									onValueChange={field.onChange}
									disabled
								>
									<SelectTrigger
										id="ownershipType"
										className={`h-10 w-full ${errors.ownershipType ? "border-destructive" : ""}`}
									>
										<SelectValue
											placeholder={FORM_PLACEHOLDERS.ownershipWhollyOwned}
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
				</div>
				{!isEditMode && (
					<div
						className="flex items-center gap-4 rounded-lg bg-info-bg p-4"
						role="status"
						aria-live="polite"
					>
						<div className="flex min-w-0 flex-1 items-start gap-3">
							<Info
								className="mt-0.5 size-4 shrink-0 text-icon-info"
								aria-hidden
							/>
							<div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-5">
								<p className="text-sm font-semibold text-text-foreground">
									{c.parentCorporationAlertTitle}
								</p>
								<p className="text-sm font-normal text-muted-foreground">
									{c.parentCorporationAlertDescription}
								</p>
							</div>
						</div>
						<Button asChild size="sm">
							<Link
								to={ROUTES.corporateDirectory.addAdvanced}
								className="inline-flex h-8 items-center gap-2"
							>
								<PlusIcon className="size-3.5" aria-hidden />
								{c.addNewCorporationButton}
							</Link>
						</Button>
					</div>
				)}
			</CollapsibleCard>

			<CollapsibleCard title={c.cards.companyInfo}>
				<FormInput
					id="legalName"
					label={f.companyLegalName}
					placeholder={FORM_PLACEHOLDERS.companyLegalName}
					error={errors.legalName?.message}
					required
					className="h-10"
					{...register("legalName")}
				/>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormInput
						id="dbaTradeName"
						label={f.dbaTradeName}
						placeholder={FORM_PLACEHOLDERS.dbaTradeName}
						error={errors.dbaTradeName?.message}
						className="h-10"
						{...register("dbaTradeName")}
					/>
					<FormInput
						id="websiteUrl"
						label={f.websiteUrl}
						type="url"
						placeholder={FORM_PLACEHOLDERS.websiteUrl}
						error={errors.websiteUrl?.message}
						className="h-10"
						{...register("websiteUrl")}
					/>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label
							htmlFor="companyType"
							className="text-small font-medium text-text-foreground"
						>
							<span className="text-destructive">*</span> {f.companyType}
						</Label>
						<Controller
							name="companyType"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										id="companyType"
										className={`h-10 w-full ${errors.companyType ? "border-destructive" : ""}`}
									>
										<SelectValue
											placeholder={FORM_PLACEHOLDERS.selectCompanyType}
										/>
									</SelectTrigger>
									<SelectContent>
										{options.companyTypes.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.companyType?.message && (
							<p className="text-mini text-destructive">
								{errors.companyType.message}
							</p>
						)}
					</div>
					<div className="space-y-2">
						<Label
							htmlFor="officeType"
							className="text-small font-medium text-text-foreground"
						>
							<span className="text-destructive">*</span> {f.officeType}
						</Label>
						<Controller
							name="officeType"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										id="officeType"
										className={`h-10 w-full ${errors.officeType ? "border-destructive" : ""}`}
									>
										<SelectValue
											placeholder={FORM_PLACEHOLDERS.selectOfficeType}
										/>
									</SelectTrigger>
									<SelectContent>
										{options.officeTypes.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.officeType?.message && (
							<p className="text-mini text-destructive">
								{errors.officeType.message}
							</p>
						)}
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label
							htmlFor="region"
							className="text-small font-medium text-text-foreground"
						>
							<span className="text-destructive">*</span> {f.region}
						</Label>
						<Controller
							name="region"
							control={control}
							render={({ field }) => (
								<Select
									value={field.value}
									onValueChange={field.onChange}
									disabled
								>
									<SelectTrigger
										id="region"
										className={`h-10 w-full ${errors.region ? "border-destructive" : ""}`}
									>
										<SelectValue placeholder={FORM_PLACEHOLDERS.selectRegion} />
									</SelectTrigger>
									<SelectContent>
										{options.regions.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						/>
						{errors.region?.message && (
							<p className="text-mini text-destructive">
								{errors.region.message}
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
										className={`h-10 w-full ${errors.industry ? "border-destructive" : ""}`}
									>
										<SelectValue
											placeholder={FORM_PLACEHOLDERS.selectIndustryWithPeriod}
										/>
									</SelectTrigger>
									<SelectContent>
										{options.industries.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
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
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormInput
						id="companyPhoneNo"
						label={f.companyPhoneNo}
						placeholder={FORM_PLACEHOLDERS.phoneFormatted}
						error={errors.companyPhoneNo?.message}
						required
						className="h-10"
						{...register("companyPhoneNo")}
					/>
				</div>
			</CollapsibleCard>

			<CollapsibleCard title={c.cards.companyAddress}>
				<AddressAutocomplete
					name="addressLine"
					label={f.addressLine}
					placeholder={FORM_PLACEHOLDERS.addressLine}
					control={control}
					setValue={setValue}
					error={errors.addressLine?.message}
					required
					fieldMapping={{
						addressLine: "addressLine",
						city: "city",
						state: "state",
						country: "country",
						zip: "zip",
					}}
				/>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormInput
						id="state"
						label={f.stateProvince}
						placeholder={FORM_PLACEHOLDERS.selectStateProvince}
						error={errors.state?.message}
						required
						className="h-10"
						{...register("state")}
					/>
					<FormInput
						id="city"
						label={f.city}
						placeholder={FORM_PLACEHOLDERS.selectCity}
						error={errors.city?.message}
						required
						className="h-10"
						{...register("city")}
					/>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormInput
						id="country"
						label={f.country}
						placeholder={FORM_PLACEHOLDERS.selectCountry}
						error={errors.country?.message}
						required
						className="h-10"
						{...register("country")}
					/>
					<FormInput
						id="zip"
						label={f.zipPostalCode}
						placeholder={FORM_PLACEHOLDERS.enterZipPostalCode}
						error={errors.zip?.message}
						required
						className="h-10"
						{...register("zip")}
					/>
				</div>
			</CollapsibleCard>

			<CollapsibleCard title={c.cards.companyAdmin}>
				<div
					className={cn("flex items-center gap-2", isEditMode && "opacity-90")}
				>
					<Controller
						name="sameAsCorpAdmin"
						control={control}
						render={({ field }) => (
							<Checkbox
								id="sameAsCorpAdmin"
								checked={field.value}
								disabled={isEditMode}
								onCheckedChange={(checked) => {
									if (isEditMode) return;
									field.onChange(checked === true);
									if (checked !== true) {
										const opts = { shouldValidate: true };
										setValue("firstName", "", opts);
										setValue("lastName", "", opts);
										setValue("nickname", "", opts);
										setValue("jobRole", "", opts);
										setValue("email", "", opts);
										setValue("workPhone", "", opts);
										setValue("cellPhone", "", opts);
									}
								}}
								aria-label={c.sameAsCorpAdminLabel}
							/>
						)}
					/>
					<Label
						htmlFor="sameAsCorpAdmin"
						className={cn(
							"text-sm font-medium text-text-foreground",
							isEditMode ? "cursor-not-allowed" : "cursor-pointer",
						)}
					>
						{c.sameAsCorpAdminLabel}
					</Label>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormInput
						id="firstName"
						label={f.firstName}
						placeholder={FORM_PLACEHOLDERS.firstNameArthur}
						error={errors.firstName?.message}
						required
						className="h-10"
						disabled={sameAsCorpAdmin}
						{...register("firstName")}
					/>
					<FormInput
						id="lastName"
						label={f.lastName}
						placeholder={FORM_PLACEHOLDERS.lastNameHarold}
						error={errors.lastName?.message}
						required
						className="h-10"
						disabled={sameAsCorpAdmin}
						{...register("lastName")}
					/>
					<FormInput
						id="nickname"
						label={f.nickname}
						placeholder={FORM_PLACEHOLDERS.nicknameArold}
						error={errors.nickname?.message}
						className="h-10"
						disabled={sameAsCorpAdmin}
						{...register("nickname")}
					/>
					<FormInput
						id="jobRole"
						label={f.jobRole}
						placeholder={FORM_PLACEHOLDERS.jobRoleAdministrator}
						error={errors.jobRole?.message}
						required
						className="h-10"
						disabled={sameAsCorpAdmin}
						{...register("jobRole")}
					/>
					<FormInput
						id="email"
						label={f.email}
						type="email"
						placeholder={FORM_PLACEHOLDERS.emailArthurHarold}
						error={errors.email?.message}
						required
						className="h-10"
						autoComplete="email"
						disabled={sameAsCorpAdmin || isEditMode || companyAdminEmailLocked}
						{...register("email")}
					/>
					<FormInput
						id="workPhone"
						label={f.workPhoneNo}
						placeholder={FORM_PLACEHOLDERS.phoneFormatted}
						error={errors.workPhone?.message}
						required
						className="h-10"
						disabled={sameAsCorpAdmin}
						{...register("workPhone")}
					/>
					<FormInput
						id="cellPhone"
						label={f.cellPhoneNo}
						placeholder={FORM_PLACEHOLDERS.phoneFormatted}
						error={errors.cellPhone?.message}
						className="h-10"
						disabled={sameAsCorpAdmin}
						{...register("cellPhone")}
					/>
				</div>
			</CollapsibleCard>
		</form>
	);
}

export function BasicInfoStep({
	onSuccess,
	onApiError,
	companyId,
}: AddCompanyBasicInfoStepProps) {
	const {
		corporationsList,
		corporationsListLoading,
		fetchCorporationsList,
		companyDetail,
		companyDetailLoading,
	} = useCompanyDirectoryStore();

	useEffect(() => {
		fetchCorporationsList();
	}, [fetchCorporationsList]);

	const isEditLoading = Boolean(companyId && companyDetailLoading);
	const isDataReady =
		!corporationsListLoading && (!companyId || !companyDetailLoading);

	if (!isDataReady || isEditLoading) {
		return <FormStepSkeleton fieldCount={10} />;
	}

	return (
		<BasicInfoFormInner
			key={`${companyId ?? "new"}-${companyDetail?.id ?? ""}`}
			corporationsList={corporationsList}
			companyDetail={companyDetail}
			onSuccess={onSuccess}
			onApiError={onApiError}
		/>
	);
}
