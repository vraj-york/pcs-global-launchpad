import * as yup from "yup";
import {
	ADD_NEW_COMPANY_CONFIGURATION_OPTIONS,
	ADD_NEW_COMPANY_CONTENT,
	BRAND_LOGO_ALLOWED_TYPES,
	BRAND_LOGO_MAX_SIZE_BYTES,
	COMPANY_SUSPEND_VALIDATION,
	CORPORATION_VALIDATION_MESSAGES,
	ONSITE_TRAINING_API_VALUES,
} from "@/const";
import type { CompanyDetailData } from "@/types/companies/company-api.types";
import {
	optionalJobRole,
	optionalPersonName,
	requiredEmail,
	requiredJobRole,
	requiredPersonName,
	requiredString,
	requiredZipNumeric,
	validateFile,
	validatePhone,
} from "@/utils";

const companyKeyContactSectionSchema = yup.object().shape({
	available: yup.boolean().default(false),
	firstName: yup.string().when("available", {
		is: true,
		then: () => requiredPersonName("First name"),
		otherwise: () => optionalPersonName(),
	}),
	lastName: yup.string().when("available", {
		is: true,
		then: () => requiredPersonName("Last name"),
		otherwise: () => optionalPersonName(),
	}),
	nickname: optionalPersonName(),
	jobRole: yup.string().when("available", {
		is: true,
		then: () => requiredJobRole("Job role"),
		otherwise: () => optionalJobRole(),
	}),
	email: yup.string().when("available", {
		is: true,
		then: () => requiredEmail("Email"),
		otherwise: (s) => s.optional().default(""),
	}),
	workPhone: yup.string().when("available", {
		is: true,
		then: () => validatePhone().required("Work phone is required"),
		otherwise: (s) => s.optional().default(""),
	}),
	cellPhone: validatePhone().optional().default(""),
});

const defaultSection = {
	available: false,
	firstName: "",
	lastName: "",
	nickname: "",
	jobRole: "",
	email: "",
	workPhone: "",
	cellPhone: "",
};

export const companyKeyContactsSchema = yup.object().shape({
	finance_billing_contact:
		companyKeyContactSectionSchema.default(defaultSection),
	technical_it_lead: companyKeyContactSectionSchema.default(defaultSection),
	implementation_lead: companyKeyContactSectionSchema.default(defaultSection),
	hr_program_owner: companyKeyContactSectionSchema.default(defaultSection),
});

export type CompanyKeyContactsSchemaType = yup.InferType<
	typeof companyKeyContactsSchema
>;

export const addCompanyBasicInfoSchema = yup.object().shape({
	parentCorporationId: requiredString("Parent Corporation Legal Name"),
	ownershipType: requiredString("Ownership Type"),
	legalName: requiredString("Company Legal Name"),
	dbaTradeName: yup
		.string()
		.optional()
		.default("")
		.max(100, "Maximum 100 characters are allowed"),
	websiteUrl: yup
		.string()
		.optional()
		.default("")
		.test(
			"url",
			CORPORATION_VALIDATION_MESSAGES.url,
			(value) =>
				!value ||
				String(value).trim() === "" ||
				yup
					.string()
					.url(CORPORATION_VALIDATION_MESSAGES.url)
					.isValidSync(value),
		),
	companyType: requiredString("Company Type"),
	officeType: requiredString("Office Type"),
	region: requiredString("Region (Data Residency)"),
	industry: requiredString("Industry"),
	companyPhoneNo: validatePhone().required("Company Phone No. is required"),
	addressLine: requiredString("Address Line"),
	state: requiredString("State/ Province"),
	city: requiredString("City"),
	country: requiredString("Country"),
	zip: requiredZipNumeric("ZIP/ Postal Code"),
	sameAsCorpAdmin: yup.boolean().default(false),
	firstName: requiredPersonName("First Name"),
	lastName: requiredPersonName("Last Name"),
	nickname: optionalPersonName(),
	jobRole: requiredJobRole("Job Role"),
	email: requiredEmail("Email"),
	workPhone: validatePhone().required("Work Phone No. is required"),
	cellPhone: validatePhone().optional(),
});

export type AddCompanyBasicInfoSchemaType = yup.InferType<
	typeof addCompanyBasicInfoSchema
>;

const psPlanSeatsVal = ADD_NEW_COMPANY_CONTENT.planAndSeats.validation;
const trialStartDateInvalid = psPlanSeatsVal.trialStartDateInvalid;

function isValidIsoDateString(value: string | undefined): boolean {
	if (!value || !value.trim()) return false;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
	const t = Date.parse(value.trim());
	return !Number.isNaN(t);
}

