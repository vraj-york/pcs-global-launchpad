import type { ReactNode } from "react";
import type {
	CompanyAdminAnalyticsDashboardTimeFilter,
	CompanyAdminSystemAnalyticsData,
} from "@/types";

export type CompanyAdminTrialSummary = {
	zeroTrial: boolean;
	trialLengthDays: number;
	trialStartDate: string | null;
	trialEndDate: string | null;
	autoConvertTrial: boolean;
};

export type CompanyAdminPricingSummary = {
	planPrice: string;
	discount: string;
	invoiceAmount: string;
	billingCurrency: string;
	promoCode: string | null;
	/** Plan-seat onsite training selection: "off" | "1_day" | "2_days". */
	onsiteTrainingOption: string;
	/** Unit price after discount (`one_time` company checkout). */
	pricePerAssessment?: string;
	/** Promo terms for invoice-level discount (`one_time` multi-qty checkout). */
	promoDiscountType?: "percent" | "fixed_amount" | null;
	promoDiscountValue?: string | null;
	/** Minimum selectable assessment quantity (`one_time`). */
	minAssessmentQuantity?: number;
};

export type CompanyAdminPlanSummary = {
	pricingPlanId: string;
	planTypeId: string;
	planTypeName: string;
	stripePriceConfigured: boolean;
	customerType: string;
	employeeRangeLabel: string | null;
	listPrice: string;
	trial: CompanyAdminTrialSummary | null;
	pricing: CompanyAdminPricingSummary;
};

/** One company the admin can manage (review or checkout). */
export type CompanyAdminCompanyItem = {
	companyId: string;
	corporationId: string;
	hasActiveSubscription: boolean;
	subscriptionStatus: string | null;
	corporation: {
		legalName: string;
		ownershipType: string;
		dataResidencyRegion: string;
	};
	company: {
		legalName: string;
		dbaName: string | null;
		website: string | null;
		companyType: string;
		officeType: string;
		industry: string;
		phoneNo: string | null;
		addressFormatted: string;
	};
	planSummary: CompanyAdminPlanSummary | null;
	canCheckout: boolean;
};

export type CompanyBasicDetailsReviewProps = {
	corporation: CompanyAdminCompanyItem["corporation"];
	company: CompanyAdminCompanyItem["company"];
};

export type CompanyAdminCompaniesListProps = {
	companies: CompanyAdminCompanyItem[];
	onProceedToPayment: (company: CompanyAdminCompanyItem) => void;
};

export type CompanyAdminCompaniesListColumnOptions = {
	onProceedToPayment: (company: CompanyAdminCompanyItem) => void;
	onViewCompanyDetails: (companyId: string) => void;
};

export type CompanyAdminTableRow = CompanyAdminCompanyItem & { id: string };

export type CompanyAdminOnboardingFlowProps = {
	review: CompanyAdminCompanyItem;
	/** When set, show back control to return to the multi-company list. */
	onBackToList?: () => void;
};

export type CompanyAdminOnboardingGateProps = {
	/** Keep list/flow when some companies are active but others need payment (corp admin). */
	mixedCompanyPayments?: boolean;
	/** Called when navigating back to the companies list from onboarding. */
	onReturnToList?: () => void;
	loadingFallback?: ReactNode;
	loadErrorFallback?: ReactNode;
	emptyCompaniesFallback?: ReactNode;
};

/** @deprecated Use CompanyAdminCompanyItem */
export type CompanyAdminOnboardingReview = CompanyAdminCompanyItem;

export type CompanyAdminDashboardResponse = {
	companies: CompanyAdminCompanyItem[];
};

/** Multi-company dashboard: which full-screen flow is open for a selected company. */
export type CompanyAdminDashboardDetail = {
	kind: "onboarding";
	company: CompanyAdminCompanyItem;
};

export type CompanyAdminDashboardStore = {
	companies: CompanyAdminCompanyItem[] | null;
	loading: boolean;
	loadError: boolean;
	/** Set synchronously when a fetch starts so concurrent callers no-op. */
	hasFetched: boolean;
	timeFilter: CompanyAdminAnalyticsDashboardTimeFilter;
	analytics: CompanyAdminSystemAnalyticsData | null;
	analyticsLoading: boolean;
	analyticsError: string | null;
	fetchCompanies: () => Promise<void>;
	fetchSystemAnalytics: () => Promise<void>;
	setTimeFilter: (
		value: CompanyAdminAnalyticsDashboardTimeFilter,
	) => Promise<void>;
	initializeAnalyticsDashboard: () => Promise<void>;
	resetAnalytics: () => void;
	reset: () => void;
};
