export type {
  EntityStatusCountBreakdown,
  UserStatusCountBreakdown,
  SystemAnalyticsBreakdown as SuperAdminSystemAnalytics,
} from '../common/system-analytics.types';

/** Shape of corporation + nested activity used for "inactive tenant" counting. */
export type CorporationActivityRow = {
  createdAt: Date;
  updatedAt: Date;
  companies: { updatedAt: Date }[];
  appUsers: { updatedAt: Date; lastSeenAt: Date | null }[];
};
