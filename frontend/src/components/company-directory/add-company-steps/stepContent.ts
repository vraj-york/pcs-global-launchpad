import { ADD_NEW_COMPANY_CONTENT } from "@/const/companies/company-directory.const";
import { BasicInfoStep } from "./BasicInfoStep";
import { CompanyConfirmationStep } from "./CompanyConfirmationStep";
import { ConfigurationStep } from "./ConfigurationStep";
import { KeyContactsStep } from "./KeyContactsStep";
import { PlanAndSeatsStep } from "./PlanAndSeatsStep";

export const ADD_COMPANY_STEP_CONTENT = [
	{
		title: ADD_NEW_COMPANY_CONTENT.basicInfo.title,
		subtitle: ADD_NEW_COMPANY_CONTENT.basicInfo.subtitle,
		component: BasicInfoStep,
	},
	{
		title: ADD_NEW_COMPANY_CONTENT.keyContacts.title,
		subtitle: ADD_NEW_COMPANY_CONTENT.keyContacts.subtitle,
		component: KeyContactsStep,
	},
	{
		title: ADD_NEW_COMPANY_CONTENT.planAndSeats.title,
		subtitle: ADD_NEW_COMPANY_CONTENT.planAndSeats.subtitle,
		component: PlanAndSeatsStep,
	},
	{
		title: ADD_NEW_COMPANY_CONTENT.configuration.title,
		subtitle: ADD_NEW_COMPANY_CONTENT.configuration.subtitle,
		component: ConfigurationStep,
	},
	{
		title: ADD_NEW_COMPANY_CONTENT.confirmation.title,
		subtitle: ADD_NEW_COMPANY_CONTENT.confirmation.subtitle,
		component: CompanyConfirmationStep,
	},
] as const;
