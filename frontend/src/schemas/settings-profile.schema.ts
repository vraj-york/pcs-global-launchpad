import * as yup from "yup";
import { optionalPersonName, requiredString, validatePhone } from "@/utils";

export const settingsProfileFormSchema = yup.object().shape({
	nickname: optionalPersonName(),
	workPhone: validatePhone().required("Work Phone No. is required"),
	cellPhone: validatePhone().optional(),
	timezone: requiredString("Time zone"),
});

export type SettingsProfileFormSchemaType = yup.InferType<
	typeof settingsProfileFormSchema
>;
