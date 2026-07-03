# User Directory — Corporations quick filter (node `4:22216`)

Figma node `4:22216` (`Dropdown - Companies` → "Corporations" variant) is the **corporations quick-filter
dropdown** for the **User Directory** users tab: a compact menu listing `All Corporations` (selected
default) followed by each corporation (`Acme Corporation`, `Beta Solutions`, `Gamma Industries`,
`Delta Innovations`, `Apex Systems`, …), scrollable when the list overflows.

This is a **filter-only UI addition** that reuses endpoints the User Directory already calls — **no new
backend work is required**. It is the sibling of the Companies quick filter
(`user-directory-companies-filter-plan.md`); see `user-directory-page-plan.md` for the full page mapping.

## Frontend (this change)

- `src/components/user-directory/UserDirectoryContent.tsx`
  - Added a shadcn `Select` (reused from `components/ui/select`) in the users-tab filter row, placed
    before the **Companies** quick filter so the hierarchy reads Corporation → Company.
  - Options come from the already-loaded `corporationOptionsForMoreFilters` (`getCorporationsList()` →
    `{ id, label }`); the first item is `All Corporations`.
  - New local state `listCorporationFilter` (`undefined` = all). Changing it resets to page 1 and
    invalidates the fetch dedupe ref, mirroring the Status / Categories / Companies handlers.
  - The selection is merged into the existing users list request: when a specific corporation is chosen it
    takes precedence and is sent as `corporationIds: [id]`; otherwise the multi-select `corporationIds`
    from the **Filters** dialog is used. `listCorporationFilter` is included in the fetch dedupe key + deps
    and reset on tab change.
  - Gated on `showMoreFiltersCorporation` (`isSuperAdmin`) — the same role gate used for the corporation
    options load and the More Filters corporation section (corporation admins are already scoped to their
    own corporation server-side, so the top-level corporation filter only renders for super admins).
- Copy added to `src/const/users/user-directory.const.ts`
  (`corporationsFilterAllLabel: "All Corporations"`, `corporationsFilterAriaLabel: "Filter by corporation"`).
- Styling: shadcn `Select` maps to the same design tokens as the Figma dropdown
  (`bg-popover`, `rounded-md`, `shadow-md`, accent-highlighted item, `text-popover-foreground`); no new
  color/spacing values introduced.

## API (existing — reused)

| Concern | Endpoint |
| --- | --- |
| Corporation options | `GET /corporations` (via `getCorporationsList`) |
| Filtered user list | `GET /users?...&corporationIds=<csv>` (via `useUsersStore.fetchUsers`; `corporationIds` already supported and CSV-serialized in `users.api.ts`) |

The `corporationIds` query param already exists on `GET /users`; a single-value quick filter is just a
one-element list, so the server contract is unchanged.

## Auth / deployment

- No new endpoints, DTOs, data model, or IaC changes.
- Existing controller guards apply (`CognitoAuthGuard`, `AuthorizationGuard`, `@RequireSubmodule`
  `USER_DIRECTORY_VIEW`); corporation-scoped visibility continues to be enforced server-side on
  `GET /users` / `GET /corporations`.
