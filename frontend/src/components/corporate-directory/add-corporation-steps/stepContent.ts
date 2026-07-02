import { ADD_NEW_CORPORATION_CONTENT } from "@/const/corporations/corporate-directory.const";
import { BasicInfoStep } from "./BasicInfoStep";
import { CompanyInfoStep } from "./CompanyInfoStep";
import { ConfirmationStep } from "./ConfirmationStep";

export const ADD_CORPORATION_STEP_CONTENT = [
	{
		title: ADD_NEW_CORPORATION_CONTENT.basicInfo.title,
		subtitle: ADD_NEW_CORPORATION_CONTENT.basicInfo.subtitle,
		component: BasicInfoStep,
	},
	{
		title: ADD_NEW_CORPORATION_CONTENT.companyInfo.title,
		subtitle: ADD_NEW_CORPORATION_CONTENT.companyInfo.subtitle,
		component: CompanyInfoStep,
	},
	{
		title: ADD_NEW_CORPORATION_CONTENT.confirmation.title,
		subtitle: ADD_NEW_CORPORATION_CONTENT.confirmation.subtitle,
		component: ConfirmationStep,
	},
] as const;

export const ADD_CORPORATION_STEP_CONTENT_ADVANCED = [
	{
		title: ADD_NEW_CORPORATION_CONTENT.basicInfo.title,
		subtitle: ADD_NEW_CORPORATION_CONTENT.basicInfo.subtitle,
	},
	{
		title: ADD_NEW_CORPORATION_CONTENT.advancedSteps.companySetup.title,
		subtitle: ADD_NEW_CORPORATION_CONTENT.advancedSteps.companySetup.subtitle,
	},
	{
		title: ADD_NEW_CORPORATION_CONTENT.advancedSteps.branding.title,
		subtitle: ADD_NEW_CORPORATION_CONTENT.advancedSteps.branding.subtitle,
	},
	{
		title: ADD_NEW_CORPORATION_CONTENT.advancedSteps.keyContact.title,
		subtitle: ADD_NEW_CORPORATION_CONTENT.advancedSteps.keyContact.subtitle,
	},
	{
		title: ADD_NEW_CORPORATION_CONTENT.advancedSteps.confirmation.title,
		subtitle: ADD_NEW_CORPORATION_CONTENT.advancedSteps.confirmation.subtitle,
	},
] as const;
