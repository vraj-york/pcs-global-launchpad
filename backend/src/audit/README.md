# Audit Module

Centralized security and audit logging for the application. Provides SuperAdmin visibility into security-relevant events (e.g. password reset, corporation and company actions).

## Directory Structure

```
audit/
├── audit.module.ts          # NestJS module (AuditModule, AuditGlobalModule)
├── audit.service.ts         # Core: logEvent(), findAuditLogs()
├── audit.controller.ts      # GET /audit (SuperAdmin only)
├── constants/
│   ├── audit.domains.ts     # Domain constants (add new domains here)
│   └── audit.messages.ts
├── dto/
│   └── query-audit-logs.dto.ts
├── decorators/
│   └── auditable.decorator.ts   # @Auditable for automatic audit
├── interceptors/
│   └── audit.interceptor.ts    # Captures and logs @Auditable endpoints
├── types/
│   └── audit.types.ts
├── domains/                 # Domain-specific event definitions
│   ├── password-reset/
│   │   └── password-reset-audit.events.ts
│   ├── corporation/
│   │   └── corporation-audit.events.ts
│   └── index.ts
└── README.md
```

## Automatic Audit (Recommended)

The preferred way to add audit to HTTP endpoints is the **interceptor + `@Auditable`** approach. An **interceptor** (not HTTP middleware) runs after the route handler and only logs on success.

### Benefits

- **Centralized**: Audit logic in one place
- **Consistent**: Same audit format across endpoints
- **Less code**: No manual `AuditService` calls or `@CurrentUser()` / `@ClientIp()` for audit
- **Automatic**: User ID, IP address, and entity ID are extracted by the interceptor
- **Configurable**: Per-endpoint control via decorator options
- **Error-safe**: Audit failures are logged but do not break the main request

### Setup

1. **Import `AuditGlobalModule` in `AppModule`** (already done).
2. **Add `@Auditable({ domain, eventType, entityIdParam | entityIdPath })`** to handler methods.
3. No manual `AuditService` injection or `logEvent()` calls needed for those endpoints.

### @Auditable options

| Option | Description |
|--------|-------------|
| `domain` | Audit domain (use `AUDIT_DOMAINS.*` from `constants/audit.domains.ts`) |
| `eventType` | Event type (use domain events e.g. `CORPORATION_AUDIT_EVENTS.VIEW`) |
| `entityIdParam` | Request param name to use as entity ID (e.g. `'id'`, `'companyId'`) |
| `entityIdPath` | Dot path into response for entity ID (e.g. `'data.id'`, `'data.items[0].id'`) |
| `target` | For role/permission: `'Role'` or `'Permission'` — enables before/after metadata in the log |
| `enabled` | Whether to audit this endpoint (default: `true`) |

Use **one** of `entityIdParam` or `entityIdPath` when the event is tied to an entity. Use `target` for role and permission endpoints so the interceptor stores before/after snapshots. For EDIT/REMOVE, the service must call `setAuditBefore(request, snapshot)` with the Express `request` (role service is request-scoped and injects `REQUEST`) so the “before” state survives the RxJS pipeline.

### Examples

**Entity ID from URL parameter**

```typescript
import { Auditable, AUDIT_DOMAINS, CORPORATION_AUDIT_EVENTS } from '../audit';

@Get(':id')
@Auditable({
  domain: AUDIT_DOMAINS.CORPORATION,
  eventType: CORPORATION_AUDIT_EVENTS.VIEW,
  entityIdParam: 'id',
})
async findOne(@Param('id') id: string): Promise<ApiResponse> {
  return await this.corporationService.findOne(id);
}
```

**Entity ID from response**

```typescript
@Post()
@Auditable({
  domain: AUDIT_DOMAINS.CORPORATION,
  eventType: CORPORATION_AUDIT_EVENTS.ADD,
  entityIdPath: 'data.id',
})
async create(@Body() dto: CreateDto): Promise<ApiResponse> {
  return await this.corporationService.create(dto);
}
```

**No entity ID (e.g. password reset)**

```typescript
@Post('request')
@Auditable({
  domain: AUDIT_DOMAINS.PASSWORD_RESET,
  eventType: PASSWORD_RESET_AUDIT_EVENTS.RESET_REQUEST,
})
async requestReset(@Body() dto: RequestResetDto): Promise<ApiResponse> {
  return await this.passwordResetService.requestReset(dto);
}
```

**Conditional audit**

```typescript
@Auditable({
  domain: AUDIT_DOMAINS.CORPORATION,
  eventType: CORPORATION_AUDIT_EVENTS.VIEW,
  entityIdParam: 'id',
  enabled: process.env.NODE_ENV === 'production',
})
```

### What the interceptor captures

- **Actor (User ID)**: `request.user.sub` (set by auth guard)
- **Action type**: `eventType` from `@Auditable` (e.g. ADD, EDIT, REMOVE)
- **Target**: When `target: 'Role'` or `'Permission'`, stored in log metadata
- **Before/after**: When `target` is set, "before" from `setAuditBefore()` in the service (EDIT/REMOVE), "after" from response `data`
- **IP address**: First value in `X-Forwarded-For` header, or `request.ip`
- **Entity ID**: From request params or response path as configured
- **Timestamp**: Set by the database (`createdAt`)

