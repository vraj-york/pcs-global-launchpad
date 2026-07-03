import { Navigate } from "react-router-dom";
import {
	ProtectedRoute,
	PublicRoute,
	RoleGuardRoute,
	SubmoduleGuardRoute,
	SubscriptionGuardRoute,
} from "@/components";
import {
	ASSESSMENT_DIRECTORY_ALLOWED_GROUPS,
	COGNITO_COMPANY_ADMIN_GROUP,
	COGNITO_CORPORATION_ADMIN_GROUP,
	COGNITO_SUPER_ADMIN_GROUP,
	ROUTES,
	SUBMODULE_KEYS,
	USER_DIRECTORY_ALLOWED_GROUPS,
} from "@/const";
import {
	AddCompanyPage,
	AddContactPage,
	AddCorporationAdvancedSetupPage,
	AddCorporationQuickSetupPage,
	AddPromoCodePage,
	AddRolePage,
	AssessmentPage,
	AssessmentReportPrintPage,
	AssessmentReportResultsPage,
	AssessmentsDirectoryPage,
	BillingDetailPage,
	ChatbotPage,
	ChooseSetupPage,
	CoachCalendarPage,
	CoachDashboardPage,
	CoachSessionsPage,
	CompanyDirectoryPage,
	CompanyOverviewPage,
	CorporateDirectoryPage,
	CorporationOverviewPage,
	DashboardPage,
	EditBillingDetailsPage,
	EditPromoCodePage,
	EditRolePage,
	EndUserOnboardingPage,
	FinanceBillingPage,
	ForgotPasswordPage,
	InviteManagementPage,
	InviteUserPage,
	InvoiceManagementPage,
	LoginPage,
	PlansPricingPage,
	PrivacyPolicyPage,
	PromoCodesManagementPage,
	RolesPermissionsPage,
	SendAssessmentInvitePage,
	SettingsPage,
	SubprocessorsPage,
	SupportPage,
	TermsOfUsePage,
	UserDirectoryPage,
	ViewCompanyPage,
	ViewContactDetailsPage,
	ViewCorporationPage,
	ViewPlanPricingPage,
	ViewPromoCodeDetailsPage,
	ViewUserDetailsPage,
} from "@/pages";
import type { RouteConfig } from "@/types";

