import * as yup from "yup";
import { INVITE_USER_TYPE } from "@/const";
import {
	optionalPersonName,
	requiredPersonName,
	requiredString,
	validatePhone,
} from "@/utils";

export const editUserFormSchema = yup.object().shape({
	status: requiredString("Status"),
	firstName: requiredPersonName("First name"),
	lastName: requiredPersonName("Last name"),
	nickname: optionalPersonName(),
	workPhone: validatePhone().required("Work Phone No. is required"),
	cellPhone: validatePhone().optional(),
	timezone: requiredString("Time zone"),
	inviteType: yup.string().optional().default(""),
	categoryId: yup.string().when("inviteType", {
		is: INVITE_USER_TYPE.assessmentOnly,
		then: (schema) => schema.optional().default(""),
		otherwise: () => requiredString("Category"),
	}),
	roleId: yup.string().when("inviteType", {
		is: INVITE_USER_TYPE.assessmentOnly,
		then: (schema) => schema.optional().default(""),
		otherwise: () => requiredString("Role"),
	}),
});

export type EditUserFormSchemaType = yup.InferType<typeof editUserFormSchema>;
