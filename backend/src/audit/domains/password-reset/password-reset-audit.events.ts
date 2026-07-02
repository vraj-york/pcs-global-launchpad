/**
 * Password reset audit event types.
 * No passwords or tokens are ever logged.
 */
export const PASSWORD_RESET_AUDIT_EVENTS = {
  RESET_REQUEST: 'RESET_REQUEST',
  CODE_VALIDATED: 'CODE_VALIDATED',
  RESET_COMPLETION: 'RESET_COMPLETION',
  RESET_FAILED: 'RESET_FAILED',
} as const;

export type PasswordResetAuditEvent =
  (typeof PASSWORD_RESET_AUDIT_EVENTS)[keyof typeof PASSWORD_RESET_AUDIT_EVENTS];
