/**
 * API Configuration Constants
 */

export const API_CONFIG = {
	baseUrl: import.meta.env.VITE_API_BASE_URL,
	timeout: 30000,
} as const;

/**
 * API Endpoints - Following RESTful conventions
 */
export const API_ENDPOINTS = {
	auth: {
		passwordReset: {
			request: "/auth/password-reset/request",
			confirm: "/auth/password-reset/confirm",
			validate: "/auth/password-reset/validate",
			resend: "/auth/password-reset/resend",
		},
	},
	corporations: {
		root: "/corporations",
		list: "/corporations/list",
		all: "/corporations/all",
		byId: (corporationId: string) => `/corporations/${corporationId}`,
		companies: (corporationId: string) =>
			`/corporations/${corporationId}/companies`,
		companyById: (corporationId: string, companyId: string) =>
			`/corporations/${corporationId}/companies/${companyId}`,
		createCompanyNew: (corporationId: string) =>
			`/corporations/${corporationId}/companies/companynew`,
		activeCompanies: "/corporations/companies/active",
		allCompanies: "/corporations/companies/all",
		dashboardSystemAnalytics: "/corporations/dashboard/system-analytics",
		companyDashboardSystemAnalytics:
			"/corporations/companies/dashboard/system-analytics",
		companyByCompanyId: (companyId: string) =>
			`/corporations/companies/${companyId}`,
		keyContacts: (companyId: string) =>
			`/corporations/companies/${companyId}/key-contacts`,
		planSeats: (companyId: string) =>
			`/corporations/companies/${companyId}/plan-seats`,
		companyConfiguration: (companyId: string) =>
			`/corporations/companies/${companyId}/configuration`,
		companyBrandLogo: (companyId: string) =>
			`/corporations/companies/${companyId}/brand-logo`,
		companyConfirmation: (companyId: string) =>
			`/corporations/companies/${companyId}/confirmation`,
		companySuspend: (companyId: string) =>
			`/corporations/companies/${companyId}/suspend`,
		companyReinstate: (companyId: string) =>
			`/corporations/companies/${companyId}/reinstate`,
		steps: (corporationId: string) => `/corporations/${corporationId}/steps`,
		brandLogo: (corporationId: string) =>
			`/corporations/${corporationId}/brand-logo`,
		keyContact: (corporationId: string) =>
			`/corporations/${corporationId}/key-contact`,
		status: (corporationId: string) => `/corporations/${corporationId}/status`,
		reinstate: (corporationId: string) =>
			`/corporations/${corporationId}/reinstate`,
	},
	pricing: {
		plans: "/pricing/plans",
		onboardingFees: "/pricing/onboarding-fees",
	},
	roles: {
		root: "/roles",
		categories: "/roles/categories",
		categoriesWithRoles: "/roles/categories/with-roles",
		categoryEnabledSubmodules: (categoryId: string) =>
			`/roles/categories/${categoryId}/enabled-submodules`,
		byId: (id: string) => `/roles/${id}`,
	},
	permissions: {
		modulesWithSubmodules: "/permissions/modules-with-submodules",
	},
	companies: {
		root: "/companies",
		filterOptions: "/companies/filter-options",
	},
	companyAdmin: {
		onboardingReview: "/company-admin/me/onboarding-review",
		checkoutSession: "/company-admin/me/checkout-session",
		billing: "/company-admin/me/billing",
		billingHistory: "/company-admin/me/billing/history",
		billingCancelSubscription: "/company-admin/me/billing/cancel-subscription",
		billingRetryPayment: "/company-admin/me/billing/retry-payment",
		billingReinstateSubscription:
			"/company-admin/me/billing/reinstate-subscription",
		billingRequestPlanChange: "/company-admin/me/billing/request-plan-change",
		billingInvoicePdf: (invoiceId: string) =>
			`/company-admin/me/billing/invoices/${encodeURIComponent(invoiceId)}/pdf`,
	},
	superAdmin: {
		systemAnalytics: "/super-admin/dashboard/system-analytics",
	},
	finance: {
		invoices: "/finance/invoices",
		invoiceCompanyOptions: "/finance/invoices/company-options",
		bulkDownloadInvoices: "/finance/invoices/bulk-download",
		bulkSendInvoices: "/finance/invoices/bulk-send",
		invoicePdf: (invoiceId: string) =>
			`/finance/invoices/${encodeURIComponent(invoiceId)}/pdf`,
		invoiceSend: (invoiceId: string) =>
			`/finance/invoices/${encodeURIComponent(invoiceId)}/send`,
		billing: "/finance/billing",
		billingPlanOptions: "/finance/billing/plan-options",
		billingCompany: (companyId: string) =>
			`/finance/billing/companies/${encodeURIComponent(companyId)}`,
		billingCompanyHistory: (companyId: string) =>
			`/finance/billing/companies/${encodeURIComponent(companyId)}/history`,
		billingCancelSubscription: (companyId: string) =>
			`/finance/billing/companies/${encodeURIComponent(companyId)}/cancel-subscription`,
		billingRetryPayment: (companyId: string) =>
			`/finance/billing/companies/${encodeURIComponent(companyId)}/retry-payment`,
		billingReinstateSubscription: (companyId: string) =>
			`/finance/billing/companies/${encodeURIComponent(companyId)}/reinstate-subscription`,
		billingUpgradeOptions: (companyId: string) =>
			`/finance/billing/companies/${encodeURIComponent(companyId)}/upgrade-options`,
		billingUpgradePreview: (companyId: string) =>
			`/finance/billing/companies/${encodeURIComponent(companyId)}/upgrade-preview`,
		billingUpgrade: (companyId: string) =>
			`/finance/billing/companies/${encodeURIComponent(companyId)}/upgrade`,
	},
	users: {
		root: "/users",
		meAnalyticsContext: "/users/me/analytics-context",
		userProfile: "/users/me/profile",
		userSubscriptionAccess: "/users/me/subscription-access",
		individualPaymentReview: "/users/me/individual-payment/review",
		individualPaymentCheckoutSession:
			"/users/me/individual-payment/checkout-session",
		userAvatar: "/users/me/avatar",
		userOnboardingSteps: "/users/me/onboarding-steps",
		peerMentions: "/users/me/peer-mentions",
		peerSnapshot: "/users/me/peer-snapshot",
		growthSpark: "/users/me/growth-spark",
		accountSecurity: "/users/me/security",
		accountSecurityChangePassword: "/users/me/security/change-password",
		accountSecurityMfaSendOtp: (action: string) =>
			`/users/me/security/mfa/${action}/send-otp`,
		accountSecurityMfaResendOtp: (action: string) =>
			`/users/me/security/mfa/${action}/resend-otp`,
		accountSecurityMfaVerify: (action: string) =>
			`/users/me/security/mfa/${action}/verify`,
		privacyDataExportSendOtp: "/users/me/privacy/data-export/send-otp",
		privacyDataExportResendOtp: "/users/me/privacy/data-export/resend-otp",
		privacyDataExportVerify: "/users/me/privacy/data-export/verify",
		invite: "/users/invite",
		inviteBulk: "/users/invite/bulk",
		byId: (userId: string) => `/users/${encodeURIComponent(userId)}`,
		block: (userId: string) => `/users/${encodeURIComponent(userId)}/block`,
		invitationCancel: (userId: string) =>
			`/users/${encodeURIComponent(userId)}/invitation/cancel`,
		invitationResend: (userId: string) =>
			`/users/${encodeURIComponent(userId)}/invitation/resend`,
	},
	keyContacts: {
		root: "/key-contacts",
		byId: (contactId: string) =>
			`/key-contacts/${encodeURIComponent(contactId)}`,
		invite: (contactId: string) =>
			`/key-contacts/${encodeURIComponent(contactId)}/invite`,
		bulk: "/key-contacts/bulk",
	},
	promoCodes: {
		root: "/promo-codes",
		availableForCompanySetup: "/promo-codes/available-for-company-setup",
		validate: "/promo-codes/validate",
		validateUpdateById: (id: string) =>
			`/promo-codes/${encodeURIComponent(id)}/validate`,
		byId: (id: string) => `/promo-codes/${encodeURIComponent(id)}`,
		usageById: (id: string) => `/promo-codes/${encodeURIComponent(id)}/usage`,
		promotionActiveById: (id: string) =>
			`/promo-codes/${encodeURIComponent(id)}/promotion-active`,
	},
	inviteManagement: {
		assessmentInviteOptions: "/invite-management/assessment-invite/options",
		assessmentInvites: "/invite-management/assessment-invites",
	},
	assessmentsDirectory: {
		list: "/assessments",
		listByUser: (cognitoSub: string) =>
			`/assessments/users/${encodeURIComponent(cognitoSub)}`,
	},
	assessmentReports: {
		shareReport: (assessmentId: string) =>
			`/assessment-reports/${encodeURIComponent(assessmentId)}/share`,
	},
	assessment: {
		questions: "/questions",
		assessments: "/assessments",
		byId: (assessmentId: string) =>
			`/assessments/${encodeURIComponent(assessmentId)}`,
		enqueueScoring: (assessmentId: string) =>
			`/assessments/${encodeURIComponent(assessmentId)}/enqueue-scoring`,
		reportPrintHtml: (assessmentId: string) =>
			`/assessments/${encodeURIComponent(assessmentId)}/report-print-html`,
		enqueueReport: (assessmentId: string) =>
			`/assessments/${encodeURIComponent(assessmentId)}/enqueue-report`,
		questionResponses: (assessmentId: string) =>
			`/assessments/${encodeURIComponent(assessmentId)}/question-responses`,
		questionResponsesBulk: (assessmentId: string) =>
			`/assessments/${encodeURIComponent(assessmentId)}/question-responses/bulk`,
		reportContent: (sectionKey: string) =>
			`/report-content/${encodeURIComponent(sectionKey)}`,
		userStyles: (assessmentId: string) =>
			`/assessments/${encodeURIComponent(assessmentId)}/user-styles`,
		bspStyles: "/bsp-styles",
	},
	support: {
		root: "/support-requests",
	},
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
} as const;
