export type EntityStatusCountBreakdown = {
  total: number;
  active: number;
  incomplete: number;
  suspended: number;
  closed: number;
};

export type UserStatusCountBreakdown = {
  total: number;
  active: number;
  pending: number;
  blocked: number;
  cancelled: number;
  expired: number;
  deleted: number;
};

export type AssessmentCountBreakdown = {
  completed: number;
  inprogress: number;
  /** Mean days from `started_at` to `completed_at` for rows with both timestamps; null when none qualify. */
  avgTimeToComplete: number | null;
};

export type SystemAnalyticsBreakdown = {
  corporations: EntityStatusCountBreakdown;
  companies: EntityStatusCountBreakdown;
  users: UserStatusCountBreakdown;
  assessments: AssessmentCountBreakdown;
};

/** Corporation Admin dashboard: companies, users, and assessments (caller owns one corporation). */
export type CorporationAdminDashboardAnalytics = {
  companies: EntityStatusCountBreakdown;
  users: UserStatusCountBreakdown;
  assessments: AssessmentCountBreakdown;
};

/** Company Admin dashboard: users and assessments for the caller's admin company. */
export type CompanyAdminDashboardAnalytics = {
  users: UserStatusCountBreakdown;
  assessments: AssessmentCountBreakdown;
};
