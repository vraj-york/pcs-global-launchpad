import type { CompanyDetailsContentProps } from "@/types";
import {
	CompanyViewBasicInfoTab,
	CompanyViewBrandingTab,
	CompanyViewConfigurationTab,
	CompanyViewKeyContactsTab,
	CompanyViewPlanSeatsTab,
} from "./ViewCompanyDetailSections";

export function CompanyDetailsContent({
	company,
	activeTab,
}: CompanyDetailsContentProps) {
	if (activeTab === "basic") {
		return <CompanyViewBasicInfoTab company={company} />;
	}

	if (activeTab === "keyContacts") {
		return <CompanyViewKeyContactsTab company={company} />;
	}

	if (activeTab === "planSeats") {
		return <CompanyViewPlanSeatsTab company={company} />;
	}

	if (activeTab === "branding") {
		return <CompanyViewBrandingTab company={company} />;
	}

	if (activeTab === "configuration") {
		return <CompanyViewConfigurationTab company={company} />;
	}

	return null;
}
