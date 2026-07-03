# Coach Welcome / "Coaching Toolkit" Banner — Backend Implementation Plan

Backend support for the new **welcome / intro banner** on the Coach Persona
Dashboard (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, node `4:19414`). The
frontend renders it from static copy in
`frontend/src/const/dashboard/coach-dashboard.const.ts` (`welcome` +
`COACH_WELCOME_HIGHLIGHTS`) via
`frontend/src/components/dashboard/coach-dashboard/WelcomeBanner.tsx`.

This is a **low-backend** feature: an intro heading, a one-line description, and a
small cluster of "launch highlight" cards. Most deployments can ship it fully
static. This plan describes the optional API to make the copy + highlights
editable, aligned with the existing **NestJS + Prisma + Cognito + AWS
(ECS Fargate / ALB / RDS Postgres)** stack, and **reuses** the models proposed in
the companion plans rather than adding new infrastructure.

Companion to `coach-dashboard-api-plan.md`, `coach-resources-api-plan.md`, and
`coach-early-access-waitlist-api-plan.md`.

---

## 1. Recommended approach — reuse, don't duplicate

The banner's "launch highlights" are the same concept as the beta features in
`coach-early-access-waitlist-api-plan.md` (`BetaFeature`). Prefer surfacing them
from that model rather than creating a parallel table:

- Highlights = `BetaFeature` rows where `isReleased = true` (i.e. "biggest
  launches", already shipped), ordered by `sortOrder`, limited to N.
- The banner heading/description are editorial copy → store as a small key/value
  **`DashboardContent`** row (see §2) or keep static in the frontend `const`.

If a deployment wants the banner fully static, **no backend work is required** —
the current implementation already reads from `const`.

---

## 2. Optional data model (Prisma — `prisma/schema.prisma`)

Only if editable copy is desired. Otherwise skip and keep static.

```prisma
model DashboardContent {
  id        String   @id @default(uuid())
  key       String   @unique // "coach.welcome"
  title     String
  body      String
  updatedAt DateTime @updatedAt
}
```

Highlights reuse `BetaFeature` (defined in the early-access plan) — add an
`icon` (`String`, lucide key) and `accent` (`String`: blue|green|yellow) column
there if not already present, so the same rows can drive both the "coming soon"
and "toolkit highlights" surfaces.

---

## 3. Endpoints (extend `src/super-admin-dashboard` or a small `src/dashboard-content` module)

Base path `/dashboard-content`. Read is authenticated; write is admin-only
(`AuthorizationGuard` + a `DASHBOARD_CONTENT_MANAGE` submodule key, seeded via
`prisma/seed-submodules.ts` + `seed-roles.ts`, limited to
`COGNITO_SUPER_ADMIN_GROUP`).

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/dashboard-content/coach-welcome` | Returns `{ title, description, highlights[] }` (highlights = released `BetaFeature`s, mapped to `{ label, icon, accent }`). | Welcome banner |
| `PUT` | `/dashboard-content/coach-welcome` *(admin)* | Update the heading/description copy. | Admin editor |

```jsonc
// GET /dashboard-content/coach-welcome
{
  "title": "Your coaching toolkit",
  "description": "Get up to speed on everything you need to guide your clients with confidence.",
  "highlights": [
    { "label": "AI session summaries", "icon": "sparkles", "accent": "blue" },
    { "label": "Client progress insights", "icon": "trending-up", "accent": "green" },
    { "label": "Smart scheduling", "icon": "calendar-clock", "accent": "yellow" }
  ]
}
```

The response matches the frontend `welcome` + `CoachWelcomeHighlight` shapes so it
drops in with no transform. DTO: `UpdateDashboardContentDto` (`class-validator`).

---

## 4. Service layer

- Read: fetch the `DashboardContent` row for `coach.welcome` (fallback to
  hardcoded defaults if absent) + released `BetaFeature`s for highlights.
- Cache: content is read-mostly — safe to cache in-process or via a short
  `Cache-Control` TTL.
- Register the module in `src/app.module.ts` if a new one is created; otherwise
  add the two handlers to `super-admin-dashboard`.

---

## 5. Frontend wiring (follow-up)

- Add `getCoachWelcomeContent()` to `src/api/coach-dashboard.api.ts` (or the
  early-access api file) and hydrate `WelcomeBanner.tsx`, keeping the current
  static `welcome` / `COACH_WELCOME_HIGHLIGHTS` as the fallback.

---

## 6. Deployment notes (AWS)

- No new infra tiers — runs in the existing NestJS service on **ECS Fargate**
  behind the **ALB**; data (if enabled) in the existing **RDS Postgres** via a
  small migration. Reuses the `BetaFeature` table from the early-access plan.
- Run any migration in the deploy pipeline (`bitbucket-pipelines.yml`) before the
  app release. Throttling/WAF already applied globally — no changes needed.
