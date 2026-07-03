# Coach Resources Section — Backend Implementation Plan

Backend support for the new **Resources** section on the Coach Persona Dashboard
(Figma `PCS_Global_Coach_Persona_Launchpad_Test`, node `4:19379`). The frontend
renders it today from static placeholder data in
`frontend/src/const/dashboard/coach-dashboard.const.ts` (`COACH_RESOURCES`) via
`frontend/src/components/dashboard/coach-dashboard/Resources.tsx`. This plan
describes the API + data layer needed to make it a manageable, live resource
library, aligned with the existing **NestJS + Prisma + Cognito + AWS
(ECS Fargate / ALB / RDS Postgres / S3)** stack.

Model the module on the existing `backend/src/super-admin-dashboard` and
`backend/src/support-request` modules (controller + service + module + DTOs), and
reuse the RBAC / auth primitives in `backend/src/auth`. This is a companion to
`coach-dashboard-api-plan.md`.

---

## 1. Scope & behaviour

Each Resource card is: a coloured illustration (accent), a bold heading
(`lead` + `connector`) and an underlined link (`linkLabel` → `href`). The section
is read-mostly for coaches and editable by admins (curated content, not
user-generated). Cards can point to internal routes (e.g. `/support`) or external
URLs (release notes, help center, playbook PDF).

- **Coaches / end users:** `GET` published resources (ordered), scoped by
  audience + tenant.
- **Super admins:** full CRUD to curate the library.

---

## 2. Persona / AuthZ

- Read endpoint requires an authenticated user (`CognitoAuthGuard`). It is
  available to the Coach persona (see `COGNITO_COACH_GROUP` in
  `coach-dashboard-api-plan.md`) and any persona whose dashboard embeds the
  section.
- Admin CRUD guarded with `CognitoAuthGuard` + `AuthorizationGuard` and
  `@RequireSubmodule(...)`. Register a submodule key `COACH_RESOURCES_MANAGE`
  in `src/auth/rbac/submodule.registry.ts`, seeded via
  `prisma/seed-submodules.ts` + `seed-roles.ts` (limited to
  `COGNITO_SUPER_ADMIN_GROUP`).
- Resolve tenant scope (`corporationId` / `companyId`) and current user from
  `@CurrentUser()`, consistent with other controllers.

---

## 3. Data model (Prisma — `prisma/schema.prisma`)

```prisma
model CoachResource {
  id            String          @id @default(uuid())
  lead          String          // bold heading lead-in
  connector     String          @default("in") // "in" | "on"
  linkLabel     String          // underlined link text
  href          String          // internal path or absolute URL
  accent        ResourceAccent  @default(BLUE) // GREEN | BLUE | RED (maps to brand tokens)
  icon          String          @default("book-open") // lucide key: book-open | sparkles | life-buoy
  thumbnailKey  String?         // optional S3 object key for a custom illustration
  audience      ResourceAudience @default(COACH) // COACH | ALL
  sortOrder     Int             @default(0)
  isPublished   Boolean         @default(true)
  corporationId String?         // null = global/platform-wide
  companyId     String?
  createdBy     String?         // FK -> AppUser
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([audience, isPublished, sortOrder])
  @@index([corporationId, companyId])
}

enum ResourceAccent { GREEN BLUE RED }
enum ResourceAudience { COACH ALL }
```

Generate a migration (`prisma migrate dev`) and commit it under
`prisma/migrations/`. Seed the three default cards (matching the current
`COACH_RESOURCES` placeholders) in `prisma/seed.ts`.

> Note: `accent`/`icon` intentionally map to the frontend design-token contract
> (brand-token gradients + `lucide-react` keys) so no raw colours are stored or
> sent — the client resolves them against `index.css` tokens.

---

## 4. Endpoints (module `src/coach-resources`)

Base path `/coach-resources`. Responses use the app's standard response
envelope/interceptor used by other modules.

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/coach-resources?audience=COACH` | Published resources for the caller's tenant + audience, ordered by `sortOrder` then `createdAt`. | Resources section (whole grid) |
| `POST` | `/coach-resources` | Create a resource (admin). | Admin curation |
| `PATCH` | `/coach-resources/:id` | Update a resource (admin). | Admin curation |
| `PATCH` | `/coach-resources/reorder` | Bulk update `sortOrder` (admin). | Drag-reorder in admin |
| `DELETE` | `/coach-resources/:id` | Soft-delete / unpublish (admin). | Admin curation |

### Representative response shape (matches frontend `CoachResource` type)

```jsonc
// GET /coach-resources?audience=COACH
[
  { "id": "…", "lead": "Master your coaching workflow", "connector": "in",
    "linkLabel": "the Coach Playbook", "href": "/support",
    "icon": "book-open", "accent": "green" },
  { "id": "…", "lead": "Recap the latest platform updates", "connector": "on",
    "linkLabel": "Release notes", "href": "https://…",
    "icon": "sparkles", "accent": "blue" }
]
```

The API returns `accent` lower-cased (`green|blue|red`) and `icon` as the lucide
key so the payload drops straight into the existing `COACH_RESOURCES` shape with
no frontend transform.

DTOs (`class-validator`, as in existing DTO folders):
`CreateCoachResourceDto`, `UpdateCoachResourceDto`, `ReorderResourcesDto`,
`ListResourcesQueryDto`. Validate `href` (`@IsUrl({ require_tld: false })` to
allow internal paths, or a custom validator accepting `^/` paths), `accent` /
`icon` against allowed enums/keys, and `lead`/`linkLabel` length limits.

---

## 5. Service layer

- `CoachResourcesService` (Prisma queries). List filtered by
  `isPublished = true`, `audience IN (requested, ALL)`, and tenant scope
  (`corporationId`/`companyId` = caller's tenant OR `null` for global), ordered
  by `sortOrder`, `createdAt`.
- If `thumbnailKey` is present, return a signed URL via the existing `S3Module`;
  otherwise the client renders the brand-token gradient + lucide icon (already
  the default in `Resources.tsx`).
- Emit audit events on create/update/delete (reuse `AuditModule`
  interceptors/decorators).
- Register `CoachResourcesModule` in `src/app.module.ts` imports.

---

## 6. Frontend wiring (follow-up)

- Add `src/api/coach-resources.api.ts` (Axios, same pattern as other
  `src/api/*`) with `getCoachResources()` and admin `create/update/reorder/delete`.
- Replace the static `COACH_RESOURCES` constant with fetched data
  (React Query/Zustand as used elsewhere), keeping the exact `CoachResource`
  shape so `Resources.tsx` needs no change — it already handles the empty state
  (`COACH_RESOURCES.length === 0`).
- Support external links: when `href` is absolute (`^https?://`), render as an
  anchor with `target="_blank" rel="noreferrer"`; internal paths keep the
  React Router `<Link>` (small enhancement in `ResourceCard`).

---

## 7. Deployment notes (AWS)

- No new infra tiers required — endpoints run inside the existing NestJS service
  on **ECS Fargate** behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`);
  data lives in the existing **RDS Postgres** (`09-single-rds-postgres.yaml`) via
  the new Prisma migration.
- Optional custom illustrations reuse the existing **S3** bucket + `S3Module`
  signed-URL flow; no new bucket needed.
- Run the Prisma migration in the deploy pipeline (`bitbucket-pipelines.yml`)
  prior to the app release, matching the existing migration step.
- Throttling/WAF already applied globally (`ThrottlerModule`, `07-waf.yaml`) — no
  per-endpoint changes needed. Consider a short CDN/`Cache-Control` TTL on the
  public `GET` since resource content is read-mostly.
