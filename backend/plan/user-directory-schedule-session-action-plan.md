# User Directory — "Schedule Session" row action (node `4:22214`)

Figma node `4:22214` ("Dropdown - For Active Users") adds a **Schedule Session** item (calendar-days
icon) to the User Directory row-actions menu. It only appears for **active** users and lets a coach
schedule a coaching session with that user directly from the directory.

This reuses existing surfaces almost entirely — the only genuinely new backend artifact is one **RBAC
submodule permission**; the scheduling itself reuses the coach session endpoint.

## Frontend (this change)

- `tables/users/UserDirectoryColumn.tsx`
  - New optional `onScheduleSessionClick` handler + `permissions.canScheduleSession` (defaults `false`,
    so existing admin personas are unaffected).
  - Renders a `Schedule Session` `DropdownMenuItem` (`CalendarDays` icon) **only** when the row is active
    (`status` ∉ pending/blocked/expired/cancelled) and `canScheduleSession` is true.
- `components/user-directory/UserDirectoryContent.tsx`
  - Derives `canScheduleSession` from `can(SUBMODULE_KEYS.USER_DIRECTORY_SCHEDULE_SESSION)`.
  - Opens the existing `ScheduleSessionModal` (`components/dashboard/coach-dashboard`) for the selected
    user (no equivalent recreated).
- `const/rbac/submodule-keys.const.ts` — new key `USER_DIRECTORY_SCHEDULE_SESSION =
  "user_directory.schedule_session"`.
- `const/users/user-directory.const.ts` — `USER_ACTION_LABELS.scheduleSession = "Schedule Session"`.
- No new colors/spacing; uses existing `dropdown-menu`, `button`, icon tokens (`text-icon-primary`).

## API

### Reused (no new endpoint for scheduling)

| Concern | Endpoint |
| --- | --- |
| Create the session | `POST /coach-dashboard/sessions` (existing — see `coach-sessions-page-api-plan.md`) |
| Client options in modal | `GET /coach/clients` / directory user id used to prefill `clientId` |

The modal currently posts `{ title, date, startTime, endTime, clientId, description, notify }`. When
launched from a directory row, `clientId` should be **prefilled** with the selected user's id (the row's
`id`) so the coach schedules against that specific active user. Wiring the prefill is a small follow-up on
`ScheduleSessionModal` (accept an optional `defaultClient`); the endpoint contract is unchanged.

### New — RBAC only

- Register submodule permission **`user_directory.schedule_session`** in the RBAC seed/config alongside
  the other `user_directory.*` submodules (`view_users_contacts`, `edit_user`, `block_user`, …). Grant it
  to the **Coach** role so the action is visible only to coaches; admin roles that lack it never see it.
- No new tables/DTOs: reuses the RBAC submodule/permission model already backing `GET /me/permissions`
  (the `can()` hook) and the existing `CoachingSession` model.

## Auth / deployment

- The action is gated client-side by the RBAC `can()` check and enforced server-side by the existing
  `POST /coach-dashboard/sessions` guard (Cognito `CognitoAuthGuard` + coach authorization). No new
  infrastructure is required — same NestJS + Prisma + Cognito + AWS (ECS Fargate / ALB / RDS Postgres)
  stack; scheduling notifications (the modal's "notify client" switch) reuse the existing SES email path
  used by the coach sessions module.
- Until a dedicated Coach Cognito group is provisioned, `user_directory.schedule_session` simply remains
  ungranted for current personas, so the row action stays hidden (safe default).
