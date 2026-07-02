import type {
	AddCompanyConfigurationSchemaType,
	AddCompanyPlanAndSeatsSchemaType,
} from "@/schemas";
import type {
	CompanyBasicInfoPatchPayload,
	CompanyBasicInfoPostPayload,
	CompanyDetailData,
	CompanyPlanSeatsPayload,
	CorporationListOption,
	KeyContactsPayload,
} from "./company-api.types";
import type { PlanConfigSnapshot } from "./plan-and-seats-step.types";

export type ViewCompanyTabId =
	| "basic"
	| "keyContacts"
	| "planSeats"
	| "branding"
	| "configuration";

export type ViewCompanyViewerRole =
	| "superAdmin"
	| "companyAdmin"
	| "corporationAdmin";

export type ViewCompanyContentProps = {
	company: CompanyDetailData;
	onEditModeChange?: (isEditMode: boolean) => void;
	initialEditMode?: boolean;
	viewerRole?: ViewCompanyViewerRole;
	directoryBack?: { path: string; label: string } | null;
};

export type CompanyEditContentProps = {
	company: CompanyDetailData;
	activeTab: ViewCompanyTabId;
	onCancelEdit: () => void;
};

export type CompanyViewPlanSeatsTabProps = {
	company: CompanyDetailData;
	showManageInBillingCta?: boolean;
};

export type CompanyDetailsContentProps = {
	company: CompanyDetailData;
	activeTab: ViewCompanyTabId;
};

export type CompanyStatus = "active" | "suspended" | "incomplete" | "closed";

export interface CompanyDirectoryItem {
	id: string;
	companyId: string;
	companyName: string;
	region: string;
	status: CompanyStatus;
	submittedSteps?: number;
	completionPercentage?: number;
	assignedCorporation: {
		name: string;
		corporationCode: string;
	} | null;
	plan: string;
	planName: string;
	planTypeId: string;
	createdOn: string;
	lastUpdatedOn: string;
}

export type CompanySortBy =
	| "companyId"
	| "companyName"
	| "status"
	| "assignedCorporation"
	| "plan"
	| "createdOn"
	| "lastUpdatedOn";

export type CompanyCreatedFilter =
	| "last24Hours"
	| "last7Days"
	| "last30Days"
	| "last3Months"
	| "last6Months"
	| "lastYear";

export type CompanyDirectoryColumnOptions = {
	onSuspendClick?: (row: CompanyDirectoryItem) => void;
	onReinstateClick?: (row: CompanyDirectoryItem) => void;
	/** View-only directory: hide resume, edit, suspend, and reinstate actions. */
	readOnly?: boolean;
};

/** Result of createCompany store action */
export type CreateCompanyResult =
	| { ok: true; id: string }
	| { ok: false; error: string };

/** State for company directory (add company flow) store */
export type CompanyDirectoryState = {
	corporationsList: CorporationListOption[];
	corporationsListLoading: boolean;
	corporationsListError: string | null;
	companyDetail: CompanyDetailData | null;
	companyDetailLoading: boolean;
	companyDetailError: string | null;
	companyDetailErrorStatus: number | null;
	companyActionLoading: boolean;
};

/** Actions for company directory store */
export type CompanyDirectoryActions = {
	fetchCorporationsList: () => Promise<void>;
	createCompany: (
		corporationId: string,
		body: CompanyBasicInfoPostPayload,
	) => Promise<CreateCompanyResult>;
	updateCompanyBasicInfo: (
		companyId: string,
		body: CompanyBasicInfoPatchPayload,
	) => Promise<CreateCompanyResult>;
	fetchCompanyById: (companyId: string) => Promise<void>;
	submitKeyContacts: (
		companyId: string,
		body: KeyContactsPayload,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	submitPlanSeats: (
		companyId: string,
		body: CompanyPlanSeatsPayload,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	submitCompanyConfiguration: (
		companyId: string,
		values: AddCompanyConfigurationSchemaType,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	submitCompanyConfirmation: (
		companyId: string,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	clearCompanyDetail: () => void;
	reset: () => void;
};

/** Props for Add Company Configuration step */
export type AddCompanyConfigurationStepProps = {
	companyId?: string | null;
	onSuccess?: () => void;
	section?: "all" | "general" | "branding";
};

/** Props for Add Company Basic Info step */
export type AddCompanyBasicInfoStepProps = {
	onSuccess: (companyId: string) => void;
	onApiError?: (message: string) => void;
	companyId?: string | null;
};

/** Props for inner Basic Info form */
export type BasicInfoFormInnerProps = {
	corporationsList: CorporationListOption[];
	companyDetail: CompanyDetailData | null;
	onSuccess: (companyId: string) => void;
	onApiError?: (message: string) => void;
};

/** Section keys for Key Contacts step */
export type KeyContactsSectionKey =
	| "finance_billing_contact"
	| "technical_it_lead"
	| "implementation_lead"
	| "hr_program_owner";

/** Props for Key Contacts step */
export type AddCompanyKeyContactsStepProps = {
	companyId: string | null | undefined;
	onSuccess?: () => void;
};

/** Props for Plan & Seats step */
export type AddCompanyPlanSeatsStepProps = {
	companyId: string | null | undefined;
	onSuccess?: () => void;
};

/** Maps Plan & Seats form state to PUT plan-seats body builder input */
export type BuildCompanyPlanSeatsPayloadInput = {
	activePlanTypeId: string;
	zeroTrial: boolean;
	trialLengthDays: number;
	trialStartDate: string;
	selectedPlanId: string;
	discount: string;
	planPrice: number;
	oneTimePlanLevelId: string;
	oneTimePlanPrice: number;
	hasPromoCode: boolean;
	promoCode: string;
	onsiteTrainingOption: string;
};

/** Prefill from GET company `plan` + `planSeat` for Plan & Seats form */
export type PlanSeatsPrefillResult = {
	formValues: AddCompanyPlanAndSeatsSchemaType;
	refSnapshots: Record<string, PlanConfigSnapshot>;
};

export type SuspendCompanyModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	companyName: string;
	onConfirm: (reason: string, notes: string) => void | Promise<void>;
	isConfirming?: boolean;
	contentClassName?: string;
};
