import {
	Building,
	Building2,
	ClipboardList,
	CopyCheck,
	CreditCard,
	FileSliders,
	LayoutDashboard,
	MapPin,
	Receipt,
	CalendarDays,
	Settings,
	Shield,
	Tag,
	Users,
	Video,
} from "lucide-react";
import { COMPANIES_DIRECTORY_PAGE_CONTENT } from "@/const/companies";
import { CORPORATE_DIRECTORY_PAGE_CONTENT } from "@/const/corporations";
import { BILLING_MANAGEMENT_PAGE_CONTENT } from "@/const/finance";
import { INVITE_MANAGEMENT_PAGE_CONTENT } from "@/const/invite-management";
import { SUBMODULE_KEYS } from "@/const/rbac";
import { SETTINGS_SIDEBAR_ITEM } from "@/const/users";
import type { SidebarMenuSection } from "@/types";
import {
	ASSESSMENT_DIRECTORY_ALLOWED_GROUPS,
	COGNITO_COACH_GROUP,
	COGNITO_COMPANY_ADMIN_GROUP,
	COGNITO_CORPORATION_ADMIN_GROUP,
	COGNITO_SUPER_ADMIN_GROUP,
	COGNITO_USER_GROUP,
	USER_DIRECTORY_ALLOWED_GROUPS,
} from "./cognito-groups.const";
import { PROMO_CODES_PAGE_CONTENT } from "./promo-codes.const";
import { ROUTES } from "./routes.const";

export const SIDEBAR_MENU: SidebarMenuSection[] = [
	{
		title: "Main",
		items: [
			{
				id: "dashboard",
				label: "Dashboard",
				icon: LayoutDashboard,
				path: ROUTES.dashboard.root,
				allowedGroups: [
					COGNITO_SUPER_ADMIN_GROUP,
					COGNITO_CORPORATION_ADMIN_GROUP,
					COGNITO_COMPANY_ADMIN_GROUP,
					COGNITO_USER_GROUP,
				],
			},
		],
	},
	{
		title: "Administration",
		items: [
			{
				id: "corporation-overview",
				label: CORPORATE_DIRECTORY_PAGE_CONTENT.corporationOverviewTitle,
				icon: Building2,
				path: ROUTES.corporationOverview.root,
				allowedGroups: [COGNITO_CORPORATION_ADMIN_GROUP],
				requiredSubmodule: SUBMODULE_KEYS.CORPORATION_OVERVIEW_VIEW,
			},
			{
				id: "company-overview",
				label: COMPANIES_DIRECTORY_PAGE_CONTENT.companyOverviewTitle,
				icon: Building,
				path: ROUTES.companyOverview.root,
				allowedGroups: [COGNITO_COMPANY_ADMIN_GROUP],
				requiredSubmodule: SUBMODULE_KEYS.COMPANY_OVERVIEW_VIEW,
			},
			{
				id: "corporate-directory",
				label: "Corporation Directory",
				icon: Building2,
				path: ROUTES.corporateDirectory.root,
				allowedGroups: [COGNITO_SUPER_ADMIN_GROUP],
			},
			{
				id: "company-directory",
				label: "Company Directory",
				icon: MapPin,
				path: ROUTES.companyDirectory.root,
				allowedGroups: [
					COGNITO_SUPER_ADMIN_GROUP,
					COGNITO_CORPORATION_ADMIN_GROUP,
				],
			},
		],
	},
	{
		title: "Users & Access",
		items: [
			{
				id: "user-directory",
				label: "User Directory",
				icon: Users,
				path: ROUTES.userDirectory.root,
				allowedGroups: [...USER_DIRECTORY_ALLOWED_GROUPS],
				requiredSubmodule: SUBMODULE_KEYS.USER_DIRECTORY_VIEW,
			},
			{
				id: "roles-permissions",
				label: "Roles & Permissions",
				icon: Shield,
				path: ROUTES.roles.root,
				allowedGroups: [COGNITO_SUPER_ADMIN_GROUP],
			},
		],
	},
	{
		title: "Finance",
		items: [
			{
				id: "plans-pricing",
				label: "Plans & Pricing",
				icon: CopyCheck,
				path: ROUTES.plansPricing.root,
				allowedGroups: [COGNITO_SUPER_ADMIN_GROUP],
			},
			{
				id: "billing-management",
				label: BILLING_MANAGEMENT_PAGE_CONTENT.breadcrumbsTitle,
				icon: CreditCard,
				path: ROUTES.finance.billing,
				allowedGroups: [COGNITO_SUPER_ADMIN_GROUP, COGNITO_COMPANY_ADMIN_GROUP],
				requiredSubmodule: SUBMODULE_KEYS.BILLING_MANAGEMENT_VIEW,
			},
			{
				id: "invoice-management",
				label: "Invoice Management",
				icon: Receipt,
				path: ROUTES.finance.invoices,
				allowedGroups: [
					COGNITO_SUPER_ADMIN_GROUP,
					COGNITO_CORPORATION_ADMIN_GROUP,
					COGNITO_COMPANY_ADMIN_GROUP,
				],
				requiredSubmodule: SUBMODULE_KEYS.INVOICE_MANAGEMENT_VIEW,
			},
			{
				id: "promo-codes",
				label: PROMO_CODES_PAGE_CONTENT.managementTitle,
				icon: Tag,
				path: ROUTES.promoCodes.root,
				allowedGroups: [COGNITO_SUPER_ADMIN_GROUP],
			},
		],
	},
	{
		title: "Assessments",
		items: [
			{
				id: "assessments",
				label: "Assessments",
				icon: ClipboardList,
				path: ROUTES.assessments.root,
				allowedGroups: [...ASSESSMENT_DIRECTORY_ALLOWED_GROUPS],
				requiredSubmodule: SUBMODULE_KEYS.ASSESSMENT_LIST,
			},
			{
				id: "invite-management",
				label: INVITE_MANAGEMENT_PAGE_CONTENT.breadcrumbsTitle,
				icon: FileSliders,
				path: ROUTES.inviteManagement.root,
				allowedGroups: [COGNITO_SUPER_ADMIN_GROUP],
			},
		],
	},
	{
		title: "Configuration",
		items: [
			{
				id: SETTINGS_SIDEBAR_ITEM.id,
				label: SETTINGS_SIDEBAR_ITEM.label,
				icon: Settings,
				path: ROUTES.settings.root,
				requiredSubmodule: [
					SUBMODULE_KEYS.SETTINGS_PROFILE,
					SUBMODULE_KEYS.SETTINGS_SECURITY,
					SUBMODULE_KEYS.SETTINGS_PRIVACY,
				],
				requiredSubmoduleMode: "any",
			},
		],
	},
] as const;

