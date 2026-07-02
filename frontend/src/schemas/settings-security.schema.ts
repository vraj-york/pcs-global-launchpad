import * as yup from "yup";
import { AUTH_VALIDATION_MESSAGES } from "@/const";
import { requiredString } from "@/utils";

export const settingsChangePasswordSchema = yup.object().shape({
	currentPassword: requiredString("Current password"),
	newPassword: requiredString("New password"),
	confirmPassword: requiredString("Confirm password").oneOf(
		[yup.ref("newPassword")],
		AUTH_VALIDATION_MESSAGES.passwordsDoNotMatch,
	),
});

export type SettingsChangePasswordSchemaType = yup.InferType<
	typeof settingsChangePasswordSchema
>;
