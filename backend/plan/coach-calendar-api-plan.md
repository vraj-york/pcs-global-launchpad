# Coach — Calendar (Week + Month View) — Backend Implementation Plan

Backend support for the coach's **Calendar** page (Figma `PCS_Global_Coach_Persona_Launchpad_Test`, nodes `4:21292` "Week View" and `4:21562` "Month View"). The frontend (`frontend/src/components/dashboard/coach-dashboard/CoachCalendar.tsx`, route `/coach-calendar` → `CoachCalendarPage`) renders a Week/Month segmented toggle:

- **Week view** (node `4:21292`): a **week grid** (8 AM–6 PM × Mon–Fri) with color-coded event blocks and a **Session Details** side panel.
- **Month view** (node `4:21562`): a **7-column month grid** (Monday-first, adjacent-month days muted) with per-day event chips (left-border accent: error `#C44755` / success `#2F8F6B` / warning `#CB9127`). Selecting a day drives a side panel showing "`<Weekday>, May D, 2026`" + "N event(s) scheduled" and compact event cards (title / client / time + **Join** + a more-actions dropdown: Reschedule / Quick Prep / Cancel Session).

Both views are currently backed by static placeholder data in `frontend/src/const/dashboard/coach-dashboard.const.ts` (`COACH_CALENDAR_EVENTS`, `COACH_CALENDAR_DAYS` for the week; `COACH_CALENDAR_MONTH_WEEKS`, `COACH_CALENDAR_MONTH_SELECTED_DATE`, `calendarPage.monthView` for the month).

The calendar is a **time-windowed projection of the same `CoachingSession` data** used by the dashboard and Sessions pages. It needs **no new tables** — only a date-range query and a detail projection. Align with the existing NestJS + Prisma + Cognito + AWS (ECS Fargate / ALB / RDS Postgres) stack.

---

## 1. Persona / AuthZ

- Same coach persona as the other coach plans: Cognito group `pcs-coach`, gated with `CognitoAuthGuard` + `AuthorizationGuard` + `@RequireSubmodule(COACH_DASHBOARD_VIEW)` (or a dedicated `COACH_CALENDAR_VIEW`).
- Resolve the coach via `@CurrentUser()`; every query filtered by `coachId = currentUser.id`.
- Sidebar: add a `Calendar` item (route `/coach-calendar`) to the coach sidebar group once the persona is provisioned. The route added here is reachable directly (preview), like `/coach-dashboard` and `/coach-sessions`.

---

## 2. Data Model (Prisma — `prisma/schema.prisma`)

Reuse `CoachingSession` (see `coach-dashboard-api-plan.md`). The event block colour maps from `CoachingSession.type` / `status`:

- `blue` → the coach's own confirmed 1:1 sessions (default)
- `warning` (gold `#CB9127`) → conflict / attention categories
- `success` (green `#2F8F6B`) → review / completed-goal categories

Store this as a derived `category` on the session or map from `SessionType` in the service (no schema change required). No new tables.

---

## 3. Endpoints (extend module `src/coach-dashboard` / `src/coach-calendar`)

All authenticated, coach-scoped. Timestamps UTC ISO-8601; the client positions blocks from local start/end minutes and formats labels ("May 2026", "May 11 - May 15", "10:00 AM - 10:15 AM").

| Method | Path | Purpose | Maps to UI |
|---|---|---|---|
| `GET` | `/coach/calendar?view=week&start=YYYY-MM-DD` | Sessions within the week starting `start` (inclusive) → grouped by day. | Week grid + prev/next range |
| `GET` | `/coach/calendar?view=month&start=YYYY-MM-01` | Sessions within the calendar month grid (leading/trailing adjacent-month days included) → grouped by day. | Month view grid + per-day chips |
| `GET` | `/coach/sessions/:id` | Full session detail (reuses the Sessions-page endpoint). | "Session Details" side panel |

Detail-panel / block actions reuse existing endpoints (no duplication):

- **Join** → `POST /coach-dashboard/sessions/:id/join`
- **Reschedule** → `PATCH /coach-dashboard/sessions/:id/reschedule`
- **Quick Prep** → `GET /coach-dashboard/sessions/:id/quick-prep`
- **Cancel Session** → `DELETE /coach-dashboard/sessions/:id`
- **Schedule Session** (page header) → `POST /coach-dashboard/sessions`

### Session Quick Prep modal (node `4:21790`)

