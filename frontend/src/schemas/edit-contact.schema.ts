import * as yup from "yup";
import {
	optionalJobRole,
	optionalPersonName,
	requiredEmail,
	requiredPersonName,
	requiredString,
	validatePhone,
} from "@/utils";

export const editContactFormSchema = yup.object().shape({
	firstName: requiredPersonName("First name"),
	lastName: requiredPersonName("Last name"),
	nickname: optionalPersonName(),
	email: requiredEmail("Email"),
	workPhone: validatePhone().required("Work Phone No. is required"),
	cellPhone: validatePhone().optional(),
	timezone: yup.string().optional().default(""),
	corporationId: yup.string().optional().default(""),
	companyId: yup.string().optional().default(""),
	contactType: requiredString("Contact type"),
	jobRole: optionalJobRole(),
});

export type EditContactFormSchemaType = yup.InferType<
	typeof editContactFormSchema
>;