**Immutability**: Audit logs are append-only; no update or delete APIs are exposed. Records are immutable for security and compliance.

### Behaviour

- **Success only**: Only successful responses are audited; failed requests do not create audit logs.
- **Non-blocking**: Logging is fire-and-forget; audit failures are logged and do not affect the HTTP response.

---

## Role and permission auditing

All role and permission changes are audited for security, compliance, and traceability.

**Role** (domain `AUDIT_DOMAINS.ROLE`):

- **Role creation** (ADD): audited with `target: 'Role'`; "after" from response.
- **Role updates** (EDIT): audited with before/after snapshots (name, category, description, flags, permissionIds). The role service calls `setAuditBefore(request, …)` on the HTTP request so the interceptor can store the previous state (not AsyncLocalStorage—RxJS would drop that context).
- **Role deletion** (REMOVE): audited with "before" snapshot; "after" is omitted.

**Permission** (domain `AUDIT_DOMAINS.PERMISSION`):

- **Permission metadata edits**: When you add endpoints to create/update/delete or edit permission metadata (e.g. code, name, description, moduleId, action), use `@Auditable({ domain: AUDIT_DOMAINS.PERMISSION, eventType: 'ADD'|'EDIT'|'REMOVE', entityIdPath or entityIdParam, target: 'Permission' })` and call `setAuditBefore(request, …)` in the service for EDIT/REMOVE so before/after are recorded.

---

## Manual audit (when needed)

Use manual `AuditService.logEvent()` when:

- The code is not an HTTP handler (e.g. background job, queue consumer), or
- You need custom logic (e.g. different entity ID or domain based on branch).

### Adding a new domain (manual or automatic)

1. **Add domain constant** in `constants/audit.domains.ts`:

   ```ts
   export const AUDIT_DOMAINS = {
     // ...
     MY_DOMAIN: 'my_domain',
   } as const;
   ```

2. **Create event definitions** in `domains/<domain>/`:

   ```ts
   // domains/my-domain/my-domain-audit.events.ts
   export const MY_DOMAIN_AUDIT_EVENTS = {
     VIEW: 'VIEW',
     ADD: 'ADD',
     EDIT: 'EDIT',
     REMOVE: 'REMOVE',
   } as const;
   ```

3. **Export from `domains/index.ts`**:

   ```ts
   export * from './my-domain';
   ```

4. **Use in controllers**: either add `@Auditable(...)` or inject `AuditService` and call `logEvent()` with `AUDIT_DOMAINS.MY_DOMAIN` and the relevant event constant.

### Manual logEvent example

```ts
import { AuditService, AUDIT_DOMAINS, CORPORATION_AUDIT_EVENTS } from '../audit';
import { CurrentUser, ClientIp } from '../auth';

constructor(
  private readonly corporationService: CorporationService,
  private readonly auditService: AuditService,
) {}

async findOne(
  @Param('id') id: string,
  @CurrentUser() user: { sub: string },
  @ClientIp() ipAddress: string | null,
): Promise<ApiResponse> {
  const result = await this.corporationService.findOne(id);
  await this.auditService.logEvent({
    domain: AUDIT_DOMAINS.CORPORATION,
    eventType: CORPORATION_AUDIT_EVENTS.VIEW,
    userId: user.sub,
    entityId: id,
    ipAddress,
  });
  return result;
}
```

Ensure the feature module imports `AuditModule`.

---

## Audited domains and events

### Password reset (`password_reset`)

- `RESET_REQUEST` – reset requested or code resent
- `CODE_VALIDATED` – reset code validated
- `RESET_COMPLETION` – password reset completed

### Corporation (`corporation`)

- **View**: `VIEW` – corporation detail viewed
- **Add**: `ADD` – corporation added; also used for company/key_contact/branding_logo add under corporation
- **Edit**: `EDIT` – corporation/company/key_contact updated
- **Remove**: `REMOVE` – e.g. branding logo removed
- **Status**: `SUSPENDED`, `REINSTATED`, `CLOSED`

---

## Logged attributes

Each audit record includes:

- `domain` – Entity type (e.g. `corporation`, `company`, `password_reset`)
- `eventType` – Action (e.g. `VIEW`, `ADD`, `EDIT`, `REMOVE`)
- `entityId` – ID of the entity acted on (if applicable)
- `userId` – Actor (Cognito sub; null if unauthenticated)
- `ipAddress` – Client IP when available (from `X-Forwarded-For` or `request.ip`)
- `createdAt` – Timestamp (set by DB)

---

## Querying audit logs

SuperAdmins can query logs via **GET /audit** with:

- `domain` – e.g. `corporation`, `password_reset`
- `eventType` – e.g. `VIEW`, `ADD`
- `userId` – Cognito sub
- `entityId` – Target entity ID
- `page` – 1-based (default: 1)
- `limit` – Per page (default: 50, max: 100)
- `sortBy` – `createdAt` | `domain` | `eventType` (default: `createdAt`)
- `sortOrder` – `asc` | `desc` (default: `desc`)

---

## Security

- No passwords, tokens, or other sensitive data are logged.
- Audit logs are immutable (no update/delete).
- **GET /audit** is restricted to the SuperAdmin Cognito group.
- Only successful operations are audited; failed requests are not logged.
- Audit logging errors are caught and logged; they do not affect the main request flow.
