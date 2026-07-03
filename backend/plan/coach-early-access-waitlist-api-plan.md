# Coach "What's Coming Soon" / Early-Access Waitlist — Backend Implementation Plan

Backend support for the new **"What's coming soon"** early-access hero on the
Coach Persona Dashboard (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, node
`4:19398`). The frontend renders it from static copy in
`frontend/src/const/dashboard/coach-dashboard.const.ts` (`comingSoon`) via
`frontend/src/components/dashboard/coach-dashboard/ComingSoon.tsx`, with the CTA
currently pointing at `/support`. This plan describes the API + data layer to make
the **"Request early access"** CTA a working waitlist join, aligned with the
existing **NestJS + Prisma + Cognito + AWS (ECS Fargate / ALB / RDS Postgres /
SES)** stack.

Model the module on the existing `backend/src/support-request` module (a close
analogue: authenticated user submits a request → persisted → email/notification),
plus the RBAC/auth primitives in `backend/src/auth`. Companion to
`coach-dashboard-api-plan.md` and `coach-resources-api-plan.md`.

---

## 1. Scope & behaviour

The hero announces upcoming beta features (e.g. AI session summaries, client
progress insights, smart scheduling) and lets a coach **join the wait list** for
early access.

- **Coach clicks "Request early access"** → one-click join for the currently
  advertised beta program (idempotent — a repeat click is a no-op / returns the
  existing entry, and the button should reflect a "You're on the list" state).
- **Optionally** the coach can pick specific features to opt into.
- **Admins** see the waitlist and toggle which features are "coming soon".

---

## 2. Persona / AuthZ

- Join endpoint requires an authenticated user (`CognitoAuthGuard`); resolve the
  requester from `@CurrentUser()`. Available to the Coach persona
  (`COGNITO_COACH_GROUP`, see `coach-dashboard-api-plan.md`).
- Admin list/manage endpoints guarded with `CognitoAuthGuard` +
  `AuthorizationGuard` and a new submodule key `EARLY_ACCESS_MANAGE`
  (register in `src/auth/rbac/submodule.registry.ts`; seed via
  `prisma/seed-submodules.ts` + `seed-roles.ts`, limited to
  `COGNITO_SUPER_ADMIN_GROUP`).
- Tenant scope (`corporationId`/`companyId`) captured from the user for
  reporting/segmentation.

---

## 3. Data model (Prisma — `prisma/schema.prisma`)

```prisma
model BetaFeature {
  id          String   @id @default(uuid())
  key         String   @unique // "ai-session-summaries" | "client-progress-insights" | ...
  label       String   // "AI-assisted session summaries"
  description String?
  isAnnounced Boolean  @default(true)  // shown in the "coming soon" hero
  isReleased  Boolean  @default(false)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  waitlist    WaitlistEntry[]
}

model WaitlistEntry {
  id            String        @id @default(uuid())
  userId        String        // FK -> AppUser
  featureId     String?       // null = whole program; else specific BetaFeature
  corporationId String?
  companyId     String?
  status        WaitlistStatus @default(REQUESTED) // REQUESTED | GRANTED | NOTIFIED
  createdAt     DateTime      @default(now())

  feature       BetaFeature?  @relation(fields: [featureId], references: [id])

  @@unique([userId, featureId]) // idempotent join per feature/program
  @@index([status, createdAt])
}

enum WaitlistStatus { REQUESTED GRANTED NOTIFIED }
```

Generate a migration (`prisma migrate dev`), commit under `prisma/migrations/`,
and seed the currently advertised `BetaFeature` rows (matching the frontend
`comingSoon.features` copy) in `prisma/seed.ts`.

---

## 4. Endpoints (module `src/early-access`)

Base path `/early-access`. Responses use the app's standard response
envelope/interceptor.

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/early-access/features` | Announced beta features (`isAnnounced=true`), ordered by `sortOrder`, plus the caller's join status per feature. | Hero heading + bullet list + button state |
| `POST` | `/early-access/waitlist` | Join the waitlist. Body: `{ featureKeys?: string[] }` (omit = whole program). Idempotent via the `@@unique` constraint. | "Request early access" |
| `DELETE` | `/early-access/waitlist/:featureKey` | Leave the waitlist for a feature (optional). | Undo |
| `GET` | `/early-access/waitlist` *(admin)* | Paginated waitlist with user + feature + tenant, filterable by `status`/`featureKey`. | Admin review |
| `PATCH` | `/early-access/features/:id` *(admin)* | Toggle `isAnnounced`/`isReleased`, edit label/order. | Admin manage |

### Representative response shapes

```jsonc
// GET /early-access/features
{
  "title": "Be the first to try new updates",
  "features": [
    { "key": "ai-session-summaries", "label": "AI-assisted session summaries", "joined": false },
    { "key": "client-progress-insights", "label": "Client progress insights", "joined": true }
  ],
  "joinedProgram": true
}

// POST /early-access/waitlist  { "featureKeys": ["ai-session-summaries"] }
{ "status": "REQUESTED", "joinedAt": "2026-07-03T08:48:00Z" }
```

DTOs (`class-validator`, per existing DTO folders): `JoinWaitlistDto`
(`@IsArray()` `@IsString({each:true})` optional `featureKeys`),
`ListWaitlistQueryDto`, `UpdateBetaFeatureDto`.

---

## 5. Service layer

- `EarlyAccessService` (Prisma). `join()` upserts `WaitlistEntry` rows
  (idempotent) inside a transaction; returns current status.
- On first join, send a confirmation email via the existing **`EmailModule`**
  (SES — same pattern as `support-request`) and optionally notify the admin
  distribution list. Do not block the HTTP response on email — enqueue/await per
  the module's existing convention.
- Emit audit events (reuse `AuditModule`) on join/leave and admin feature toggles.
- Register `EarlyAccessModule` in `src/app.module.ts` imports.

---

## 6. Frontend wiring (follow-up)

- Add `src/api/early-access.api.ts` (Axios, same pattern as other `src/api/*`):
  `getBetaFeatures()`, `joinWaitlist(featureKeys?)`, `leaveWaitlist(featureKey)`.
- In `ComingSoon.tsx`: fetch features to drive the bullet list; convert the CTA
  from a `/support` `Link` into an action button that calls `joinWaitlist()`,
  with `isLoading` (Button already supports it), a success state
  ("You're on the list ✓"), and error handling via the app's toast (`sonner`).
  Keep the current static copy as the fallback until the API ships.

---

## 7. Deployment notes (AWS)

- No new infra tiers — endpoints run in the existing NestJS service on
  **ECS Fargate** behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`); data
  in the existing **RDS Postgres** (`09-single-rds-postgres.yaml`) via the new
  Prisma migration.
- Email uses the existing **SES** setup consumed by `EmailModule`; no new
  identities needed if reusing the current sender. Store any provider secrets in
  **Secrets Manager** (consistent with `08b-db-credentials-secret.yaml`).
- Run the Prisma migration in the deploy pipeline (`bitbucket-pipelines.yml`)
  before the app release, matching the existing migration step.
- Throttling/WAF already applied globally (`ThrottlerModule`, `07-waf.yaml`);
  consider a tighter per-route rate limit on `POST /early-access/waitlist` to
  deter abuse.
