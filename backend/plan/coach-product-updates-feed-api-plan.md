# Coach "What Launched" / Product Updates Feed — Backend Implementation Plan

Backend support for the new **"Explore every update"** section on the Coach
Persona Dashboard (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, node
`4:19407`). The frontend renders it from static copy in
`frontend/src/const/dashboard/coach-dashboard.const.ts` (`whatLaunched` +
`COACH_LAUNCH_UPDATES`) via
`frontend/src/components/dashboard/coach-dashboard/WhatLaunched.tsx` — a heading, a
linked bullet list of shipped updates, a linked footnote, and a right-hand
"updates" navigation panel that mirrors the same list.

This is a **changelog / product-updates** feature. The plan describes the API to
make the update list live, aligned with the existing **NestJS + Prisma + Cognito +
AWS (ECS Fargate / ALB / RDS Postgres)** stack, reusing existing patterns.

Companion to `coach-dashboard-api-plan.md`, `coach-resources-api-plan.md`,
`coach-early-access-waitlist-api-plan.md`, and `coach-welcome-banner-api-plan.md`.

---

## 1. Relationship to the other plans

The three "update"-flavoured surfaces share one underlying concept — a shipped
feature/announcement:

- **What launched** (this plan) = shipped updates → `isReleased = true`.
- **What's coming soon** (`coach-early-access-waitlist`) = `isAnnounced = true, isReleased = false`.
- **Welcome highlights** (`coach-welcome-banner`) = a curated subset of released updates.

**Prefer a single `ProductUpdate` model** driving all three, filtered by status,
rather than three tables. If the `BetaFeature` model from the early-access plan is
adopted first, extend it instead of adding `ProductUpdate`.

---

## 2. Data model (Prisma — `prisma/schema.prisma`)

```prisma
model ProductUpdate {
  id          String            @id @default(uuid())
  title       String            // "Session insights"
  slug        String            @unique
  summary     String?
  href        String?           // deep link / article URL (internal path or absolute)
  status      ProductUpdateStatus @default(RELEASED) // RELEASED | COMING_SOON
  audience    String            @default("COACH")     // COACH | ALL
  publishedAt DateTime?         // used for ordering + "latest" grouping
  sortOrder   Int               @default(0)
  isVisible   Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([status, audience, isVisible, sortOrder])
}

enum ProductUpdateStatus { RELEASED COMING_SOON }
```

Generate a migration (`prisma migrate dev`), commit under `prisma/migrations/`,
and seed the current `COACH_LAUNCH_UPDATES` rows in `prisma/seed.ts`.

---

## 3. Endpoints (module `src/product-updates`)

Base path `/product-updates`. Read is authenticated; write is admin-only
(`AuthorizationGuard` + a `PRODUCT_UPDATES_MANAGE` submodule key, seeded via
`prisma/seed-submodules.ts` + `seed-roles.ts`, limited to
`COGNITO_SUPER_ADMIN_GROUP`). Responses use the app's standard envelope.

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/product-updates?status=RELEASED&audience=COACH` | Visible updates for the caller's audience, ordered by `sortOrder`, `publishedAt desc`. | Left bullet links + right panel list |
| `POST` | `/product-updates` *(admin)* | Create an update. | Admin curation |
| `PATCH` | `/product-updates/:id` *(admin)* | Update / toggle `status`/`isVisible`/`sortOrder`. | Admin curation |
| `DELETE` | `/product-updates/:id` *(admin)* | Soft-delete (set `isVisible=false`). | Admin curation |

```jsonc
// GET /product-updates?status=RELEASED&audience=COACH
[
  { "id": "…", "label": "Session insights", "href": "/support" },
  { "id": "…", "label": "Client progress reports", "href": "/support" },
  { "id": "…", "label": "Smart scheduling", "href": "/support" }
]
```

The response maps 1:1 to the frontend `CoachLaunchUpdate` shape (`id`, `label`,
`href`) — the service projects `title → label`. DTOs (`class-validator`):
`CreateProductUpdateDto`, `UpdateProductUpdateDto`, `ListProductUpdatesQueryDto`
(validate `href` allowing internal `^/` paths or absolute URLs).

---

## 4. Service layer

- `ProductUpdatesService` (Prisma). List filtered by `status`, `audience IN
  (requested, ALL)`, `isVisible = true`, ordered by `sortOrder`, `publishedAt`.
- Read-mostly → safe to cache in-process or via a short `Cache-Control` TTL.
- Emit audit events (reuse `AuditModule`) on admin create/update/delete.
- Register `ProductUpdatesModule` in `src/app.module.ts` imports.

---

## 5. Frontend wiring (follow-up)

- Add `src/api/product-updates.api.ts` (Axios, same pattern as other
  `src/api/*`): `getProductUpdates(status, audience)`.
- Hydrate `WhatLaunched.tsx` (both the left link list and the right `UpdatesPanel`
  read from the same fetched array), keeping the static `COACH_LAUNCH_UPDATES`
  as the fallback. Same feed can power `ComingSoon.tsx` (`status=COMING_SOON`) and
  the welcome highlights.

---

## 6. Deployment notes (AWS)

- No new infra tiers — runs in the existing NestJS service on **ECS Fargate**
  behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`); data in the existing
  **RDS Postgres** (`09-single-rds-postgres.yaml`) via the new Prisma migration.
- Run the migration in the deploy pipeline (`bitbucket-pipelines.yml`) before the
  app release. Throttling/WAF already applied globally (`ThrottlerModule`,
  `07-waf.yaml`); a short CDN/`Cache-Control` TTL on the public `GET` is
  appropriate since the feed is read-mostly.
