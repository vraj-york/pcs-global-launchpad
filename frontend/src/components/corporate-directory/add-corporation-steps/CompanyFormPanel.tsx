import { yupResolver } from "@hookform/resolvers/yup";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { getPricingPlans } from "@/api";
import {
	AddressAutocomplete,
	CollapsibleCard,
	FormInput,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { CompanyFormPanelProps, PricingPlanType } from "@/types";
import {
	findIndividualPricingPlanLevel,
	formatPlanEmployeeRange,
} from "@/utils";

const COMPANY_SETUP = ADD_NEW_CORPORATION_CONTENT.advancedSteps.companySetup;
const c = COMPANY_INFO_CONTENT;
const f = c.fields;
const options = ADD_NEW_CORPORATION_DROPDOWN_OPTIONS;
const INDIVIDUAL_PLAN_LEVEL_DISPLAY_VALUE = "custom";

export function CompanyFormPanel({
	mode,
	company,
	corporationDetail,
	onBack,
	onDiscard,
	onSave,
}: CompanyFormPanelProps) {
	const isEdit = mode === "edit";
	const title = isEdit
		? COMPANY_SETUP.editCompany
		: COMPANY_SETUP.addNewCompany;
	const subtitle = isEdit
		? COMPANY_SETUP.editCompanySubtitle
		: COMPANY_SETUP.addNewCompanySubtitle;
	const saveLabel = isEdit
		? COMPANY_SETUP.saveAndUpdate
		: COMPANY_SETUP.saveAndAdd;

	const { corporationId, createCompany, updateCompany } =
		useCorporationsStore();
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

	const defaultValues: Partial<CreateCompanySchemaType> = useMemo(() => {
		const base = {
			legalName: "",
			companyType: "",
			officeType: "",
			region: options.regions[0].value,
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
		const region =
			corporationDetail?.dataResidencyRegion?.trim() ?? base.region;
		if (!company) return { ...base, region };
		return {
			...base,
			region,
			industry: company.industry?.trim() ?? base.industry,
			legalName: company.legalName ?? "",
			companyType: company.companyType ?? "",
			officeType: company.officeType ?? "",
			planId: company.planId ?? "",
			state: company.state ?? "",
			city: company.city ?? "",
			zip: company.zip ?? "",
			addressLine: company.addressLine ?? "",
			country: company.country ?? "",
			sameAsCorpAdmin: company.sameAsCorpAdmin ?? false,
			firstName: company.firstName ?? "",
			lastName: company.lastName ?? "",
			nickname: company.nickname ?? "",
			jobRole: company.jobRole ?? "",
			email: company.email ?? "",
			workPhone: company.workPhone ?? "",
			cellPhone: company.cellPhone ?? "",
			securityPosture: company.securityPosture ?? base.securityPosture,
			phoneNo: company.phoneNo ?? "",
		};
	}, [company, corporationDetail]);

	const {
		register,
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<CreateCompanySchemaType>({
		resolver: yupResolver(
			createCompanySchema,
		) as Resolver<CreateCompanySchemaType>,
		mode: "onChange",
		defaultValues,
	});

	const planTypeId = watch("planTypeId");
	const sameAsCorpAdmin = watch("sameAsCorpAdmin");
	const individualPlanLevel = useMemo(
		() => findIndividualPricingPlanLevel(pricingPlans),
		[pricingPlans],
	);
	const isIndividualPlan = planTypeId === "one_time";
	useEffect(() => {
		if (!company?.planId || pricingPlans.length === 0) return;
		const type = pricingPlans.find((t) =>
			t.plans.some((pl) => pl.id === company.planId),
		);
		if (type) setValue("planTypeId", type.id);
	}, [company?.planId, pricingPlans, setValue]);

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
		if (!corporationId) {
			onBack();
			return;
		}
		if (isEdit && company?.id) {
			const result = await updateCompany(
				corporationId,
				company.id,
				payload as Partial<CreateCompanySchemaType>,
			);
			if (result.ok) {
				toast.success(ADD_NEW_CORPORATION_CONTENT.toast.companyUpdated);
				onSave();
			}
		} else {
			const result = await createCompany(payload as CreateCompanySchemaType);
			if (result.ok) {
				toast.success(ADD_NEW_CORPORATION_CONTENT.toast.companyAdded);
				onSave();
			}
		}
	};

	return (
		<div className="flex w-full flex-col gap-4">
			<Button
				type="button"
				variant="outline"
				icon={ArrowLeft}
				onClick={onBack}
				className="w-fit"
				aria-label={COMPANY_SETUP.backToCompanies}
			>
				{COMPANY_SETUP.backToCompanies}
			</Button>

			<Card className="w-full border border-border bg-background" size="sm">
				<CardHeader className="mb-2 flex flex-col gap-1 pb-0">
					<CardTitle className="text-base font-semibold text-link">
						{title}
					</CardTitle>
					<p className="mt-0.5 text-sm font-normal text-muted-foreground">
						{subtitle}
					</p>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<form
						id="company-form-panel-form"
						onSubmit={handleSubmit(onSubmit)}
						className="flex flex-col gap-6"
					>
						<CollapsibleCard title={c.cards.companyDetails}>
							<FormInput
								id="company-form-legalName"
								label={f.companyLegalName}
								placeholder={FORM_PLACEHOLDERS.companyLegalNameIndia}
								error={errors.legalName?.message}
								required
								className="h-10"
								{...register("legalName")}
							/>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label
										htmlFor="company-form-companyType"
										className="text-small font-medium text-text-foreground"
									>
										<span className="text-destructive">*</span> {f.companyType}
									</Label>
									<Controller
										name="companyType"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													id="company-form-companyType"
													className="h-10 w-full"
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
										htmlFor="company-form-officeType"
										className="text-small font-medium text-text-foreground"
									>
										<span className="text-destructive">*</span> {f.officeType}
									</Label>
									<Controller
										name="officeType"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													id="company-form-officeType"
													className="h-10 w-full"
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
										htmlFor="company-form-region"
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
													id="company-form-region"
													className={`h-10 w-full ${errors.region ? "border-destructive" : ""}`}
												>
													<SelectValue
														placeholder={
															FORM_PLACEHOLDERS.selectOperatingRegion
														}
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
									{errors.region?.message && (
										<p className="text-mini text-destructive">
											{errors.region.message}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="company-form-industry"
										className="text-small font-medium text-text-foreground"
									>
										<span className="text-destructive">*</span> {f.industry}
									</Label>
									<Controller
										name="industry"
										control={control}
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger
													id="company-form-industry"
													className={`h-10 w-full ${errors.industry ? "border-destructive" : ""}`}
												>
													<SelectValue
														placeholder={FORM_PLACEHOLDERS.selectIndustry}
													/>
												</SelectTrigger>
												<SelectContent>
													{options.industries.map((industry) => (
														<SelectItem
															key={industry.value}
															value={industry.value}
														>
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
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="space-y-2">
									<Label
										htmlFor="company-form-planTypeId"
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
												<SelectTrigger
													id="company-form-planTypeId"
													className="h-10 w-full"
												>
													<SelectValue
														placeholder={FORM_PLACEHOLDERS.selectPlan}
													/>
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
										htmlFor="company-form-planId"
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
													id="company-form-planId"
													className={`h-10 w-full ${errors.planId ? "border-destructive" : ""}`}
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
														<SelectItem
															value={INDIVIDUAL_PLAN_LEVEL_DISPLAY_VALUE}
														>
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
										htmlFor="company-form-securityPosture"
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
													id="company-form-securityPosture"
													className={`h-10 w-full ${errors.securityPosture ? "border-destructive" : ""}`}
												>
													<SelectValue
														placeholder={
															FORM_PLACEHOLDERS.securityPostureStandard
														}
													/>
												</SelectTrigger>
												<SelectContent>
													{options.securityPostures.map((posture) => (
														<SelectItem
															key={posture.value}
															value={posture.value}
														>
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
									id="company-form-phoneNo"
									label={f.companyPhoneNo}
									placeholder={FORM_PLACEHOLDERS.phoneSpaced}
									error={errors.phoneNo?.message}
									required
									className="h-10"
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
									id="company-form-state"
									label={f.stateProvince}
									placeholder={FORM_PLACEHOLDERS.selectStateProvince}
									error={errors.state?.message}
									required
									className="h-10"
									{...register("state")}
								/>
								<FormInput
									id="company-form-city"
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
									id="company-form-country"
									label={f.country}
									placeholder={FORM_PLACEHOLDERS.selectCountry}
									error={errors.country?.message}
									required
									className="h-10"
									{...register("country")}
								/>
								<FormInput
									id="company-form-zip"
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
								className={cn(
									"flex items-center gap-2",
									isEdit && "opacity-90",
								)}
							>
								<Controller
									name="sameAsCorpAdmin"
									control={control}
									render={({ field }) => (
										<Checkbox
											id="company-form-sameAsCorpAdmin"
											checked={field.value}
											disabled={isEdit}
											onCheckedChange={(checked) => {
												if (isEdit) return;
												field.onChange(checked);
												const opts = { shouldValidate: true };
												if (
													checked &&
													corporationDetail?.corporationAdminAppUser
												) {
													const admin =
														corporationDetail.corporationAdminAppUser;
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
											aria-label={
												ADD_NEW_CORPORATION_CONTENT.sameAsCorpAdminLabel
											}
										/>
									)}
								/>
								<Label
									htmlFor="company-form-sameAsCorpAdmin"
									className={cn(
										"text-sm font-medium text-text-foreground",
										isEdit ? "cursor-not-allowed" : "cursor-pointer",
									)}
								>
									{ADD_NEW_CORPORATION_CONTENT.sameAsCorpAdminLabel}
								</Label>
							</div>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormInput
									id="company-form-firstName"
									label={f.firstName}
									placeholder={FORM_PLACEHOLDERS.firstNameMike}
									error={errors.firstName?.message}
									required
									className="h-10"
									disabled={sameAsCorpAdmin}
									{...register("firstName")}
								/>
								<FormInput
									id="company-form-lastName"
									label={f.lastName}
									placeholder={FORM_PLACEHOLDERS.lastNameDavis}
									error={errors.lastName?.message}
									required
									className="h-10"
									disabled={sameAsCorpAdmin}
									{...register("lastName")}
								/>
								<FormInput
									id="company-form-nickname"
									label={f.nickname}
									placeholder={FORM_PLACEHOLDERS.nicknameMd}
									error={errors.nickname?.message}
									className="h-10"
									disabled={sameAsCorpAdmin}
									{...register("nickname")}
								/>
								<FormInput
									id="company-form-jobRole"
									label={f.jobRole}
									placeholder={FORM_PLACEHOLDERS.jobRoleHrManager}
									error={errors.jobRole?.message}
									required
									className="h-10"
									disabled={sameAsCorpAdmin}
									{...register("jobRole")}
								/>
								<FormInput
									id="company-form-email"
									label={f.email}
									type="email"
									placeholder={FORM_PLACEHOLDERS.emailMikeDavis}
									required
									error={errors.email?.message}
									className="h-10"
									autoComplete="email"
									disabled={sameAsCorpAdmin || isEdit}
									{...register("email")}
								/>
								<FormInput
									id="company-form-workPhone"
									label={f.workPhoneNo}
									placeholder={FORM_PLACEHOLDERS.phoneSpaced}
									error={errors.workPhone?.message}
									required
									className="h-10"
									disabled={sameAsCorpAdmin}
									{...register("workPhone")}
								/>
								<FormInput
									id="company-form-cellPhone"
									label={f.cellPhoneNo}
									placeholder={FORM_PLACEHOLDERS.phoneSpaced}
									error={errors.cellPhone?.message}
									className="h-10"
									disabled={sameAsCorpAdmin}
									{...register("cellPhone")}
								/>
							</div>
						</CollapsibleCard>
					</form>
					<div className="flex shrink-0 justify-end gap-2 border-t border-border pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={onDiscard}
							className="border-border text-text-foreground"
						>
							{COMPANY_SETUP.cancel}
						</Button>
						<Button
							type="submit"
							form="company-form-panel-form"
							disabled={!corporationId || (isEdit && !isDirty)}
							isLoading={isSubmitting}
						>
							{saveLabel}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
