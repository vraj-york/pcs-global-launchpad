# View User Details page — backend mapping

Figma node `4:20576` (`PCS_Global_Coach_Persona_Launchpad_Test`, "User Directory / View Details -
Basic Details") is the **View User Details** page (app shell + sidebar + header/breadcrumb, Back +
name + `USER-005` + status badges, tab bar, **Basic Info.** card, **Corporation & Company Info.**
card). The **Basic Details** view is **already implemented** in the dev repo as a superset of the
static mock — **no new backend work is required** for it. This file documents the existing wiring and
scopes the coach-persona deltas as follow-up.

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
| Assessments tab | reuses `AssessmentDirectoryContent` (`variant="adminUser"`, by `cognitoSub`) |

## Coach-persona deltas (follow-up, not on the shared admin page)

The shared page is used by super-admin / corp-admin / company-admin. The coach mock differs only in
persona chrome; these should be **persona-gated** so the admin experience is not regressed, and depend
on coach-group provisioning (see `coach-dashboard-api-plan.md` §1 — coach routes are standalone
previews until the group is provisioned). No new endpoints needed.

1. **Header action** — coach sees a single primary **"Schedule Session"** button (opens the existing
   session scheduling flow) instead of the admin actions (Edit / Remove / Block / Resend / Cancel).
2. **Third tab "Session Info."** — content already exists as
   `src/components/dashboard/coach-dashboard/SessionsAndNotes.tsx` (node `4:20808`); wire it as a third
   `VIEW_USER_TABS` entry rendered only for the coach persona.
3. **Basic Info. rows** — coach view omits the `Status` row (status shown as the header badge) and
   `Created On`, and omits the `Role Info.` card; drive via the existing `showOrgRoleSections` /
   persona flag rather than duplicating the component.

## Auth / deployment

- Controller guards: `CognitoAuthGuard`, `AuthorizationGuard`, `@RequireSubmodule` with
  `USER_DIRECTORY_*` submodule keys; enforced client-side via `usePermissions`. No IaC changes.
