import * as yup from "yup";
import { AUTH_VALIDATION_MESSAGES } from "@/const";
import { requiredEmail, requiredString } from "@/utils";

export const loginSchema = yup.object().shape({
	email: requiredEmail("Email"),
	password: requiredString("Password"),
});

export type LoginSchemaType = yup.InferType<typeof loginSchema>;

export const forgotPasswordSchema = yup.object().shape({
	email: requiredEmail("Email"),
});

export type ForgotPasswordSchemaType = yup.InferType<
	typeof forgotPasswordSchema
>;

export const setNewPasswordSchema = yup.object().shape({
	password: requiredString("Password"),
	confirmPassword: requiredString("Confirm password").oneOf(
		[yup.ref("password")],
		AUTH_VALIDATION_MESSAGES.passwordsDoNotMatch,
	),
});

export type SetNewPasswordSchemaType = yup.InferType<
	typeof setNewPasswordSchema
>;

/**
 * First-login Cognito new-password challenge: same Yup shape as forgot-password flow.
 * Strength (strong / bar) is enforced in `LoginNewPasswordChallengeForm`, matching `SetNewPasswordForm`.
 */
export const cognitoNewPasswordChallengeSchema = setNewPasswordSchema;

export type CognitoNewPasswordChallengeSchemaType = SetNewPasswordSchemaType;
