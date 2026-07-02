import * as yup from "yup";
import {
	optionalPersonName,
	requiredEmail,
	requiredPersonName,
	requiredString,
	validatePhone,
} from "@/utils";

export const inviteUserFormSchema = yup.object().shape({
	firstName: requiredPersonName("First name"),
	lastName: requiredPersonName("Last name"),
	nickname: optionalPersonName(),
	email: requiredEmail("Email"),
	workPhone: validatePhone().required("Work Phone No. is required"),
	cellPhone: validatePhone().optional(),
	timezone: requiredString("Time zone"),
	corporationId: requiredString("Corporation"),
	companyId: requiredString("Company"),
	categoryId: requiredString("Category"),
	roleId: requiredString("Role name"),
	teamId: yup.string().optional().default(""),
});

export type InviteUserFormSchemaType = yup.InferType<
	typeof inviteUserFormSchema
>;