The **Quick Prep** action (week detail panel + month day-card dropdown) opens the read-only **Session Quick Prep** modal (`frontend/src/components/dashboard/coach-dashboard/QuickPrepModal.tsx`, reused `ContentModal` + `Avatar` + `Button`; 640px, footer Cancel + **Join Session** with the video icon). It shows a prep brief for the upcoming session, backed by the **already-planned** `GET /coach-dashboard/sessions/:id/quick-prep` — **no new endpoint**. Response shape (maps to the modal's `QuickPrepData`):

```jsonc
// GET /coach-dashboard/sessions/:id/quick-prep
{
  "lastSessionOn":   "Apr 28, 2026, 10:00 AM",   // previous session with this client (or null → "—")
  "sessionType":     "Leadership Coaching",       // this session's type/title
  "client":          { "name": "Nicolas Hamilton", "email": "nicolas_hamilton@email.com", "initials": "NH", "avatarUrl": "…" },
  "lastSessionNotes": "Great progress on delegation skills. …"  // the coach's most recent SessionNote for this client
}
```

The service derives `lastSessionOn` / `lastSessionNotes` from the client's most recent completed `CoachingSession` + its `SessionNote`; `sessionType` and `client` from the current session. The **Join Session** footer button reuses `POST /coach-dashboard/sessions/:id/join`. The frontend currently merges event-derived client/type over a static `quickPrepModal.sample` until the endpoint is wired.

### Reschedule Session modal (node `4:21733`)

The **Reschedule** action (week detail panel + month day-card dropdown) opens the **Reschedule Session** modal (`frontend/src/components/dashboard/coach-dashboard/RescheduleSessionModal.tsx`, reused `ContentModal` + `DatePickerInput` + time-range `Popover` + `Switch` + `Textarea`). It collects a new date, a new start/end time (end defaults to start + 15 min per the tooltip), optional additional notes, and a "notify client" toggle, then calls the **already-planned** `PATCH /coach-dashboard/sessions/:id/reschedule` — **no new endpoint**. It reuses `RescheduleSessionDto` (see `coach-dashboard-api-plan.md`):

```jsonc
// PATCH /coach-dashboard/sessions/:id/reschedule
{
  "startsAt": "2026-05-14T10:00:00Z", // from New Date + New Time (start), client-composed in coach tz
  "endsAt":   "2026-05-14T10:15:00Z", // from New Date + New Time (end)
  "notes":    "Weekly one-on-one coaching session for stress management.", // optional (Additional Notes)
  "notifyClient": true                 // "Notify client for updated date & time via email" switch
}
```

Server behaviour (extends the existing reschedule handler): validate the new window against `CoachAvailability` (work window, `bufferMins`, no overlap) → `BadRequestException` on conflict; persist `startsAt`/`endsAt`/`notes`; write a `CoachClientActivity` row + audit event; when `notifyClient` is true, enqueue the reschedule email via the existing **SES** email service (reuse `EmailModule`, same pattern as the verification-code template). Returns the updated session projection so the calendar/detail panel refetches.

### Schedule Session modal (node `4:21751`)

The page-header **Schedule Session** button opens the **Schedule Session** modal (`frontend/src/components/dashboard/coach-dashboard/ScheduleSessionModal.tsx`, reused `ContentModal` + `Input` + `DatePickerInput` + `TimeRangeField` + `Select` + `Textarea` + `Switch`). It collects a session title, date, start/end time (end defaults to start + 15 min per the tooltip), a client, an optional description, and a "notify client" toggle, then calls the **already-planned** `POST /coach-dashboard/sessions` — **no new endpoint**. It reuses `ScheduleSessionDto` (see `coach-dashboard-api-plan.md`):

```jsonc
// POST /coach-dashboard/sessions
{
  "title":    "1:1 Coaching",
  "clientId": "…",                    // from the Client select (coach's assigned clients)
  "startsAt": "2026-05-14T10:00:00Z", // Date + Time (start), client-composed in coach tz
  "endsAt":   "2026-05-14T10:15:00Z", // Date + Time (end)
  "description": "…",                  // optional
  "notifyClient": true                 // "On scheduling, client will be notified via email" switch
}
```

Server behaviour (extends the existing create handler): validate the window against `CoachAvailability` (work window, `bufferMins`, no overlap) → `BadRequestException` on conflict; create the `CoachingSession` (default 15-min duration); write a `CoachClientActivity` row + audit event; when `notifyClient` is true, enqueue the invite email via the existing **SES** `EmailModule`. Returns the created session so the calendar refetches.

- **Client select options** come from the coach's assigned clients — `GET /coach-dashboard/clients` (or the existing client-directory list filtered to the coach). The frontend currently uses a static `scheduleModal.clients` list in `coach-dashboard.const.ts` as placeholder until that endpoint is wired.

### Cancel Session modal (node `4:21822`)

The **Cancel Session** action (week detail panel destructive button + month day-card dropdown item) opens the **Cancel Session** modal (`frontend/src/components/dashboard/coach-dashboard/CancelSessionModal.tsx`, reused `ContentModal` + `Textarea` + `Switch` + destructive `Button`; 500px, footer Cancel + destructive **Cancel Session**). It collects a **required** cancellation reason and a "notify client" toggle (default on), then calls the **already-planned** `DELETE /coach-dashboard/sessions/:id` — **no new endpoint**. Because the reason + notify flag are needed, send them as a body/DTO:

```jsonc
// DELETE /coach-dashboard/sessions/:id   (CancelSessionDto)
{
  "reason":       "Client requested to reschedule to next month.", // required (Reason textarea)
  "notifyClient": true                                             // "On cancelling, client will be notified via email" switch
}
```

Server behaviour (extends the existing cancel handler): mark the `CoachingSession` cancelled (soft-cancel with `status = CANCELLED` + `cancelReason`, preserving history rather than a hard delete); write a `CoachClientActivity` row + audit event; when `notifyClient` is true, enqueue the cancellation email via the existing **SES** `EmailModule`. The stored `cancelReason` is what the Sessions page **View Reason** modal (node `4:21775`) surfaces. Returns success so the calendar/detail panel refetches (cancelled sessions drop out of upcoming views).

### Representative response shape (match frontend `CoachCalendarEvent`)

```jsonc
// GET /coach/calendar?view=week&start=2026-05-11
{
  "rangeLabel": "May 11 - May 15",
  "monthLabel": "May 2026",
  "days": [
    { "date": "2026-05-11", "weekday": "Mon" },
    { "date": "2026-05-12", "weekday": "Tue" }
    // …
  ],
  "events": [
    { "id": "…", "title": "1:1 Coaching", "date": "2026-05-12",
      "startsAt": "2026-05-12T10:00:00Z", "endsAt": "2026-05-12T10:15:00Z",
      "category": "blue",
      "client": { "name": "Nicolas Hamilton", "email": "nicolas.hamilton@email.com", "initials": "NH", "avatarUrl": "…" },
      "description": "Weekly one-on-one coaching session for stress management." }
  ]
}
```

DTOs via `class-validator` (`CalendarQueryDto { view: 'week'|'month'; start: string }`); wrap responses in the app's standard response envelope/interceptor.

---

## 4. Service layer

- `CoachCalendarService` (Prisma, filtered by `coachId`).
- Compute `[rangeStart, rangeEnd)` from `view` + `start` in the coach's timezone (`CoachAvailability.timezone`); query `CoachingSession` where `startsAt` in range, ordered by `startsAt`. For `view=month`, expand the range to the full **Monday-first grid** (lead with the trailing days of the previous month and trail into the next month) so adjacent-month cells render, flagging each returned day with `inMonth`.
- Group events by local day; derive `category`/accent from `type`/`status`; project client name/email/avatar (signed S3 URL via `S3Module`, else initials). Month chips need only `title` + accent + client + `timeRange`; the week grid needs start/end minutes for positioning.
- Return `monthLabel` / `rangeLabel` pre-formatted (or let the client format from the range — current frontend formats labels itself).
- Register the module in `src/app.module.ts`.

---

## 5. Frontend wiring (follow-up)

- Add `getCoachCalendar(view, start)` to `src/api/coach-dashboard.api.ts` (Axios, same pattern as other `src/api/*`).
- Replace the static week data (`COACH_CALENDAR_EVENTS` / `COACH_CALENDAR_DAYS`) and month data (`COACH_CALENDAR_MONTH_WEEKS`) with fetched data (React Query), keeping the `CoachCalendarEvent` / `CoachCalendarMonthDay` shapes so `CoachCalendar.tsx` needs minimal change. Compute the selected-day weekday label from the returned ISO date instead of the current `firstWeekdayIndex` constant.
- Wire prev/next month + range controls to refetch with a new `start`; wire the Week/Month toggle to `view`; wire block/detail/day-card actions (Join / Reschedule / Quick Prep / Cancel Session) to the existing session endpoints.
- **Reschedule** is already wired to open the implemented `RescheduleSessionModal` (week detail panel + month day-card dropdown, prefilling Additional Notes from the session description). Its `onConfirm` currently runs a placeholder timeout; wire it to `rescheduleSession(id, payload)` (Axios) with the payload above, then invalidate the calendar/detail queries on success.
- **Schedule Session** (page header) is already wired to open the implemented `ScheduleSessionModal`. Its `onConfirm` currently runs a placeholder timeout; wire it to `scheduleSession(payload)` and replace the static `scheduleModal.clients` list with `getCoachClients()`, invalidating the calendar query on success.
- **Quick Prep** is already wired to open the implemented `QuickPrepModal` (week detail panel + month day-card dropdown, passing the selected event's client + type). Wire it to `getSessionQuickPrep(id)` to replace the static `quickPrepModal.sample` (`lastSessionOn` / `lastSessionNotes`); the modal's **Join Session** button should call `joinSession(id)`.
- **Cancel Session** is already wired to open the implemented `CancelSessionModal` (week detail panel destructive button + month day-card dropdown). Its `onConfirm` currently runs a placeholder timeout; wire it to `cancelSession(id, { reason, notifyClient })` (Axios) with the payload above, then invalidate the calendar/detail queries on success.

---

## 6. Deployment notes (AWS)

- No new infra tiers and **no new migration** — the calendar reads existing `CoachingSession` rows in **RDS Postgres** (`09-single-rds-postgres.yaml`) via the NestJS service on **ECS Fargate** behind the **ALB** (`05-ecs-fargate.yaml`, `06-alb.yaml`).
- Cognito: `pcs-coach` group (`04-cognito*.yaml`) provisioned by the dashboard work.
- Add a DB index on `CoachingSession(coachId, startsAt)` (already proposed in `coach-dashboard-api-plan.md`) so the week/month range scans stay cheap.
- Video "Join" secrets handled by the dashboard plan (Secrets Manager); throttling/WAF already global (`ThrottlerModule`, `07-waf.yaml`).
