/**
 * Audit domain constants. Add new domains here as services adopt audit logging.
 * Used for filtering and categorizing audit events across the application.
 */
export const AUDIT_DOMAINS = {
  PASSWORD_RESET: 'password_reset',
  CORPORATION: 'corporation',
  COMPANY: 'company',
  KEY_CONTACT: 'key_contact',
  EXECUTIVE_SPONSOR: 'executive_sponsor',
  BRANDING_LOGO: 'branding_logo',
  CORPORATION_ADDRESS: 'corporation_address',
  ROLE: 'role',
  PERMISSION: 'permission',
} as const;

export type AuditDomain = (typeof AUDIT_DOMAINS)[keyof typeof AUDIT_DOMAINS];
