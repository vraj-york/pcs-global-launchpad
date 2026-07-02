import * as yup from "yup";
import { ROLES_PAGE_CONTENT } from "@/const";

export const roleFormSchema = yup.object().shape({
	name: yup
		.string()
		.transform((value) => (typeof value === "string" ? value.trim() : value))
		.required(ROLES_PAGE_CONTENT.roleNameRequired)
		.test("not-empty", ROLES_PAGE_CONTENT.roleNameRequired, (value) => {
			return value != null && (value as string).trim() !== "";
		}),
	categoryId: yup
		.string()
		.required(ROLES_PAGE_CONTENT.categoryRequired)
		.test("not-empty", ROLES_PAGE_CONTENT.categoryRequired, (value) => {
			return value != null && (value as string).trim() !== "";
		}),
	description: yup
		.string()
		.transform((value) => (typeof value === "string" ? value.trim() : value))
		.required(ROLES_PAGE_CONTENT.descriptionRequired)
		.test("not-empty", ROLES_PAGE_CONTENT.descriptionRequired, (value) => {
			return value != null && (value as string).trim() !== "";
		}),
	isPrivate: yup.boolean().default(false),
	isExternal: yup.boolean().default(false),
	submoduleIds: yup
		.array()
		.of(yup.string().required())
		.min(1, ROLES_PAGE_CONTENT.atLeastOneSubmodule)
		.required(ROLES_PAGE_CONTENT.atLeastOneSubmodule),
});

export type RoleFormSchemaType = yup.InferType<typeof roleFormSchema>;
