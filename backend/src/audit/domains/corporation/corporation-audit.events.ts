/**
 * Corporation audit event types.
 * These events track Super Admin actions on corporations for compliance and security.
 */
export const CORPORATION_AUDIT_EVENTS = {
  // View events
  VIEW: 'VIEW',

  // Add events
  ADD: 'ADD',

  // Edit events
  EDIT: 'EDIT',

  // Remove events
  REMOVE: 'REMOVE',

  // Status change events
  SUSPENDED: 'SUSPENDED',
  REINSTATED: 'REINSTATED',
  CLOSED: 'CLOSED',
} as const;

export type CorporationAuditEvent =
  (typeof CORPORATION_AUDIT_EVENTS)[keyof typeof CORPORATION_AUDIT_EVENTS];
