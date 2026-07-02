/** GET /users/me/analytics-context — `data` payload (no PII). */
export type MeAnalyticsContextData = {
	corporationId: string | null;
	companyIds: string[];
	primaryCompanyId: string | null;
	inviteType: string | null;
	isB2cAssessmentOnly: boolean;
};
