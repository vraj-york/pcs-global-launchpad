import { API_ENDPOINTS } from "@/const";
import type { ApiResponse } from "@/lib/apiClient";
import { getDemoPersona } from "./demoSession";

function ok<T>(data: T, status = 200): ApiResponse<T> {
	return { data, status, ok: true };
}

function successBody<T>(data: T) {
	return { success: true, message: "OK", data };
}

const DEMO_CORPORATIONS = [
	{
		id: "corp-demo-001",
		corporationCode: 1001,
		legalName: "Acme Holdings",
		dataResidencyRegion: "US",
		status: "active",
		corporationAdminName: "Cora Corporation",
		corporationAdminEmail: "corpadmin@demo.launchpad",
		noOfCompanies: 2,
		createdAt: "2025-01-15T10:00:00.000Z",
		mode: "quick",
		submittedSteps: 5,
	},
	{
		id: "corp-demo-002",
		corporationCode: 1002,
		legalName: "Globex International",
		dataResidencyRegion: "EU",
		status: "active",
		corporationAdminName: "Pat Partner",
		corporationAdminEmail: "pat@globex.demo",
		noOfCompanies: 1,
		createdAt: "2025-03-20T14:30:00.000Z",
		mode: "advanced",
		submittedSteps: 5,
	},
];

const DEMO_COMPANIES = [
	{
		id: "company-demo-001",
		companyCode: 2001,
		legalName: "Acme North America",
		dbaName: "Acme NA",
		status: "active",
		corporationId: "corp-demo-001",
		corporationName: "Acme Holdings",
		region: "US-East",
		createdAt: "2025-02-01T09:00:00.000Z",
	},
	{
		id: "company-demo-002",
		companyCode: 2002,
		legalName: "Acme Europe",
		dbaName: "Acme EU",
		status: "active",
		corporationId: "corp-demo-001",
		corporationName: "Acme Holdings",
		region: "EU-West",
		createdAt: "2025-02-10T11:00:00.000Z",
	},
];

const DEMO_USERS = [
	{
		cognitoSub: "demo-end-user",
		userCode: 3001,
		firstName: "Jordan",
		lastName: "Employee",
		email: "user@demo.launchpad",
		status: "active",
		corporationName: "Acme Holdings",
		corporationCode: 1001,
		roleName: "Employee",
		categoryName: "Staff",
		workPhone: "+1 555 010 2000",
		timezone: "America/New_York",
		createdAt: "2025-04-01T08:00:00.000Z",
		company: { companyName: "Acme North America", region: "US-East" },
	},
	{
		cognitoSub: "demo-user-002",
		userCode: 3002,
		firstName: "Alex",
		lastName: "Analyst",
		email: "alex@demo.launchpad",
		status: "pending",
		corporationName: "Acme Holdings",
		corporationCode: 1001,
		roleName: "Analyst",
		categoryName: "Staff",
		workPhone: null,
		timezone: "America/Chicago",
		createdAt: "2025-05-12T12:00:00.000Z",
		company: { companyName: "Acme North America", region: "US-East" },
	},
];

function stripQuery(path: string): string {
	const idx = path.indexOf("?");
	return idx === -1 ? path : path.slice(0, idx);
}

function paginated<T>(items: T[], page = 1, pageSize = 10) {
	const total = items.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	return {
		items,
		pagination: { total, page, pageSize, totalPages },
		total,
		page,
	};
}

/**
 * In-memory mock API for Launchpad demo mode.
 */