export const SIDEBAR_LOADING = {
	ariaLabel: "Loading navigation",
	skeletonItemCount: 6,
} as const;

export const HEADER_CONTENT = {
	goToDashboard: "Go to dashboard",
	notifications: "Notifications",
	profile: "Profile",
	settings: "Settings",
	signOut: "Sign Out",
	themeLight: "Light",
	themeDark: "Dark",
	themeLabel: "Theme",
} as const;

/** Coach persona sidebar — Main / Scheduling / Configuration. */
export const COACH_SIDEBAR_MENU: SidebarMenuSection[] = [
	{
		title: "Main",
		items: [
			{
				id: "coach-dashboard",
				label: "Dashboard",
				icon: LayoutDashboard,
				path: ROUTES.coachDashboard.root,
				allowedGroups: [COGNITO_COACH_GROUP],
				requiredSubmodule: SUBMODULE_KEYS.COACH_DASHBOARD_VIEW,
			},
			{
				id: "user-directory",
				label: "User Directory",
				icon: Users,
				path: ROUTES.userDirectory.root,
				allowedGroups: [...USER_DIRECTORY_ALLOWED_GROUPS],
				requiredSubmodule: SUBMODULE_KEYS.USER_DIRECTORY_VIEW,
			},
		],
	},
	{
		title: "Scheduling",
		items: [
			{
				id: "coach-calendar",
				label: "Calendar",
				icon: CalendarDays,
				path: ROUTES.coachCalendar.root,
				allowedGroups: [COGNITO_COACH_GROUP],
				requiredSubmodule: SUBMODULE_KEYS.COACH_DASHBOARD_VIEW,
			},
			{
				id: "coach-sessions",
				label: "Sessions",
				icon: Video,
				path: ROUTES.coachSessions.root,
				allowedGroups: [COGNITO_COACH_GROUP],
				requiredSubmodule: SUBMODULE_KEYS.COACH_DASHBOARD_VIEW,
			},
		],
	},
	{
		title: "Configuration",
		items: [
			{
				id: "coach-settings",
				label: "Settings",
				icon: Settings,
				path: ROUTES.coachSettings.root,
				allowedGroups: [COGNITO_COACH_GROUP],
				requiredSubmodule: SUBMODULE_KEYS.COACH_DASHBOARD_VIEW,
			},
		],
	},
];

export const USER_DROPDOWN_LABELS = {
	profileOverview: "Profile Overview",
	logOut: "Log Out",
	userMenu: "User menu",
} as const;
