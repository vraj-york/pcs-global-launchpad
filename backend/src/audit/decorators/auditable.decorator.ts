import { SetMetadata } from '@nestjs/common';

export interface AuditableOptions {
  /** The audit domain (e.g., 'corporation', 'company', 'role', 'permission') */
  domain: string;
  /** The audit event type (e.g., 'VIEW', 'ADD', 'EDIT', 'REMOVE') */
  eventType: string;
  /**
   * Path to extract entity ID from response data
   * Examples: 'data.id', 'data.items[0].id', 'id'
   */
  entityIdPath?: string;
  /**
   * Path to extract entity ID from request parameters
   * Examples: 'id', 'corporationId', 'companyId'
   */
  entityIdParam?: string;
  /**
   * Path to extract entity ID from request body
   * Examples: 'email', 'id'
   */
  entityIdBodyField?: string;
  /**
   * Target type for metadata (e.g., 'Role', 'Permission').
   * When set, the interceptor will include before/after from AuditContext and response in metadata.
   */
  target?: 'Role' | 'Permission';
  /** Whether to audit this endpoint (default: true) */
  enabled?: boolean;
}

export const AUDITABLE_KEY = 'auditable';

/**
 * Decorator to mark endpoints for automatic audit logging
 *
 * @example
 * ```typescript
 * @Auditable({
 *   domain: 'corporation',
 *   eventType: 'VIEW',
 *   entityIdParam: 'id'
 * })
 * async findOne(@Param('id') id: string) { ... }
 *
 * @Auditable({
 *   domain: 'corporation',
 *   eventType: 'ADD',
 *   entityIdPath: 'data.id'
 * })
 * async create(@Body() dto: CreateDto) { ... }
 * ```
 */
export const Auditable = (options: AuditableOptions) =>
  SetMetadata(AUDITABLE_KEY, options);