/** Plan & Seats step — validates the active plan-type tab only */
export const addCompanyPlanAndSeatsSchema = yup.object().shape({
	activePlanTypeId: requiredString("Plan type"),
	zeroTrial: yup.boolean().default(false),
	trialLength: yup.string().default("14"),
	trialStartDate: yup.string().when(["activePlanTypeId", "zeroTrial"], {
		is: (activePlanTypeId: string, zeroTrial: boolean) =>
			activePlanTypeId === "monthly" && !zeroTrial,
		then: () =>
			requiredString("Trial start date").test(
				"iso-date",
				trialStartDateInvalid,
				(v) => isValidIsoDateString(v),
			),
		otherwise: (schema) => schema.optional().default(""),
	}),
	companyPlanCount: yup.number().default(0),
	hasPromoCode: yup.boolean().default(false),
	promoCode: yup.string().when("hasPromoCode", {
		is: true,
		then: () =>
			requiredString(psPlanSeatsVal.selectPromoCode).max(
				50,
				psPlanSeatsVal.promoCodeMaxLength,
			),
		otherwise: (s) => s.optional().default(""),
	}),
	selectedPlanId: yup.string().when(["activePlanTypeId", "companyPlanCount"], {
		is: (activePlanTypeId: string, companyPlanCount: number) =>
			activePlanTypeId !== "one_time" && (companyPlanCount ?? 0) > 0,
		then: () => requiredString("Plan level"),
		otherwise: (s) => s.optional().default(""),
	}),
	planPriceLimit: yup.number().default(0),
	discount: yup
		.string()
		.optional()
		.default("")
		.test("discount", function (value) {
			const raw =
				value === undefined || value === null ? "" : String(value).trim();
			if (raw === "") return true;
			const num = Number.parseFloat(raw);
			if (Number.isNaN(num)) {
				return this.createError({
					message: psPlanSeatsVal.discountInvalidAmount,
				});
			}
			if (num < 0) {
				return this.createError({
					message: psPlanSeatsVal.discountInvalidAmount,
				});
			}
			if (num === 0) return true;
			const limit =
				(this.parent as { planPriceLimit?: number }).planPriceLimit ?? 0;
			if (num > limit) {
				return this.createError({
					message: psPlanSeatsVal.discountExceedsPlanPrice,
				});
			}
			return true;
		}),
	billingCurrency: yup.string().required().default("usd"),
	onsiteTrainingOption: yup
		.string()
		.oneOf([...ONSITE_TRAINING_API_VALUES])
		.default("off"),
});

export type AddCompanyPlanAndSeatsSchemaType = yup.InferType<
	typeof addCompanyPlanAndSeatsSchema
>;

const cfgGeneral = ADD_NEW_COMPANY_CONTENT.configuration.generalSettings;
const cfgBranding = ADD_NEW_COMPANY_CONTENT.configuration.branding;
const cfgOptions = ADD_NEW_COMPANY_CONFIGURATION_OPTIONS;

export const addCompanyConfigurationSchema = yup.object({
	authMethod: requiredString(cfgGeneral.authenticationMethod).oneOf(
		cfgOptions.authenticationMethods.map((o) => o.value),
	),
	passwordPolicy: requiredString(cfgGeneral.passwordPolicy).oneOf(
		cfgOptions.passwordPolicies.map((o) => o.value),
	),
	mfa: requiredString(cfgGeneral.twoFaRequirement).oneOf(
		cfgOptions.twoFaRequirements.map((o) => o.value),
	),
	primaryLanguage: requiredString(cfgGeneral.primaryLanguage).oneOf(
		cfgOptions.primaryLanguages.map((o) => o.value),
	),
	sessionTimeout: requiredString(cfgGeneral.sessionTimeout).oneOf(
		cfgOptions.sessionTimeouts.map((o) => o.value),
	),
	securityPosture: requiredString(cfgGeneral.securityPosture).oneOf(
		cfgOptions.securityPostures.map((o) => o.value),
	),
	logo: yup
		.mixed()
		.nullable()
		.optional()
		.test("logo-file", function (value) {
			if (value == null) return true;
			if (!(value instanceof File)) return true;
			const err = validateFile(value, {
				maxSizeBytes: BRAND_LOGO_MAX_SIZE_BYTES,
				allowedMimeTypes: BRAND_LOGO_ALLOWED_TYPES,
				messageUnsupportedFormat: cfgBranding.errors.unsupportedFormat,
				messageFileTooLarge: cfgBranding.errors.fileTooLarge,
			});
			if (err) {
				return this.createError({ message: err });
			}
			return true;
		}),
});

export type AddCompanyConfigurationSchemaType = yup.InferType<
	typeof addCompanyConfigurationSchema
>;

export function getAddCompanyConfigurationDefaultValues(): AddCompanyConfigurationSchemaType {
	return {
		authMethod: cfgOptions.authenticationMethods[0].value,
		passwordPolicy: cfgOptions.passwordPolicies[0].value,
		mfa: cfgOptions.twoFaRequirements[0].value,
		primaryLanguage: cfgOptions.primaryLanguages[0].value,
		sessionTimeout: cfgOptions.sessionTimeouts[0].value,
		securityPosture: cfgOptions.securityPostures[0].value,
		logo: null,
	};
}

/** Prefill Configuration step from GET company `configuration` when present (edit / resume). */
export function getAddCompanyConfigurationValuesFromCompanyDetail(
	companyDetail: CompanyDetailData | null | undefined,
): AddCompanyConfigurationSchemaType {
	const base = getAddCompanyConfigurationDefaultValues();
	const c = companyDetail?.configuration;
	if (!c) return base;

	return {
		authMethod: c.authMethod ?? base.authMethod,
		passwordPolicy: c.passwordPolicy ?? base.passwordPolicy,
		mfa: c.mfa ?? base.mfa,
		sessionTimeout: c.sessionTimeout ?? base.sessionTimeout,
		securityPosture: c.securityPosture ?? base.securityPosture,
		primaryLanguage: c.primaryLanguage ?? base.primaryLanguage,
		logo: null,
	} as AddCompanyConfigurationSchemaType;
}

/** Suspend company action modal form */
export const companySuspendFormSchema = yup.object().shape({
	reason: yup
		.string()
		.required(COMPANY_SUSPEND_VALIDATION.reasonRequired)
		.trim(),
	notes: yup
		.string()
		.default("")
		.when("reason", {
			is: "Other",
			then: (schema) => schema.required("Additional notes are required").trim(),
			otherwise: (schema) => schema.optional().trim(),
		}),
});

export type CompanySuspendFormSchemaType = yup.InferType<
	typeof companySuspendFormSchema
>;
