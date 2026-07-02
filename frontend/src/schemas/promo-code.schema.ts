import * as yup from "yup";
import { PROMO_CODE_FORM_VALIDATION_MESSAGES as V } from "@/const";

export const createPromoCodeSchema = yup.object({
	code: yup
		.string()
		.required(V.codeRequired)
		.min(2, V.codeMin)
		.max(50, V.codeMax),
	planTypeId: yup
		.string()
		.required(V.planRequired)
		.oneOf(["monthly", "annual", "one_time"], V.planOneOf),
	description: yup.string().optional().max(8000, V.descriptionMax),
	discountType: yup
		.mixed<"percent" | "fixed_amount">()
		.oneOf(["percent", "fixed_amount"])
		.required(),
	discountValue: yup
		.string()
		.required(V.discountRequired)
		.trim()
		.test("numeric", V.discountNumeric, (value) => {
			if (!value?.length) return false;
			const n = Number.parseFloat(value);
			return !Number.isNaN(n);
		})
		.when("discountType", {
			is: "percent",
			then: (schema) =>
				schema.test("percent-range", V.discountPercentRange, (value) => {
					if (!value?.length) return false;
					const n = Number.parseFloat(value);
					return !Number.isNaN(n) && n >= 0.01 && n <= 100;
				}),
			otherwise: (schema) =>
				schema.test("fixed-positive", V.discountFixedPositive, (value) => {
					if (!value?.length) return false;
					const n = Number.parseFloat(value);
					return !Number.isNaN(n) && n > 0;
				}),
		}),
	duration: yup
		.mixed<"once" | "forever">()
		.oneOf(["once", "forever"])
		.required(),
	expiresAt: yup
		.string()
		.optional()
		.test("future", V.expiryFuture, (value) => {
			if (!value?.trim()) return true;
			const d = new Date(value);
			if (Number.isNaN(d.getTime())) return false;
			return d.getTime() > Date.now();
		}),
	maxRedemptions: yup
		.string()
		.optional()
		.test("positiveInt", V.maxRedemptionsInt, (value) => {
			if (!value?.trim()) return true;
			const n = Number.parseInt(value, 10);
			return !Number.isNaN(n) && n >= 1;
		}),
	limitToAssignment: yup.boolean().default(false),
	corporationId: yup.string().when("limitToAssignment", {
		is: true,
		then: (schema) =>
			schema.required(V.corporationRequired).min(1, V.corporationSelect),
		otherwise: (schema) => schema.optional(),
	}),
	companyId: yup.string().optional(),
});

export type CreatePromoCodeFormValues = {
	code: string;
	planTypeId: "" | "monthly" | "annual" | "one_time";
	description?: string;
	discountType: "percent" | "fixed_amount";
	discountValue: string;
	duration: "once" | "forever";
	expiresAt?: string;
	maxRedemptions?: string;
	limitToAssignment: boolean;
	corporationId?: string;
	companyId?: string;
};

export const createPromoCodeFormDefaultValues: CreatePromoCodeFormValues = {
	code: "",
	planTypeId: "",
	description: "",
	discountType: "percent",
	discountValue: "",
	duration: "once",
	expiresAt: "",
	maxRedemptions: "",
	limitToAssignment: false,
	corporationId: "",
	companyId: "",
};
