# Coach — Settings / Profile Overview — Backend Implementation Plan

Backend support for the coach **Settings → Profile Overview** screen (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, node `4:21839`). The frontend preview lives at `frontend/src/components/dashboard/coach-dashboard/CoachSettings.tsx` (route `/coach-settings` → `CoachSettingsPage`), reusing the shared settings primitives (`SettingsProfileAvatar`, `FormInput`, `Select`, `Textarea`, `Button`).

The screen is the **same account Settings shell** already used by other personas (`SettingsPageContent` → `GET/PATCH /users/me/profile`), with two coach-specific additions:

1. A **Coaching Details** card (Professional Title, Years of Experience, Bio).
2. Two extra tabs in the tab bar — **Availability** and **Calendar Sync** — which are separate Figma nodes and out of scope here (the preview renders them as placeholders until those nodes are built).

Currently the coach form is backed by static placeholder data in `coach-dashboard.const.ts` (`COACH_SETTINGS_CONTENT.profile`). Align with the existing NestJS + Prisma + Cognito + AWS (ECS Fargate / ALB / RDS Postgres / SES) stack — **no new service**, only an extension of the existing profile module.

---

## 1. Persona / AuthZ

- Coach persona: Cognito group `pcs-coach` (provisioned alongside the other coach plans), gated with `CognitoAuthGuard` + `AuthorizationGuard` + `@RequireSubmodule(SETTINGS_PROFILE)`.
- Resolve the current user via `@CurrentUser()`; the profile is always the caller's own (`/users/me/*`). No cross-user access.
- **Managed-by-organization fields** (First Name, Last Name, Email) stay read-only for coaches (lock icon + "Managed by your organization" tooltip) — they are sourced from Cognito / the identity provider and are **never** accepted in the PATCH body for non-super-admin callers (enforce server-side, ignore/strip if present).

---

## 2. Data Model (Prisma — `prisma/schema.prisma`)

Reuse the existing `User`/`UserProfile` record used by `GET /users/me/profile`. Add coach-scoped profile columns (nullable, so non-coach users are unaffected):

- `professionalTitle  String?`
- `yearsOfExperience  Int?`
- `bio                String?  @db.Text`

These can live on `UserProfile` directly or on a `CoachProfile` 1:1 extension table keyed by `userId` (preferred if coach attributes will grow — e.g., availability, calendar-sync tokens). A single migration; no data backfill required.

Editable personal fields already modeled: `nickname`, `workPhone`, `cellPhone`, `timezone`.

---

## 3. Endpoints (extend module `src/users`)

All authenticated, self-scoped. Reuse the existing profile endpoints — **no new routes**:

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/users/me/profile` | Current profile incl. new coach fields. | Prefills the whole form |
| `PATCH` | `/users/me/profile` | Partial update of editable fields. | Save & Update |
| `POST` | `/users/me/avatar` | Upload avatar (multipart). | Change Avatar |
| `DELETE` | `/users/me/avatar` | Remove avatar. | Remove |

### GET response — add coach fields (extends existing `data`)

```jsonc
// GET /users/me/profile → data
{
  "firstName": "Matt",            // read-only (managed by org)
  "lastName":  "Henry",           // read-only (managed by org)
  "email":     "matt_henry@email.com", // read-only (managed by org)
  "nickname":  "",
  "workPhone": "+1 (323) 344-0987",
  "cellPhone": "+1 (333) 998-7865",
  "timezone":  "EST (Eastern Time)",
  "avatar":    "https://…signed-s3-url…",
  // coach-only (null for non-coaches):
  "professionalTitle": "Executive & Leadership Coach",
  "yearsOfExperience": 12,
  "bio": "Helping leaders unlock their behavioral potential through evidence-based coaching."
}
```

### PATCH payload — extend `PatchMyProfileDto`

```jsonc
// PATCH /users/me/profile  (only changed keys sent; * = required when present)
{
  "nickname":          "…",
  "workPhone":         "+1 (323) 344-0987", // * non-empty (required field in UI)
  "cellPhone":         "…",
  "timezone":          "EST (Eastern Time)",
  "professionalTitle": "Executive & Leadership Coach",
  "yearsOfExperience": 12,   // integer ≥ 0
  "bio":               "…"   // max length (e.g. 1000 chars)
}
```

Validation via `class-validator` on `PatchMyProfileDto`: `workPhone` `@IsNotEmpty` (mirrors the UI's required Work Phone), `yearsOfExperience` `@IsInt() @Min(0) @Max(80)`, `bio` `@MaxLength(1000)`, phone fields `@Matches(<phone regex>)`. Server strips managed-by-org fields (`firstName`/`lastName`/`email`) from the body for coach callers. Wrap responses in the app's standard response envelope.

---

## 4. Service layer

- Extend `UsersService.updateMyProfile` to persist the new coach columns when present; return the full updated projection so the client refetches.
- Avatar upload/remove already handled by the existing S3-backed flow (`S3Module`, signed URLs) — the coach screen reuses it verbatim.
- No new module registration required.

---

## 5. Frontend wiring (follow-up)

- The preview currently uses static `COACH_SETTINGS_CONTENT.profile` + local `useState` with a placeholder save timeout.
- To productionize: reuse the shared `useUsersStore` (`fetchUserProfile` / `updateMyProfile` / `uploadMyAvatar` / `removeMyAvatar`) exactly as `SettingsProfileOverviewTab` does, extend `UserProfile` / `PatchMyProfilePayload` / `settingsProfileFormSchema` with `professionalTitle`, `yearsOfExperience`, `bio`, and render the Coaching Details card from the same react-hook-form instance.
- Longer term, the coach **Coaching Details** card could be folded into the shared `SettingsProfileOverviewTab` behind a coach role/permission check (like `showCorporationCompanySection` for end users), replacing this standalone preview once the `pcs-coach` group exists.
- Wire the **Availability** and **Calendar Sync** tabs when those Figma nodes are implemented.

---

## 6. Deployment notes (AWS)

- One **Prisma migration** for the three nullable coach columns (or a `CoachProfile` table) on **RDS Postgres** (`09-single-rds-postgres.yaml`); served by NestJS on **ECS Fargate** behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`).
- Cognito `pcs-coach` group (`04-cognito*.yaml`) provisioned by the coach dashboard work; managed-by-org identity fields continue to flow from the IdP.
- Avatar assets in the existing **S3** bucket with signed URLs (no new bucket). Throttling/WAF already global (`ThrottlerModule`, `07-waf.yaml`).