export const routes: RouteConfig[] = [
	{
		path: "/",
		element: <Navigate to={ROUTES.auth.login} replace />,
	},
	{
		path: ROUTES.auth.login,
		element: (
			<PublicRoute>
				<LoginPage />
			</PublicRoute>
		),
	},
	{
		path: ROUTES.auth.forgotPassword,
		element: (
			<PublicRoute>
				<ForgotPasswordPage />
			</PublicRoute>
		),
	},
	{
		path: ROUTES.auth.support,
		element: <SupportPage />,
	},
	{
		path: ROUTES.auth.privacyPolicy,
		element: <PrivacyPolicyPage />,
	},
	{
		path: ROUTES.auth.subprocessors,
		element: <SubprocessorsPage />,
	},
	{
		path: ROUTES.auth.termsOfUse,
		element: <TermsOfUsePage />,
	},
	{
		path: ROUTES.auth.onboarding,
		element: (
			<ProtectedRoute>
				<EndUserOnboardingPage />
			</ProtectedRoute>
		),
	},
	// Protected Dashboard routes
	{
		path: ROUTES.dashboard.root,
		element: (
			<ProtectedRoute>
				<DashboardPage />
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.coachDashboard.root,
		element: (
			<ProtectedRoute>
				<CoachDashboardPage />
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.coachSessions.root,
		element: (
			<ProtectedRoute>
				<CoachSessionsPage />
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.coachCalendar.root,
		element: (
			<ProtectedRoute>
				<CoachCalendarPage />
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.corporationOverview.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_CORPORATION_ADMIN_GROUP]}>
					<SubmoduleGuardRoute
						required={SUBMODULE_KEYS.CORPORATION_OVERVIEW_VIEW}
					>
						<CorporationOverviewPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.companyOverview.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_COMPANY_ADMIN_GROUP]}>
					<SubmoduleGuardRoute required={SUBMODULE_KEYS.COMPANY_OVERVIEW_VIEW}>
						<CompanyOverviewPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: "/super-admin/product-analytics",
		element: (
			<ProtectedRoute>
				<Navigate to={ROUTES.dashboard.root} replace />
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.corporateDirectory.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<CorporateDirectoryPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.companyDirectory.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute
					allowedGroups={[
						COGNITO_SUPER_ADMIN_GROUP,
						COGNITO_CORPORATION_ADMIN_GROUP,
					]}
				>
					<CompanyDirectoryPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.companyDirectory.add,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<AddCompanyPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.companyDirectory.addWithId,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<AddCompanyPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.companyDirectory.view,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute
					allowedGroups={[
						COGNITO_SUPER_ADMIN_GROUP,
						COGNITO_CORPORATION_ADMIN_GROUP,
					]}
				>
					<ViewCompanyPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.corporateDirectory.view,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<ViewCorporationPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.corporateDirectory.chooseSetup,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<ChooseSetupPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.corporateDirectory.add,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<AddCorporationQuickSetupPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.corporateDirectory.addWithId,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<AddCorporationQuickSetupPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.corporateDirectory.addAdvanced,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<AddCorporationAdvancedSetupPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.corporateDirectory.addAdvancedWithId,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<AddCorporationAdvancedSetupPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	//Chatbot Route — monthly plan only
	{
		path: ROUTES.chatbot.root,
		element: (
			<ProtectedRoute>
				<SubscriptionGuardRoute requiredAccess="chatbot">
					<ChatbotPage />
				</SubscriptionGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.userDirectory.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={USER_DIRECTORY_ALLOWED_GROUPS}>
					<SubmoduleGuardRoute required={SUBMODULE_KEYS.USER_DIRECTORY_VIEW}>
						<UserDirectoryPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.userDirectory.invite,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={USER_DIRECTORY_ALLOWED_GROUPS}>
					<SubmoduleGuardRoute required={SUBMODULE_KEYS.USER_DIRECTORY_INVITE}>
						<InviteUserPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.userDirectory.addContact,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={USER_DIRECTORY_ALLOWED_GROUPS}>
					<SubmoduleGuardRoute required={SUBMODULE_KEYS.USER_DIRECTORY_INVITE}>
						<AddContactPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.userDirectory.contactEdit,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={USER_DIRECTORY_ALLOWED_GROUPS}>
					<SubmoduleGuardRoute
						required={SUBMODULE_KEYS.USER_DIRECTORY_EDIT_CONTACT}
					>
						<ViewContactDetailsPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.userDirectory.contactView,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={USER_DIRECTORY_ALLOWED_GROUPS}>
					<SubmoduleGuardRoute required={SUBMODULE_KEYS.USER_DIRECTORY_VIEW}>
						<ViewContactDetailsPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.userDirectory.edit,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={USER_DIRECTORY_ALLOWED_GROUPS}>
					<SubmoduleGuardRoute required={SUBMODULE_KEYS.USER_DIRECTORY_EDIT}>
						<ViewUserDetailsPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.userDirectory.view,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={USER_DIRECTORY_ALLOWED_GROUPS}>
					<SubmoduleGuardRoute required={SUBMODULE_KEYS.USER_DIRECTORY_VIEW}>
						<ViewUserDetailsPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.roles.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<RolesPermissionsPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.plansPricing.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<PlansPricingPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.plansPricing.view,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<ViewPlanPricingPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.promoCodes.add,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<AddPromoCodePage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.promoCodes.edit,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<EditPromoCodePage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.promoCodes.view,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<ViewPromoCodeDetailsPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.promoCodes.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<PromoCodesManagementPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.roles.add,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<AddRolePage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.roles.edit,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<EditRolePage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.finance.billingDetail,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<SubmoduleGuardRoute
						required={SUBMODULE_KEYS.BILLING_MANAGEMENT_VIEW}
					>
						<BillingDetailPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.finance.billingEdit,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<SubmoduleGuardRoute
						required={SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT}
					>
						<EditBillingDetailsPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.finance.billing,
		element: (
			<ProtectedRoute>
				<SubmoduleGuardRoute required={SUBMODULE_KEYS.BILLING_MANAGEMENT_VIEW}>
					<FinanceBillingPage />
				</SubmoduleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.finance.invoices,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute
					allowedGroups={[
						COGNITO_SUPER_ADMIN_GROUP,
						COGNITO_CORPORATION_ADMIN_GROUP,
						COGNITO_COMPANY_ADMIN_GROUP,
					]}
				>
					<SubmoduleGuardRoute
						required={SUBMODULE_KEYS.INVOICE_MANAGEMENT_VIEW}
					>
						<InvoiceManagementPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.inviteManagement.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<InviteManagementPage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.inviteManagement.sendInvite,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={[COGNITO_SUPER_ADMIN_GROUP]}>
					<SendAssessmentInvitePage />
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.assessments.root,
		element: (
			<ProtectedRoute>
				<RoleGuardRoute allowedGroups={ASSESSMENT_DIRECTORY_ALLOWED_GROUPS}>
					<SubmoduleGuardRoute required={SUBMODULE_KEYS.ASSESSMENT_LIST}>
						<AssessmentsDirectoryPage />
					</SubmoduleGuardRoute>
				</RoleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.assessment.reportResults,
		element: (
			<ProtectedRoute>
				<SubmoduleGuardRoute required={SUBMODULE_KEYS.ASSESSMENT_VIEW_RESULT}>
					<SubscriptionGuardRoute alwaysAccessible>
						<AssessmentReportResultsPage />
					</SubscriptionGuardRoute>
				</SubmoduleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.assessment.reportPrint,
		element: (
			<ProtectedRoute>
				<SubmoduleGuardRoute required={SUBMODULE_KEYS.ASSESSMENT_VIEW_RESULT}>
					<AssessmentReportPrintPage />
				</SubmoduleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.assessment.root,
		element: (
			<ProtectedRoute>
				<SubmoduleGuardRoute required={SUBMODULE_KEYS.ASSESSMENT_TAKE}>
					<SubscriptionGuardRoute requiredAccess="assessment">
						<AssessmentPage />
					</SubscriptionGuardRoute>
				</SubmoduleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: ROUTES.settings.root,
		element: (
			<ProtectedRoute>
				<SubmoduleGuardRoute
					required={[
						SUBMODULE_KEYS.SETTINGS_PROFILE,
						SUBMODULE_KEYS.SETTINGS_SECURITY,
						SUBMODULE_KEYS.SETTINGS_PRIVACY,
					]}
					mode="any"
				>
					<SettingsPage />
				</SubmoduleGuardRoute>
			</ProtectedRoute>
		),
	},
	{
		path: "*",
		element: <Navigate to="/" replace />,
	},
];
