import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import type {
	CorporationDetail,
	CorporationDetailCompany,
} from "./corporation-api.types";

export type CorporationStatus =
	| "active"
	| "suspended"
	| "closed"
	| "incomplete";

export type Corporation = {
	id: string;
	corpId: string;
	name: string;
	region: string;
	status: CorporationStatus;
	corporationAdmin: {
		name: string;
		email: string;
	};
	companies: number;
	createdOn: string;
	mode?: string;
	submittedSteps?: number;
};

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export type AddCorporationMode = "quick" | "advanced";

export type ViewCorporationTabId =
	| "basic"
	| "companies"
	| "branding"
	| "contacts";

export type ViewCorporationViewerRole = "superAdmin" | "corporationAdmin";

export type ViewCorporationContentProps = {
	corporation: CorporationDetail;
	onEditModeChange?: (isEditMode: boolean) => void;
	initialEditMode?: boolean;
	viewerRole?: ViewCorporationViewerRole;
	directoryBack?: { path: string; label: string } | null;
};

export type CorporationEditContentProps = {
	corporation: CorporationDetail;
	activeTab: ViewCorporationTabId;
	onCancelEdit: () => void;
};

export type CorporationDetailsContentProps = {
	corporation: CorporationDetail;
	activeTab: ViewCorporationTabId;
	formatCorpId: (code: number) => string;
	/** When set, Companies tab shows company detail view with this company selected */
	selectedCompanyId?: string | null;
	/** Called when user clicks a company card (navigate to detail with company selected) */
	onCompanyClick?: (companyId: string) => void;
	/** Called when user clicks "Back to Companies" on company detail view */
	onBackToCompanies?: () => void;
};

export type ViewCompanyDetailContentProps = {
	corporationId: string;
	initialCompanyId: string | null;
	onBackToCompanies: () => void;
};

export type ViewCorporationCompaniesTabProps = {
	corporationId: string;
	onCompanyClick?: (companyId: string) => void;
};

export type BasicInfoStepProps = {
	mode?: AddCorporationMode;
	onSuccess: (corporationId: string) => void;
	onApiError?: (message: string) => void;
	corporationDetail?: CorporationDetail | null;
	isLoadingDetail?: boolean;
};

export type CompanyInfoStepProps = {
	onSuccess?: () => void;
	onApiError?: (message: string) => void;
	corporationDetail?: CorporationDetail | null;
	isLoadingDetail?: boolean;
};

export type ConfirmationFieldValues = {
	corporationLegalName: string;
	dbaName: string;
	region: string;
	industry: string;
	corporatePhoneNo: string;
	websiteUrl: string;
	ownershipType: string;
	address: string;
	timeZone: string;
	executiveSponsorFullName: string;
	executiveSponsorNickname: string;
	executiveSponsorJobRole: string;
	email: string;
	workPhoneNo: string;
	cellPhoneNo: string;
	companyLegalName: string;
	companyType: string;
	officeType: string;
	companyIndustry: string;
	stateProvince: string;
	city: string;
	zipPostalCode: string;
	adminFullName: string;
	adminNickname: string;
	companyAdminEmail: string;
	noOfEmployees: string;
	securityPosture: string;
	companyPhoneNo: string;
};

export type BrandingStepProps = {
	corporationId: string;
	corporationDetail?: CorporationDetail | null;
	isLoadingDetail?: boolean;
};

export type ConfirmationStepProps = {
	corporationDetail?: CorporationDetail | null;
	isLoadingDetail?: boolean;
	flow?: AddCorporationMode;
};

export type KeyContactsStepProps = {
	corporationDetail?: CorporationDetail | null;
	isLoadingDetail?: boolean;
	onSuccess?: () => void;
};

export type CompanyFormPanelMode = "add" | "edit";

export type CompanyFormPanelProps = {
	mode: CompanyFormPanelMode;
	company?: CorporationDetailCompany | null;
	corporationDetail?: CorporationDetail | null;
	onBack: () => void;
	onDiscard: () => void;
	onSave: () => void;
};

export type CompanySetupStepProps = {
	corporationDetail?: CorporationDetail | null;
	onAddCompany?: () => void;
	onEditCompany?: (companyId: string) => void;
	onDeleteCompany?: (companyId: string) => void;
	deletingCompanyId?: string | null;
	isLoadingCompanies?: boolean;
	onFormPanelOpenChange?: (open: boolean) => void;
};

export type CorporationActionType = "suspend" | "close";

export type CorporationActionModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	action: CorporationActionType;
	corporationName: string;
	onConfirm: (
		action: CorporationActionType,
		reason: string,
		notes: string,
	) => void | Promise<void>;
	contentClassName?: string;
};

export type CompanyCardDisplay = {
	id: string;
	legalName: string;
	planLabel: string;
	planEmployeeLabel?: string;
	planType: string;
	showEmployeeBadge?: boolean;
	detailLine1: string;
	detailLine2: string;
};

export type CompanyCardProps =
	| {
			variant: "edit";
			company: CompanyCardDisplay;
			onEdit: (id: string) => void;
			onDelete: (id: string) => void;
			onClick?: never;
	  }
	| {
			variant: "list";
			company: CompanyCardDisplay;
			onClick?: () => void;
			onEdit?: never;
			onDelete?: never;
	  };

export type CompanyCardSkeletonVariant = "edit" | "list";
