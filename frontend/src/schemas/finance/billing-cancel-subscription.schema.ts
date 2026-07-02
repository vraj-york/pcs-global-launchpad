import * as yup from "yup";
import { BILLING_CANCEL_SUBSCRIPTION_VALIDATION } from "@/const";

export const billingCancelSubscriptionFormSchema = yup.object().shape({
	reason: yup
		.string()
		.required(BILLING_CANCEL_SUBSCRIPTION_VALIDATION.reasonRequired)
		.trim(),
	notes: yup
		.string()
		.default("")
		.when("reason", {
			is: "Other",
			then: (schema) =>
				schema
					.required(BILLING_CANCEL_SUBSCRIPTION_VALIDATION.notesRequired)
					.trim(),
			otherwise: (schema) => schema.optional().trim(),
		}),
});

export type BillingCancelSubscriptionFormSchemaType = yup.InferType<
	typeof billingCancelSubscriptionFormSchema
>;
