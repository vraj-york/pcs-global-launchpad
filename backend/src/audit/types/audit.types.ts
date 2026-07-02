/**
 * Metadata for role/permission audit records.
 * Captures target type and before/after snapshots for traceability.
 */
export interface AuditMetadata {
  /** Target of the action: 'Role' | 'Permission' */
  target: string;
  /** Snapshot before the action (null for create) */
  before?: Record<string, unknown> | null;
  /** Snapshot after the action (null for delete) */
  after?: Record<string, unknown> | null;
}

export interface LogEventOptions {
  domain: string;
  eventType: string;
  userId: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  /** Optional metadata for role/permission audits (target, before, after) */
  metadata?: AuditMetadata | null;
}
