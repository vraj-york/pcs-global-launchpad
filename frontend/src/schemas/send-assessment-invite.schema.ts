import * as yup from "yup";
import { INVITE_MANAGEMENT_PAGE_CONTENT } from "@/const";
import {
	optionalPersonName,
	requiredEmail,
	requiredPersonName,
	requiredString,
	validatePhone,
} from "@/utils";

export const sendAssessmentInviteFormSchema = yup.object().shape({
	firstName: requiredPersonName("First name"),
	lastName: requiredPersonName("Last name"),
	nickname: optionalPersonName(),
	email: requiredEmail("Email"),
	workPhone: validatePhone().required("Work Phone No. is required"),
	cellPhone: validatePhone().optional(),
	timezone: requiredString("Time zone"),
	inviteeType: requiredString(
		INVITE_MANAGEMENT_PAGE_CONTENT.errInviteeTypeRequired,
	),
	hasPromoCode: yup.boolean().default(false),
	promoCodeId: yup.string().when("hasPromoCode", {
		is: true,
		then: () =>
			requiredString(INVITE_MANAGEMENT_PAGE_CONTENT.errPromoCodeRequired),
		otherwise: (schema) => schema.optional().default(""),
	}),
});

export type SendAssessmentInviteFormSchemaType = yup.InferType<
	typeof sendAssessmentInviteFormSchema
>;
