# Coach session row-actions dropdown (node `4:24474`)

Figma node `4:24474` ("Dropdown - Companies") is the more-actions (⋮) menu shown on an **upcoming**
coach session card: a white popover (1px `#DDD9EB` border, `shadow-md`, 8px radius, 2px padding) with two
menu items:

- **Quick Prep** — `zap` icon, `#2F414A` text.
- **Cancel Session** — `calendar-x-2` icon, `#C44755` (destructive) text with a `#FDF3F3`
  (destructive-tint) hover/active background.

## Frontend

The dropdown itself already existed (visually pixel-accurate) in `components/dashboard/coach-dashboard/
CoachSessions.tsx` (`SessionCard`), built from the app's `DropdownMenu` primitives with `Zap` +
`CalendarX2` (lucide) and the `DropdownMenuItem variant="destructive"` (which supplies the `#C44755` text
and `#FDF3F3` focus background). **Its items were dead** (no handlers), and the equivalent footer buttons in
`SessionDetailsPanel` were also dead.

- **Changed:** `components/dashboard/coach-dashboard/CoachSessions.tsx`
  - `SessionCard` now takes `onQuickPrep` / `onCancelSession`; the two `DropdownMenuItem`s call them via
    `onSelect`.
  - `SessionDetailsPanel` footer "Quick Prep" / "Cancel Session" buttons wired to the same handlers.
  - `CoachSessions` adds `quickPrep` (`Partial<QuickPrepData> | null`) and `cancelOpen` state, maps the
    selected session into the Quick Prep data (sessionType/client fields), and renders the existing
    `QuickPrepModal` and `CancelSessionModal` — mirroring how `CoachCalendar.tsx` already wires them.
- **Reused, no change:** `QuickPrepModal` (node `4:21790`) and `CancelSessionModal` (node `4:21822`) — both
  already built on `components/common/ContentModal` + `components/ui`, and `components/ui/dropdown-menu`.
  No new assets; all styling from `index.css` tokens (`text-text-foreground`, `text-destructive`,
  `bg-destructive/10`, `border-border`).

## Backend / API (not yet implemented — mock data today)

The coach dashboard currently renders from mock consts (`COACH_SCHEDULED_SESSIONS`) and both modals use
placeholder `setTimeout`s. To make these actions real, add coach-scoped session endpoints (NestJS, mirroring
the existing auth-guarded controllers; align with the LaunchPad/project-management backend session model):

- **Quick Prep context** — `GET /coach/sessions/:sessionId/quick-prep`
  - Returns the fields the modal shows: `lastSessionOn`, `sessionType`, `client { name, email, initials,
    avatarUrl }`, `lastSessionNotes`.
  - Auth: coach JWT (Cognito), authorization check that the session belongs to the requesting coach.
- **Cancel session** — `POST /coach/sessions/:sessionId/cancel`
  - Body: `{ reason: string (required), notify: boolean }` (matches `CancelSessionValues`).
  - Effects: set session `status = cancelled`, persist `reason`; if `notify`, enqueue a client
    notification email (SES) / in-app notification. Returns the updated session.
  - Auth: coach JWT + ownership check; validate non-empty `reason` server-side (mirrors the client
    `requiredError`).
- **Data model:** reuse the existing `Session` entity (add `cancellationReason` + `cancelledAt` if absent);
  no new table strictly required.
- **Deployment (AWS):** no new infra beyond the existing API service + RDS (session table) + SES (for the
  notify email) already used by the platform; wire behind the same API Gateway / ALB and Cognito authorizer
  as other coach endpoints.

Wire the frontend `onConfirm` (CancelSessionModal) and Quick Prep `data` fetch to these endpoints when they
land (replacing the `setTimeout` placeholders); the UI contract already matches the payloads above.
