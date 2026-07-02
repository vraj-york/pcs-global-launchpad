import * as yup from "yup";
import { AUTH_VALIDATION_MESSAGES } from "@/const";
import {
	isValidEmailFormat,
	splitEmailInput,
	validateEmailParts,
} from "@/utils";

const emailMsg = AUTH_VALIDATION_MESSAGES.emailInvalid;

export const shareAssessmentReportFormSchema = yup.object({
	draftEmail: yup
		.string()
		.default("")
		.test("draft-emails", emailMsg, (value) => {
			const parts = splitEmailInput(value ?? "");
			if (parts.length === 0) {
				return true;
			}
			return validateEmailParts(parts);
		}),
	recipients: yup
		.array()
		.of(
			yup
				.string()
				.required(emailMsg)
				.test("share-report-email", emailMsg, (v) =>
					v != null && v !== "" ? isValidEmailFormat(v) : false,
				),
		)
		.max(20)
		.default([]),
});

export type ShareAssessmentReportFormValues = yup.InferType<
	typeof shareAssessmentReportFormSchema
>;
