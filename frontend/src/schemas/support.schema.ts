import * as yup from "yup";
import {
	SUPPORT_MESSAGE_MAX_LENGTH,
	SUPPORT_VALIDATION_MESSAGES,
} from "@/const";
import { requiredEmail, requiredString } from "@/utils";

export const supportRequestSchema = yup.object().shape({
	email: requiredEmail("Email"),
	subject: requiredString("Subject"),
	message: yup
		.string()
		.max(
			SUPPORT_MESSAGE_MAX_LENGTH,
			SUPPORT_VALIDATION_MESSAGES.messageMaxLength,
		)
		.default(""),
});

export type SupportRequestSchemaType = yup.InferType<
	typeof supportRequestSchema
>;
