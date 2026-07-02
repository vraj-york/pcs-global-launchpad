import {
	COGNITO_COMPANY_ADMIN_GROUP,
	COGNITO_CORPORATION_ADMIN_GROUP,
	COGNITO_SUPER_ADMIN_GROUP,
	COGNITO_USER_GROUP,
	SUBMODULE_KEYS,
} from "@/const";
import type { UserProfile } from "@/types";

export type DemoPersonaId =
	| "superadmin"
	| "corporationadmin"
	| "companyadmin"
	| "enduser";

export type DemoPersona = {
	id: DemoPersonaId;
	email: string;
	password: string;
	cognitoSub: string;
	groups: string[];
	profile: UserProfile;
};

const allSubmodules = Object.values(SUBMODULE_KEYS).map((key) => ({
	key,
	enabled: true,
}));

function baseProfile(
	overrides: Partial<UserProfile> & Pick<UserProfile, "firstName" | "lastName">,
): UserProfile {
	return {
		cognitoSub: overrides.cognitoSub ?? "demo-cognito-sub",
		corporationId: overrides.corporationId ?? "corp-demo-001",
		companyId: overrides.companyId ?? "company-demo-001",
		userCode: overrides.userCode ?? 1001,
		status: "active",
		firstName: overrides.firstName,
		lastName: overrides.lastName,
		nickname: overrides.nickname ?? null,
		jobRole: overrides.jobRole ?? "Demo User",
		avatar: null,
		workPhone: "+1 555 010 1000",
		cellPhone: null,
		timezone: "America/New_York",
		completedOnboardingSteps: overrides.completedOnboardingSteps ?? 2,
		assessmentCompletionCount: overrides.assessmentCompletionCount ?? 1,
		corporation: overrides.corporation ?? "Acme Holdings",
		companyName: overrides.companyName ?? "Acme North America",
		roleName: overrides.roleName ?? "Administrator",
		category: overrides.category ?? "Admin",
		userType: overrides.userType ?? null,
		inviteType: overrides.inviteType ?? "corporate",
		email: overrides.email ?? null,
		subscriptionStatus: "active",
		planTypeId: "annual",
		submodules: overrides.submodules ?? allSubmodules,
	};
}

export const DEMO_PERSONAS: Record<DemoPersonaId, DemoPersona> = {
	superadmin: {
		id: "superadmin",
		email: "superadmin@demo.launchpad",
		password: "demo",
		cognitoSub: "demo-super-admin",
		groups: [COGNITO_SUPER_ADMIN_GROUP],
		profile: baseProfile({
			cognitoSub: "demo-super-admin",
			firstName: "Sam",
			lastName: "SuperAdmin",
			email: "superadmin@demo.launchpad",
			corporationId: null,
			companyId: null,
			corporation: null,
			companyName: null,
			roleName: "Super Admin",
			userType: null,
			submodules: allSubmodules,
		}),
	},
	corporationadmin: {
		id: "corporationadmin",
		email: "corpadmin@demo.launchpad",
		password: "demo",
		cognitoSub: "demo-corp-admin",
		groups: [COGNITO_CORPORATION_ADMIN_GROUP],
		profile: baseProfile({
			cognitoSub: "demo-corp-admin",
			firstName: "Cora",
			lastName: "Corporation",
			email: "corpadmin@demo.launchpad",
			roleName: "Corporation Admin",
			submodules: allSubmodules.filter((s) =>
				s.key.startsWith("corporation") ||
				s.key.startsWith("company") ||
				s.key.startsWith("user_directory") ||
				s.key.startsWith("invoice") ||
				s.key.startsWith("dashboard"),
			),
		}),
	},
	companyadmin: {
		id: "companyadmin",
		email: "companyadmin@demo.launchpad",
		password: "demo",
		cognitoSub: "demo-company-admin",
		groups: [COGNITO_COMPANY_ADMIN_GROUP],
		profile: baseProfile({
			cognitoSub: "demo-company-admin",
			firstName: "Casey",
			lastName: "CompanyAdmin",
			email: "companyadmin@demo.launchpad",
			roleName: "Company Admin",
			submodules: allSubmodules.filter(
				(s) =>
					s.key.startsWith("company") ||
					s.key.startsWith("user_directory") ||
					s.key.startsWith("billing") ||
					s.key.startsWith("dashboard"),
			),
		}),
	},
	enduser: {
		id: "enduser",
		email: "user@demo.launchpad",
		password: "demo",
		cognitoSub: "demo-end-user",
		groups: [COGNITO_USER_GROUP],
		profile: baseProfile({
			cognitoSub: "demo-end-user",
			firstName: "Jordan",
			lastName: "Employee",
			email: "user@demo.launchpad",
			roleName: "Employee",
			userType: null,
			completedOnboardingSteps: 2,
			assessmentCompletionCount: 1,
			submodules: [
				{ key: SUBMODULE_KEYS.DASHBOARD, enabled: true },
				{ key: SUBMODULE_KEYS.ASSESSMENT_TAKE, enabled: true },
				{ key: SUBMODULE_KEYS.ASSESSMENT_VIEW_RESULT, enabled: true },
				{ key: SUBMODULE_KEYS.ASSESSMENT_LIST, enabled: true },
				{ key: SUBMODULE_KEYS.SETTINGS_PROFILE, enabled: true },
				{ key: SUBMODULE_KEYS.SETTINGS_SECURITY, enabled: true },
				{ key: SUBMODULE_KEYS.SETTINGS_PRIVACY, enabled: true },
			],
		}),
	},
};

export const DEMO_LOGIN_HINT =
	"Demo: superadmin@demo.launchpad / demo (also corpadmin@, companyadmin@, user@)";

export function resolveDemoPersonaByEmail(
	email: string,
): DemoPersona | undefined {
	const normalized = email.trim().toLowerCase();
	return Object.values(DEMO_PERSONAS).find(
		(p) => p.email.toLowerCase() === normalized,
	);
}
