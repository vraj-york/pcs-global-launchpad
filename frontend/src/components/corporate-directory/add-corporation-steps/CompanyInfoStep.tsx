import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { getPricingPlans, mapCorporationDetailToCompanyForm } from "@/api";
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
	ADD_NEW_CORPORATION_CONTENT,
	ADD_NEW_CORPORATION_DROPDOWN_OPTIONS,
	COMPANY_INFO_CONTENT,
	FORM_PLACEHOLDERS,
} from "@/const";
import { cn } from "@/lib/utils";
import { type CreateCompanySchemaType, createCompanySchema } from "@/schemas";
import { useCorporationsStore } from "@/store";
import type { CompanyInfoStepProps, PricingPlanType } from "@/types";
import {
	findIndividualPricingPlanLevel,
	formatPlanEmployeeRange,
} from "@/utils";

const defaultValues: Partial<CreateCompanySchemaType> &
	Record<string, unknown> = {
	legalName: "",
	companyType: "",
	officeType: "",
	region: ADD_NEW_CORPORATION_DROPDOWN_OPTIONS.regions[0].value,
	industry: "",
	planTypeId: "",
	planId: "",
	state: "",
	city: "",
	zip: "",
	addressLine: "",
	country: "",
	sameAsCorpAdmin: false,
	firstName: "",
	lastName: "",
	nickname: "",
	jobRole: "",
	email: "",
	workPhone: "",
	cellPhone: "",
	securityPosture: "Standard",
	phoneNo: "",
};

const INDIVIDUAL_PLAN_LEVEL_DISPLAY_VALUE = "custom";

