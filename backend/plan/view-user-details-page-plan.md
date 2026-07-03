# View User Details page — backend mapping

Figma nodes `4:20576` ("View Details - Basic Details") and `4:20713` ("View Details - Assessments &
Results") of `PCS_Global_Coach_Persona_Launchpad_Test` are the two tabs of the same **View User
Details** page (app shell + sidebar + header/breadcrumb, Back + name + `USER-005` + status badges,
tab bar). Both tabs are **already implemented** in the dev repo as a superset of the static mock —
**no new backend work is required**. This file documents the existing wiring and scopes the
coach-persona deltas as follow-up.

- `4:20576` — **Basic Details** tab: **Basic Info.** card + **Corporation & Company Info.** card.
- `4:20713` — **Assessments & Results** tab: filters (All Status / All Time) + sortable, paginated
  assessments table (Assessments / Start Date / End Date / Status / Actions), rendered by
  `AssessmentDirectoryContent` (`variant="adminUser"`).

## Frontend (existing)

- Page: `src/pages/user-directory/ViewUserDetailsPage.tsx` → `AppLayout` (sidebar + header +
  breadcrumb `User Directory > View User Details`), `UserDetailsPageToolbar` (Back button, `<h1>` name,
  `USER-005` + status `BSPBadge`), tab bar, content.
- Content: `src/components/user-directory/ViewUserDetailsContent.tsx` — **Basic Info.** card and
  **Corporation & Company Info.** card, both `components/ui/card` with `CardHeader` (`h-14`,
  `border-b border-border`) + `CardContent`.
- Rows: `components/common` `DetailRow` — label `text-small font-normal text-text-secondary`, value
  `text-small font-medium text-text-foreground`, 1px `border-b border-border` between rows
  (`last:border-b-0`), matching the Figma `#DDD9EB` separators.
- Assessments tab: `src/components/assessment-directory/AssessmentDirectoryContent.tsx`
  (`variant="adminUser"`) — `WhiteBox` card, `components/ui/select` status/time filters, `DataTable`
  with server sort + pagination ("Showing X of Y results"). Columns in
  `src/tables/assessment/AssessmentDirectoryColumn.tsx`: status uses `BSPBadge`
  (`success` = Completed, `pending` = Incomplete); admin actions show `Eye` (view report) + `Download`
  on completed rows only (no Share/Resume), matching the mock.
- Badges/buttons reuse `BSPBadge` + `components/ui/button`; styling uses `index.css` tokens only
  (`bg-background`, `border-border`, `rounded-xl`, `text-heading-4`, `text-brand-primary`,
  `bg-card-foreground` tab track). Field labels/copy live in
  `src/const/users/user-directory.const.ts` (`VIEW_USER_DETAILS_PAGE`, `VIEW_USER_TABS`).

## API (existing)

| Concern | Endpoint pattern |
| --- | --- |
| Load user detail (Basic Info + Corporation/Company + role) | `GET /users/:id` (`getUserById` → `useUsersStore.fetchUserById`) |
| Edit user | `PATCH /users/:id` |
| Block / unblock | `PATCH /users/:id/block` |
| Remove | `DELETE /users/:id` |
| Cancel invitation | `PATCH /users/:id/invitation/cancel` |
| Resend invite | `POST /users/:id/invitation/resend` |
| Assessments tab list (admin view of a user) | `GET /assessments/users/:cognitoSub` (page/limit/sortBy/sortOrder/status/timeFilter) |
| View assessment report | `GET /assessments/:id` (+ report results routes) |
| Download report | presigned report key via `downloadAssessmentReport` |

## Coach-persona deltas (follow-up, not on the shared admin page)

The shared page is used by super-admin / corp-admin / company-admin. The coach mock differs only in
persona chrome; these should be **persona-gated** so the admin experience is not regressed, and depend
on coach-group provisioning (see `coach-dashboard-api-plan.md` §1 — coach routes are standalone
previews until the group is provisioned). No new endpoints needed.

1. **Header action** — coach sees a single primary **"Schedule Session"** button (opens the existing
   session scheduling flow) instead of the admin actions (Edit / Remove / Block / Resend / Cancel).
2. **Third tab "Session Info."** — content already exists as coach components; wire it as a third
   `VIEW_USER_TABS` entry rendered only for the coach persona. The tab has two designed right-panel
   variants (same Upcoming/Past master list): **Session Notes** (node `4:20808`,
   `src/components/dashboard/coach-dashboard/SessionsAndNotes.tsx`) and **Session Details** (node
   `4:21189`, the `SessionDetailsPanel` in
   `src/components/dashboard/coach-dashboard/CoachSessions.tsx`). Backend for both is documented in
   `coach-client-sessions-notes-api-plan.md` and `coach-sessions-page-api-plan.md`.
3. **Basic Info. rows** — coach view omits the `Status` row (status shown as the header badge) and
   `Created On`, and omits the `Role Info.` card; drive via the existing `showOrgRoleSections` /
   persona flag rather than duplicating the component.

## Auth / deployment

- Controller guards: `CognitoAuthGuard`, `AuthorizationGuard`, `@RequireSubmodule` with
  `USER_DIRECTORY_*` submodule keys; enforced client-side via `usePermissions`. No IaC changes.