export async function handleDemoApiRequest<T>(
	method: string,
	endpoint: string,
	body?: unknown,
): Promise<ApiResponse<T>> {
	const path = stripQuery(endpoint);
	const persona = getDemoPersona();

	// Auth password reset
	if (path.startsWith("/auth/password-reset")) {
		return ok({
			success: true,
			message: "Demo: password reset simulated.",
		} as T);
	}

	// User profile & access
	if (path === API_ENDPOINTS.users.userProfile) {
		return ok(successBody(persona.profile) as T);
	}
	if (path === API_ENDPOINTS.users.userSubscriptionAccess) {
		return ok(
			successBody({
				companyId: persona.profile.companyId,
				subscriptionStatus: "active",
				planTypeId: "annual",
				employeeRangeMax: 500,
				activeEmployeeCount: 42,
				assessmentQuantity: 100,
				companyAssessmentCount: 12,
				assessmentCreditsRemaining: 88,
				isActive: true,
				isBlocked: false,
				employeeLimitExceeded: false,
				canAccessFullApp: true,
				canAccessChatbot: true,
				canStartAssessment: true,
				canViewResults: true,
				isIndividualUser: false,
				paymentRequired: false,
				paymentStatus: null,
			}) as T,
		);
	}
	if (path === API_ENDPOINTS.users.meAnalyticsContext) {
		return ok(
			successBody({
				corporationId: persona.profile.corporationId,
				companyIds: persona.profile.companyId
					? [persona.profile.companyId]
					: [],
				primaryCompanyId: persona.profile.companyId,
				inviteType: persona.profile.inviteType,
				isB2cAssessmentOnly: false,
			}) as T,
		);
	}
	if (path === API_ENDPOINTS.users.peerMentions) {
		return ok(successBody({ items: [], total: 0 }) as T);
	}
	if (path === API_ENDPOINTS.users.peerSnapshot) {
		return ok(successBody({ peers: [], snapshotDate: null }) as T);
	}
	if (path === API_ENDPOINTS.users.growthSpark) {
		return ok(successBody({ insights: [], generatedAt: null }) as T);
	}
	if (path === API_ENDPOINTS.users.accountSecurity) {
		return ok(
			successBody({
				mfaEnabled: false,
				lastPasswordChange: "2025-01-01T00:00:00.000Z",
			}) as T,
		);
	}
	if (path === API_ENDPOINTS.users.userOnboardingSteps) {
		return ok(successBody({ completedSteps: persona.profile.completedOnboardingSteps }) as T);
	}

	// Users list
	if (path === API_ENDPOINTS.users.root) {
		const url = new URL(endpoint, "http://local");
		const page = Number(url.searchParams.get("page") ?? "1");
		const limit = Number(url.searchParams.get("limit") ?? "10");
		const data = paginated(DEMO_USERS, page, limit);
		return ok(
			successBody({
				items: data.items,
				pagination: data.pagination,
			}) as T,
		);
	}

	// Super admin dashboard
	if (path === API_ENDPOINTS.superAdmin.systemAnalytics) {
		return ok(
			successBody({
				corporations: {
					total: 2,
					active: 2,
					incomplete: 0,
					suspended: 0,
					closed: 0,
				},
				companies: {
					total: 2,
					active: 2,
					incomplete: 0,
					suspended: 0,
					closed: 0,
				},
				users: {
					total: 48,
					active: 40,
					pending: 5,
					blocked: 1,
					cancelled: 1,
					expired: 0,
					deleted: 1,
				},
				assessments: {
					completed: 32,
					inprogress: 4,
					avgTimeToComplete: 42,
				},
			}) as T,
		);
	}
	if (path === API_ENDPOINTS.corporations.all) {
		return ok(
			successBody(
				DEMO_CORPORATIONS.map((c) => ({
					id: c.id,
					legalName: c.legalName,
				})),
			) as T,
		);
	}

	// Corporations
	if (path === API_ENDPOINTS.corporations.list) {
		return ok(
			successBody(
				DEMO_CORPORATIONS.map((c) => ({
					id: c.id,
					legalName: c.legalName,
					corporationCode: c.corporationCode,
				})),
			) as T,
		);
	}
	if (path === API_ENDPOINTS.corporations.root || path.startsWith("/corporations?")) {
		return ok(
			successBody({
				items: DEMO_CORPORATIONS,
				pagination: paginated(DEMO_CORPORATIONS).pagination,
			}) as T,
		);
	}
	if (path === API_ENDPOINTS.corporations.activeCompanies) {
		return ok(
			successBody(
				DEMO_COMPANIES.map((c) => ({
					id: c.id,
					legalName: c.legalName,
					companyCode: c.companyCode,
					corporationId: c.corporationId,
				})),
			) as T,
		);
	}
	if (path === API_ENDPOINTS.corporations.allCompanies) {
		return ok(successBody(DEMO_COMPANIES) as T);
	}

	// Corporation detail
	const corpByIdMatch = path.match(/^\/corporations\/([^/]+)$/);
	if (corpByIdMatch) {
		const corp = DEMO_CORPORATIONS.find((c) => c.id === corpByIdMatch[1]);
		if (corp) {
			return ok(
				successBody({
					...corp,
					companies: DEMO_COMPANIES.filter(
						(c) => c.corporationId === corp.id,
					),
				}) as T,
			);
		}
	}

	// Companies
	if (path === API_ENDPOINTS.companies.root) {
		return ok(
			successBody({
				items: DEMO_COMPANIES,
				pagination: paginated(DEMO_COMPANIES).pagination,
			}) as T,
		);
	}
	if (path === API_ENDPOINTS.companies.filterOptions) {
		return ok(
			successBody({
				corporations: DEMO_CORPORATIONS.map((c) => ({
					id: c.id,
					label: c.legalName,
				})),
				companies: DEMO_COMPANIES.map((c) => ({
					id: c.id,
					label: c.legalName,
				})),
				timezones: ["America/New_York", "America/Chicago"],
			}) as T,
		);
	}

	// Roles & permissions
	if (
		path === API_ENDPOINTS.roles.root ||
		path === API_ENDPOINTS.roles.categories ||
		path === API_ENDPOINTS.roles.categoriesWithRoles
	) {
		return ok(successBody([]) as T);
	}
	if (path === API_ENDPOINTS.permissions.modulesWithSubmodules) {
		return ok(successBody([]) as T);
	}

	// Pricing & finance
	if (
		path === API_ENDPOINTS.pricing.plans ||
		path === API_ENDPOINTS.pricing.onboardingFees
	) {
		return ok(successBody([]) as T);
	}
	if (
		path === API_ENDPOINTS.finance.invoices ||
		path === API_ENDPOINTS.finance.billing ||
		path === API_ENDPOINTS.finance.invoiceCompanyOptions ||
		path === API_ENDPOINTS.finance.billingPlanOptions
	) {
		return ok(successBody({ items: [], pagination: paginated([]).pagination }) as T);
	}

	// Promo codes
	if (path === API_ENDPOINTS.promoCodes.root) {
		return ok(successBody({ items: [], pagination: paginated([]).pagination }) as T);
	}

	// Assessments
	if (
		path === API_ENDPOINTS.assessmentsDirectory.list ||
		path.startsWith("/assessments/users/")
	) {
		return ok(successBody({ items: [], pagination: paginated([]).pagination }) as T);
	}
	if (path === API_ENDPOINTS.assessment.questions) {
		return ok(successBody([]) as T);
	}
	if (path === API_ENDPOINTS.assessment.assessments) {
		return ok(successBody({ id: "demo-assessment-001", status: "inprogress" }) as T);
	}
	if (path === API_ENDPOINTS.assessment.bspStyles) {
		return ok(successBody([]) as T);
	}

	// Invite management
	if (
		path === API_ENDPOINTS.inviteManagement.assessmentInviteOptions ||
		path === API_ENDPOINTS.inviteManagement.assessmentInvites
	) {
		return ok(successBody({ items: [], options: [] }) as T);
	}

	// Key contacts
	if (path === API_ENDPOINTS.keyContacts.root) {
		return ok(successBody({ items: [], pagination: paginated([]).pagination }) as T);
	}

	// Company admin
	if (path.startsWith("/company-admin/")) {
		return ok(successBody({ paymentRequired: false, status: "active" }) as T);
	}

	// Support
	if (path === API_ENDPOINTS.support.root && method === "POST") {
		return ok(successBody({ id: "demo-ticket-001", message: "Support request received (demo)." }) as T);
	}

	// Chatbot
	if (path.startsWith("/chatbot")) {
		return ok(successBody({ messages: [], threadId: "demo-thread" }) as T);
	}

	// Mutations: accept and echo body
	if (method !== "GET") {
		return ok(
			successBody(
				typeof body === "object" && body !== null ? body : { saved: true },
			) as T,
		);
	}

	// Default empty success for unhandled GET
	return ok(successBody(null) as T);
}
