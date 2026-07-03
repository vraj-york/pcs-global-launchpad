# Coach — Settings / Calendar Sync — Backend Implementation Plan

Backend support for the coach **Settings → Calendar Sync** tab (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, node `4:22046`). Frontend: `frontend/src/components/dashboard/coach-dashboard/CoachCalendarSyncTab.tsx`, rendered inside `CoachSettings` (route `/coach-settings` → `CoachSettingsPage`) when the **Calendar Sync** tab is active.

The tab shows two third-party integration cards — **Outlook Calendar** (Microsoft Graph) and **Zoom Workplace** — each with a **Connect** button that starts an **OAuth 2.0 authorization-code** flow. The connect actions are currently placeholders (toast) until the OAuth endpoints exist. Align with the existing NestJS + Prisma + Cognito + AWS (ECS Fargate / ALB / RDS Postgres / Secrets Manager) stack.

---

## 1. Persona / AuthZ

- Coach persona: Cognito group `pcs-coach`, gated with `CognitoAuthGuard` + `AuthorizationGuard` + `@RequireSubmodule(SETTINGS_PROFILE)` (or a dedicated `SETTINGS_CALENDAR_SYNC`).
- Resolve the coach via `@CurrentUser()`; every connection row is scoped to `coachId = currentUser.id`.
- OAuth **state** must be a signed, single-use token bound to the coach + provider (CSRF protection); validate on callback.

---

## 2. Data Model (Prisma — `prisma/schema.prisma`)

```prisma
enum CalendarProvider { OUTLOOK ZOOM }

model CoachIntegration {
  id            String           @id @default(cuid())
  coachId       String
  provider      CalendarProvider
  status        String           // "connected" | "disconnected" | "error"
  externalEmail String?          // connected account label
  scopes        String[]         // granted scopes
  // tokens are NOT stored in plain columns — see §5 (Secrets Manager / KMS)
  tokenRef      String?          // pointer/ARN to the encrypted token bundle
  connectedAt   DateTime?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  coach         User             @relation(fields: [coachId], references: [id])

  @@unique([coachId, provider])
}
```

- One row per coach+provider; `@@unique` keeps it idempotent.
- Refresh/access tokens are **encrypted at rest** (KMS) and stored via Secrets Manager, referenced by `tokenRef` — never returned to the client.

---

## 3. Endpoints (new module `src/coach-integrations`)

All authenticated, coach-scoped, except the provider callback (validated by signed `state`).

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/coach-integrations` | List connection status per provider. | Card state (Connect vs Connected) |
| `POST` | `/coach-integrations/:provider/connect` | Returns the provider `authorizeUrl` (with signed `state`). | Connect Outlook / Connect Zoom |
| `GET` | `/coach-integrations/:provider/callback` | OAuth redirect target: exchange `code`→tokens, persist, then redirect back to `/coach-settings?tab=calendar-sync`. | Post-consent return |
| `DELETE` | `/coach-integrations/:provider` | Disconnect / revoke tokens. | (Disconnect state, follow-up) |

`:provider` ∈ `outlook` | `zoom`.

### Connect response

```jsonc
// POST /coach-integrations/outlook/connect
{ "authorizeUrl": "https://login.microsoftonline.com/…/authorize?…&state=<signed>" }
```

The frontend redirects the browser to `authorizeUrl`; the provider returns to the `callback` route, which finalizes and redirects to the app. `GET /coach-integrations` then reflects `connected`.

### Status response (drives the cards)

```jsonc
// GET /coach-integrations
{
  "outlook": { "status": "disconnected" },
  "zoom":    { "status": "connected", "externalEmail": "coach@org.com", "connectedAt": "2026-05-10T…Z" }
}
```

DTOs via `class-validator` (`ProviderParamDto`). Wrap responses in the app's standard response envelope.

---

## 4. Provider specifics

- **Outlook / Microsoft Graph**: authorize `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`, token endpoint `/oauth2/v2.0/token`; scopes `offline_access Calendars.ReadWrite User.Read`. Used to create/update calendar events for coaching sessions (ties into the calendar plan's scheduling).
- **Zoom**: authorize `https://zoom.us/oauth/authorize`, token `https://zoom.us/oauth/token` (Basic auth with client id/secret); scope `meeting:write`. Used to generate the **Join** meeting links referenced by the dashboard/calendar plans.
- Store `client_id`/`client_secret`/`redirect_uri` per provider in **Secrets Manager**; never in the repo or client bundle.

---

## 5. Service layer

- `CoachIntegrationsService`: builds authorize URLs (signed `state`), handles the token exchange, encrypts + stores tokens (KMS/Secrets Manager, `tokenRef` on the row), refreshes expired access tokens on demand, and revokes on disconnect.
- Downstream: the calendar/session services read a coach's connected providers to push events (Outlook) and create meetings (Zoom) — replacing the placeholder Join/schedule wiring in `coach-calendar-api-plan.md`.
- Register the module in `src/app.module.ts`.

---

## 6. Frontend wiring (follow-up)

- The tab currently shows both cards in the "Connect" state; Connect buttons fire a placeholder toast.
- To productionize: add `getCoachIntegrations()` / `connectCoachIntegration(provider)` / `disconnectCoachIntegration(provider)` to `src/api/coach-dashboard.api.ts` (Axios). On Connect, `window.location.assign(authorizeUrl)`. On mount, load status via React Query and switch each card to a **Connected** state (account email + Disconnect) when `status === "connected"`. Read `?tab=calendar-sync` after the callback redirect to reopen this tab and refetch.

---

## 7. Deployment notes (AWS)

- One **Prisma migration** for `CoachIntegration` on **RDS Postgres** (`09-single-rds-postgres.yaml`); served by NestJS on **ECS Fargate** behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`).
- **Secrets Manager** entries for Outlook/Zoom OAuth client credentials; **KMS** key for token encryption at rest. Register the exact `redirect_uri` (`…/coach-integrations/:provider/callback`) in the Azure and Zoom app registrations.
- Cognito `pcs-coach` group (`04-cognito*.yaml`) provisioned by the coach dashboard work; throttling/WAF already global (`ThrottlerModule`, `07-waf.yaml`). Ensure the callback route is allow-listed for the provider redirect (no auth header) while still validating the signed `state`.
