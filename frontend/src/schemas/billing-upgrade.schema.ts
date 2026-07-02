import * as yup from "yup";

export type BillingUpgradeFormValues = {
	planTypeId: string;
	targetPricingPlanId: string;
};

export const billingUpgradeFormDefaultValues: BillingUpgradeFormValues = {
	planTypeId: "",
	targetPricingPlanId: "",
};

export const billingUpgradeSchema = yup.object({
	planTypeId: yup.string().trim().required("Plan is required"),
	targetPricingPlanId: yup.string().trim().required("Plan level is required"),
});
