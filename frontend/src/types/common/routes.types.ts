import type { ReactNode } from "react";

export interface RouteConfig {
	path: string;
	element: ReactNode;
	children?: RouteConfig[];
}

export interface AuthRoutes {
	login: string;
	forgotPassword: string;
	onboarding: string;
	support: string;
	privacyPolicy: string;
	termsOfUse: string;
	subprocessors: string;
	register?: string;
}

export interface DashboardRoutes {
	root: string;
	myAccount: string;
}

export interface CoachDashboardRoutes {
	root: string;
}

export interface CorporationOverviewRoutes {
	root: string;
}

export interface CompanyOverviewRoutes {
	root: string;
}

export interface CorporateDirectoryRoutes {
	root: string;
	view: string;
	viewWithIdPath: (corporationId: string) => string;
	chooseSetup: string;
	add: string;
	addWithId: string;
	addWithIdPath: (corporationId: string) => string;
	addAdvanced: string;
	addAdvancedWithId: string;
	addAdvancedWithIdPath: (corporationId: string) => string;
}

export interface ChatbotRoutes {
	root: string;
}

export interface RolesRoutes {
	root: string;
	add: string;
	edit: string;
	editWithIdPath: (roleId: string) => string;
}

export interface FinanceRoutes {
	invoices: string;
	billing: string;
	billingDetail: string;
	billingDetailWithIdPath: (companyId: string) => string;
	billingEdit: string;
	billingEditWithIdPath: (companyId: string) => string;
}

export interface PlansPricingRoutes {
	root: string;
	view: string;
	viewWithIdPath: (planTypeId: string) => string;
}

export interface PromoCodesRoutes {
	root: string;
	add: string;
	view: string;
	viewWithIdPath: (promoCodeId: string) => string;
	edit: string;
	editWithIdPath: (promoCodeId: string) => string;
}

export interface CompanyDirectoryRoutes {
	root: string;
	view: string;
	viewWithIdPath: (companyId: string) => string;
	add: string;
	addWithId: string;
	addWithIdPath: (companyId: string) => string;
}

export interface UserDirectoryRoutes {
	root: string;
	invite: string;
	addContact: string;
	view: string;
	viewWithIdPath: (userId: string) => string;
	edit: string;
	editWithIdPath: (userId: string) => string;
	contactView: string;
	contactViewWithIdPath: (contactId: string) => string;
	contactEdit: string;
	contactEditWithIdPath: (contactId: string) => string;
}

export interface AssessmentsRoutes {
	root: string;
}

export interface InviteManagementRoutes {
	root: string;
	sendInvite: string;
}

export interface AssessmentRoutes {
	root: string;
	introEntry: string;
	reportResults: string;
	reportResultsWithIdPath: (assessmentId: string) => string;
	reportPrint: string;
	reportPrintWithIdPath: (assessmentId: string) => string;
}

export interface SettingsRoutes {
	root: string;
}

export interface AppRoutes {
	auth: AuthRoutes;
	dashboard: DashboardRoutes;
	coachDashboard: CoachDashboardRoutes;
	corporationOverview: CorporationOverviewRoutes;
	companyOverview: CompanyOverviewRoutes;
	corporateDirectory: CorporateDirectoryRoutes;
	companyDirectory: CompanyDirectoryRoutes;
	chatbot: ChatbotRoutes;
	roles: RolesRoutes;
	finance: FinanceRoutes;
	userDirectory: UserDirectoryRoutes;
	plansPricing: PlansPricingRoutes;
	assessments: AssessmentsRoutes;
	inviteManagement: InviteManagementRoutes;
	assessment: AssessmentRoutes;
	settings: SettingsRoutes;
	promoCodes: PromoCodesRoutes;
}
