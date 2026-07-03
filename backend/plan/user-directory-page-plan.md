# User Directory page — backend mapping

Figma node `4:20394` (`PCS_Global_Coach_Persona_Launchpad_Test`) is the **User Directory** admin page
(app shell + sidebar + header, title/subtitle, search + filters, sortable/paginated user table, row
actions). This page is **already implemented** in the dev repo and is a superset of the static mock —
**no new backend work is required**. This file documents the existing wiring for traceability.

## Frontend (existing)

- Page: `src/pages/user-directory/UserDirectoryPage.tsx` → `AppLayout` (sidebar + header) + heading + `UserDirectoryContent`.
- Content: `src/components/user-directory/UserDirectoryContent.tsx` — search (debounced, ≥3 chars),
  status/category filters, More Filters dialog (corporation/company/timezone, RBAC-gated for super admin),
  `DataTable` with server sort + server pagination ("Showing X to Y of N results"), row actions.
- Columns: `src/tables/users/UserDirectoryColumn.tsx` — User ID (`formatCode`), User Name + email,
  Corporation (name + `CORP` code), Company (name + region), Work Phone No., Time Zone, Actions
  (view `Eye` + kebab: edit / block-unblock / resend / cancel invite / remove).
- Card/header use `index.css` tokens only: `WhiteBox` (`bg-background`, `border-border`, `rounded-lg`),
  `text-heading-4`, `text-small text-text-secondary`.
- This change aligned the on-page H1/subtitle copy to the design
  (`title: "User Directory"`, `subtitle: "Manage users across overall organization"` in
  `src/const/users/user-directory.const.ts`) so it matches the breadcrumb and sidebar label.

## API (existing, in `useUsersStore` / `src/api`)

| Concern | Endpoint pattern |
| --- | --- |
| List (search, sort, page, status/category/corp/company/timezone filters) | `GET /users` |
| Block / unblock | `PATCH /users/:id/block` (mode flag) |
| Remove | `DELETE /users/:id` |
| Resend invite | `POST /users/:id/resend-invite` |
| Cancel invitation | `POST /users/:id/cancel-invite` |
| Bulk invite | `POST /users/invite/bulk` |
| Filter option sources | `GET /corporations`, `GET /companies` (active), `GET /role-categories` |

## Auth / deployment

- Controller guards: `CognitoAuthGuard`, `AuthorizationGuard`, `@RequireSubmodule` with
  `USER_DIRECTORY_*` submodule keys (view/edit/block/remove/resend/cancel/invite/bulk-upload),
  enforced on the client via `usePermissions` + `PermissionGate`. No IaC changes.
