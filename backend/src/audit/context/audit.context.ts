import { Request } from 'express';

/** Internal key for audit "before" snapshot on the Express request (HTTP lifecycle–scoped). */
const AUDIT_BEFORE_KEY = '__auditBeforeSnapshot';

/**
 * Sets the "before" snapshot on the HTTP request for the audit interceptor.
 * Uses the Express `request` object so "before" survives RxJS/Nest subscription boundaries
 * (AsyncLocalStorage alone does not reliably propagate through Observable chains).
 *
 * Call from a request-scoped service before performing update/delete.
 */
export function setAuditBefore(
  request: Request,
  snapshot: Record<string, unknown>,
): void {
  (request as unknown as Record<string, unknown>)[AUDIT_BEFORE_KEY] = snapshot;
}

/**
 * Reads the "before" snapshot from the request (used by the audit interceptor).
 */
export function getAuditBeforeFromRequest(
  request: Request,
): Record<string, unknown> | undefined {
  const value = (request as unknown as Record<string, unknown>)[
    AUDIT_BEFORE_KEY
  ];
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