function CompanyInfoFormInner({
	corporationDetail,
	onSuccess,
	onApiError,
}: Pick<
	CompanyInfoStepProps,
	"corporationDetail" | "onSuccess" | "onApiError"
>) {
	const c = COMPANY_INFO_CONTENT;
	const f = c.fields;
	const options = ADD_NEW_CORPORATION_DROPDOWN_OPTIONS;
	const { createCompany, updateCompany } = useCorporationsStore();
	const corporationId = corporationDetail?.id ?? null;
	const existingCompany = corporationDetail?.companies?.[0];
	const isEditMode = Boolean(corporationId && existingCompany?.id);

	const [pricingPlans, setPricingPlans] = useState<PricingPlanType[]>([]);

	useEffect(() => {
		let cancelled = false;
		getPricingPlans().then((result) => {
			if (cancelled || !result.ok) return;
			setPricingPlans(result.data);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const planTypeOptions = useMemo(
		() => pricingPlans.map((t) => ({ value: t.id, label: t.name })),
		[pricingPlans],
	);

	const formDefaultValues = useMemo((): CreateCompanySchemaType => {
		if (!corporationDetail) return defaultValues as CreateCompanySchemaType;
		const mapped = mapCorporationDetailToCompanyForm(corporationDetail);
		return { ...defaultValues, ...mapped } as CreateCompanySchemaType;
	}, [corporationDetail]);

	const {
		register,
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = useForm<CreateCompanySchemaType>({
		resolver: yupResolver(
			createCompanySchema,
		) as Resolver<CreateCompanySchemaType>,
		mode: "onChange",
		defaultValues: formDefaultValues,
	});

	const planTypeId = watch("planTypeId");
	const sameAsCorpAdmin = watch("sameAsCorpAdmin");
	const individualPlanLevel = useMemo(
		() => findIndividualPricingPlanLevel(pricingPlans),
		[pricingPlans],
	);
	const isIndividualPlan = planTypeId === "one_time";
	useEffect(() => {
		if (!existingCompany?.planId || pricingPlans.length === 0) return;
		const type = pricingPlans.find((t) =>
			t.plans.some((pl) => pl.id === existingCompany.planId),
		);
		if (type) setValue("planTypeId", type.id);
	}, [existingCompany?.planId, pricingPlans, setValue]);

	useEffect(() => {
		if (!isIndividualPlan || !individualPlanLevel?.id) return;
		setValue("planId", individualPlanLevel.id);
	}, [isIndividualPlan, individualPlanLevel?.id, setValue]);

	const selectedPlanType = useMemo(
		() => pricingPlans.find((t) => t.id === planTypeId) ?? null,
		[pricingPlans, planTypeId],
	);
	const planLevelOptions = useMemo(() => {
		if (!selectedPlanType) return [];
		return selectedPlanType.plans
			.filter((pl) => pl.customerType === "company")
			.map((pl) => ({
				value: pl.id,
				label: formatPlanEmployeeRange(
					pl.employeeRangeMin,
					pl.employeeRangeMax,
				),
			}));
	}, [selectedPlanType]);

	const onSubmit = async (data: CreateCompanySchemaType) => {
		const { region, planTypeId: submittedPlanTypeId, ...payload } = data;
		if (submittedPlanTypeId === "one_time" && individualPlanLevel?.id) {
			payload.planId = individualPlanLevel.id;
		}
		if (isEditMode && corporationId && existingCompany?.id) {
			const result = await updateCompany(
				corporationId,
				existingCompany.id,
				payload as Partial<CreateCompanySchemaType>,
			);
			if (result.ok) onSuccess?.();
			else onApiError?.(result.error);
		} else {
			const result = await createCompany(payload as CreateCompanySchemaType);
			if (result.ok) onSuccess?.();
			else onApiError?.(result.error);
		}
	};

	return (
		<form
			id="company-info-form"
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-6"
		>
			<div className="space-y-6">
				<CollapsibleCard title={c.cards.companyDetails}>
					<FormInput
						id="legalName"
						label={f.companyLegalName}
						placeholder={FORM_PLACEHOLDERS.companyLegalNameIndia}
						error={errors.legalName?.message}
						required
						{...register("legalName")}
					/>
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
											className={`w-full h-10 ${errors.companyType ? "border-destructive" : ""}`}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectCompanyType}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.companyTypes.map((type) => (
												<SelectItem key={type.value} value={type.value}>
													{type.label}
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
											className={`w-full h-10 ${errors.officeType ? "border-destructive" : ""}`}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.selectOfficeType}
											/>
										</SelectTrigger>
										<SelectContent>
											{options.officeTypes.map((type) => (
												<SelectItem key={type.value} value={type.value}>
													{type.label}
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
											className={`w-full h-10 ${errors.region ? "border-destructive" : ""}`}
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
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label
								htmlFor="planTypeId"
								className="text-small font-medium text-text-foreground"
							>
								<span className="text-destructive">*</span> {f.plan}
							</Label>
							<Controller
								name="planTypeId"
								control={control}
								render={({ field }) => (
									<Select
										value={field.value ?? ""}
										onValueChange={(v) => {
											field.onChange(v);
											if (v === "one_time") {
												setValue("planId", individualPlanLevel?.id ?? "");
											} else {
												setValue("planId", "");
											}
										}}
									>
										<SelectTrigger id="planTypeId" className="h-10 w-full">
											<SelectValue placeholder={FORM_PLACEHOLDERS.selectPlan} />
										</SelectTrigger>
										<SelectContent>
											{planTypeOptions.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="planId"
								className="text-small font-medium text-text-foreground"
							>
								<span className="text-destructive">*</span> {f.planLevel}
							</Label>
							<Controller
								name="planId"
								control={control}
								render={({ field }) => (
									<Select
										value={
											isIndividualPlan
												? INDIVIDUAL_PLAN_LEVEL_DISPLAY_VALUE
												: (field.value ?? "")
										}
										onValueChange={field.onChange}
										disabled={!planTypeId || isIndividualPlan}
									>
										<SelectTrigger
											id="planId"
											className={`w-full h-10 ${errors.planId ? "border-destructive" : ""}`}
										>
											<SelectValue
												placeholder={
													isIndividualPlan
														? FORM_PLACEHOLDERS.planLevelCustom
														: FORM_PLACEHOLDERS.selectPlanLevel
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{isIndividualPlan ? (
												<SelectItem value={INDIVIDUAL_PLAN_LEVEL_DISPLAY_VALUE}>
													{FORM_PLACEHOLDERS.planLevelCustom}
												</SelectItem>
											) : (
												planLevelOptions.map((opt) => (
													<SelectItem key={opt.value} value={opt.value}>
														{opt.label}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.planId?.message && (
								<p className="text-mini text-destructive">
									{errors.planId.message}
								</p>
							)}
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label
								htmlFor="securityPosture"
								className="text-small font-medium text-text-foreground"
							>
								{f.securityPosture}
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
											className={`w-full h-10 ${errors.securityPosture ? "border-destructive" : ""}`}
										>
											<SelectValue
												placeholder={FORM_PLACEHOLDERS.securityPostureStandard}
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
								<p className="text-mini text-destructive">
									{errors.securityPosture.message}
								</p>
							)}
						</div>
						<FormInput
							id="phoneNo"
							label={f.companyPhoneNo}
							placeholder={FORM_PLACEHOLDERS.phoneSpaced}
							error={errors.phoneNo?.message}
							required
							{...register("phoneNo")}
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
							{...register("state")}
						/>
						<FormInput
							id="city"
							label={f.city}
							placeholder={FORM_PLACEHOLDERS.selectCity}
							error={errors.city?.message}
							required
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
							{...register("country")}
						/>
						<FormInput
							id="zip"
							label={f.zipPostalCode}
							placeholder={FORM_PLACEHOLDERS.enterZipPostalCode}
							error={errors.zip?.message}
							required
							{...register("zip")}
						/>
					</div>
				</CollapsibleCard>

				<CollapsibleCard title={c.cards.companyAdmin}>
					<div
						className={cn(
							"flex items-center gap-2",
							isEditMode && "opacity-90",
						)}
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
										field.onChange(checked);
										const opts = { shouldValidate: true };
										if (checked && corporationDetail?.corporationAdminAppUser) {
											const admin = corporationDetail.corporationAdminAppUser;
											setValue("firstName", admin.firstName ?? "", opts);
											setValue("lastName", admin.lastName ?? "", opts);
											setValue("nickname", admin.nickname ?? "", opts);
											setValue("jobRole", admin.jobRole ?? "", opts);
											setValue("email", admin.email ?? "", opts);
											setValue("workPhone", admin.workPhone ?? "", opts);
											setValue("cellPhone", admin.cellPhone ?? "", opts);
										} else if (!checked) {
											setValue("firstName", "", opts);
											setValue("lastName", "", opts);
											setValue("nickname", "", opts);
											setValue("jobRole", "", opts);
											setValue("email", "", opts);
											setValue("workPhone", "", opts);
											setValue("cellPhone", "", opts);
										}
									}}
									aria-label={ADD_NEW_CORPORATION_CONTENT.sameAsCorpAdminLabel}
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
							{ADD_NEW_CORPORATION_CONTENT.sameAsCorpAdminLabel}
						</Label>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormInput
							id="firstName"
							label={f.firstName}
							placeholder={FORM_PLACEHOLDERS.firstNameMike}
							error={errors.firstName?.message}
							required
							disabled={sameAsCorpAdmin}
							{...register("firstName")}
						/>
						<FormInput
							id="lastName"
							label={f.lastName}
							placeholder={FORM_PLACEHOLDERS.lastNameDavis}
							error={errors.lastName?.message}
							required
							disabled={sameAsCorpAdmin}
							{...register("lastName")}
						/>
						<FormInput
							id="nickname"
							label={f.nickname}
							placeholder={FORM_PLACEHOLDERS.nicknameMd}
							error={errors.nickname?.message}
							disabled={sameAsCorpAdmin}
							{...register("nickname")}
						/>
						<FormInput
							id="jobRole"
							label={f.jobRole}
							placeholder={FORM_PLACEHOLDERS.jobRoleHrManager}
							error={errors.jobRole?.message}
							required
							disabled={sameAsCorpAdmin}
							{...register("jobRole")}
						/>
						<FormInput
							id="email"
							label={f.email}
							type="email"
							placeholder={FORM_PLACEHOLDERS.emailMikeDavis}
							autoComplete="email"
							error={errors.email?.message}
							required
							disabled={sameAsCorpAdmin || isEditMode}
							{...register("email")}
						/>
						<FormInput
							id="workPhone"
							label={f.workPhoneNo}
							placeholder={FORM_PLACEHOLDERS.phoneSpaced}
							error={errors.workPhone?.message}
							required
							disabled={sameAsCorpAdmin}
							{...register("workPhone")}
						/>
						<FormInput
							id="cellPhone"
							label={f.cellPhoneNo}
							placeholder={FORM_PLACEHOLDERS.phoneSpaced}
							error={errors.cellPhone?.message}
							disabled={sameAsCorpAdmin}
							{...register("cellPhone")}
						/>
					</div>
				</CollapsibleCard>
			</div>
		</form>
	);
}

export function CompanyInfoStep({
	onSuccess,
	onApiError,
	corporationDetail,
	isLoadingDetail,
}: CompanyInfoStepProps) {
	if (isLoadingDetail && !corporationDetail) {
		return (
			<p className="text-small text-muted-foreground">
				{ADD_NEW_CORPORATION_CONTENT.loadingDetail}
			</p>
		);
	}
	return (
		<CompanyInfoFormInner
			key={corporationDetail?.id ?? "new"}
			corporationDetail={corporationDetail ?? undefined}
			onSuccess={onSuccess}
			onApiError={onApiError}
		/>
	);
}
