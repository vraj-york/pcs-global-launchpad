import type { AppRoutes } from "@/types";

export const ROUTES: AppRoutes = {
	auth: {
		login: "/login",
		forgotPassword: "/forgot-password",
		onboarding: "/onboarding",
		support: "/support",
		privacyPolicy: "/privacy-policy",
		termsOfUse: "/terms-of-use",
		subprocessors: "/subprocessors",
	},
	dashboard: {
		root: "/dashboard",
		myAccount: "/settings",
	},
	coachDashboard: {
		root: "/coach-dashboard",
	},
	coachSessions: {
		root: "/coach-sessions",
	},
	coachCalendar: {
		root: "/coach-calendar",
	},
	coachSettings: {
		root: "/coach-settings",
	},
	corporationOverview: {
		root: "/corporation-overview",
	},
	companyOverview: {
		root: "/company-overview",
	},
	corporateDirectory: {
		root: "/corporation-directory",
		view: "/corporation-directory/:corporationId",
		viewWithIdPath: (corporationId: string) =>
			`/corporation-directory/${corporationId}`,
		chooseSetup: "/corporation-directory/choose-setup",
		add: "/corporation-directory/add",
		addWithId: "/corporation-directory/add/:corporationId",
		addWithIdPath: (corporationId: string) =>
			`/corporation-directory/add/${corporationId}`,
		addAdvanced: "/corporation-directory/add-advanced",
		addAdvancedWithId: "/corporation-directory/add-advanced/:corporationId",
		addAdvancedWithIdPath: (corporationId: string) =>
			`/corporation-directory/add-advanced/${corporationId}`,
	},
	companyDirectory: {
		root: "/company-directory",
		view: "/company-directory/:companyId",
		viewWithIdPath: (companyId: string) => `/company-directory/${companyId}`,
		add: "/company-directory/add",
		addWithId: "/company-directory/add/:companyId",
		addWithIdPath: (companyId: string) => `/company-directory/add/${companyId}`,
	},
	chatbot: {
		root: "/chat",
	},
	roles: {
		root: "/roles",
		add: "/roles/add",
		edit: "/roles/edit/:roleId",
		editWithIdPath: (roleId: string) => `/roles/edit/${roleId}`,
	},
	finance: {
		invoices: "/finance/invoices",
		billing: "/finance/billing",
		billingDetail: "/finance/billing/:companyId",
		billingDetailWithIdPath: (companyId: string) =>
			`/finance/billing/${encodeURIComponent(companyId)}`,
		billingEdit: "/finance/billing/:companyId/edit",
		billingEditWithIdPath: (companyId: string) =>
			`/finance/billing/${encodeURIComponent(companyId)}/edit`,
	},
	userDirectory: {
		root: "/user-directory",
		invite: "/user-directory/invite",
		addContact: "/user-directory/add-contact",
		view: "/user-directory/:userId",
		viewWithIdPath: (userId: string) =>
			`/user-directory/${encodeURIComponent(userId)}`,
		edit: "/user-directory/:userId/edit",
		editWithIdPath: (userId: string) =>
			`/user-directory/${encodeURIComponent(userId)}/edit`,
		contactView: "/user-directory/contacts/:contactId",
		contactViewWithIdPath: (contactId: string) =>
			`/user-directory/contacts/${encodeURIComponent(contactId)}`,
		contactEdit: "/user-directory/contacts/:contactId/edit",
		contactEditWithIdPath: (contactId: string) =>
			`/user-directory/contacts/${encodeURIComponent(contactId)}/edit`,
	},
	plansPricing: {
		root: "/plans-pricing",
		view: "/plans-pricing/:planTypeId",
		viewWithIdPath: (planTypeId: string) => `/plans-pricing/${planTypeId}`,
	},
	assessments: {
		root: "/assessments",
	},
	inviteManagement: {
		root: "/invite-management",
		sendInvite: "/invite-management/send-invite",
	},
	assessment: {
		root: "/assessment",
		introEntry: "/assessment?intro=1",
		reportResults: "/assessment/:assessmentId/results",
		reportResultsWithIdPath: (assessmentId: string) =>
			`/assessment/${encodeURIComponent(assessmentId)}/results`,
		reportPrint: "/assessment/:assessmentId/print",
		reportPrintWithIdPath: (assessmentId: string) =>
			`/assessment/${encodeURIComponent(assessmentId)}/print`,
	},
	settings: {
		root: "/settings",
	},
	promoCodes: {
		root: "/promo-codes",
		add: "/promo-codes/add",
		view: "/promo-codes/:promoCodeId",
		viewWithIdPath: (promoCodeId: string) =>
			`/promo-codes/${encodeURIComponent(promoCodeId)}`,
		edit: "/promo-codes/:promoCodeId/edit",
		editWithIdPath: (promoCodeId: string) =>
			`/promo-codes/${encodeURIComponent(promoCodeId)}/edit`,
	},
} as const;
