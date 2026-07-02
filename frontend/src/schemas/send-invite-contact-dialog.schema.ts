import * as yup from "yup";
import { requiredString } from "@/utils";

export const sendInviteContactDialogSchema = yup.object().shape({
	categoryId: requiredString("Category"),
	roleId: requiredString("Role name"),
});

export type SendInviteContactDialogSchemaType = yup.InferType<
	typeof sendInviteContactDialogSchema
>;
