# User Directory — Companies quick filter (node `4:22215`)

Figma node `4:22215` (`Dropdown - Companies`) is the **companies/office quick-filter dropdown** for the
**User Directory** users tab: a compact menu listing `All Companies` (selected default) followed by each
active company/office (`New York HQ`, `San Francisco Office`, `Berlin Office`, …), scrollable when the
list overflows.

This is a **filter-only UI addition** that reuses endpoints the User Directory already calls — **no new
backend work is required**. This file documents the wiring for traceability. See
`user-directory-page-plan.md` for the full page mapping.

## Frontend (this change)

- `src/components/user-directory/UserDirectoryContent.tsx`
  - Added a shadcn `Select` (reused from `components/ui/select`) in the users-tab filter row, next to the
    existing **Status** and **Categories** filters, so the three read as a consistent group.
  - Options come from the already-loaded `companiesForMoreFilters` (`getActiveCompanies()` →
    `{ id, label }`); the first item is `All Companies` (`companiesFilterAllLabel`).
  - New local state `listCompanyFilter` (`undefined` = all). Changing it resets to page 1 and invalidates
    the fetch dedupe ref, mirroring `handleStatusFilterChange` / `handleCategoryFilterChange`.
  - The selection is merged into the existing users list request: when a specific company is chosen it
    takes precedence and is sent as `companyIds: [id]`; otherwise the multi-select `companyIds` from the
    **Filters** dialog is used. `listCompanyFilter` is included in the fetch dedupe key + deps.
  - Gated on `showMoreFiltersCompany` (`isSuperAdmin || isCorporationAdmin`) — same role gate used for the
    company options load and the More Filters company section — and reset on tab change.
- Copy reused from `src/const/users/user-directory.const.ts`
  (`companiesFilterAllLabel: "All Companies"`, `companiesFilterAriaLabel: "Filter by company"`), which were
  already defined for this filter.
- Styling: shadcn `Select` maps to the same design tokens as the Figma dropdown
  (`bg-popover`, `rounded-md`, `shadow-md`, accent-highlighted item, `text-popover-foreground`); no new
  color/spacing values introduced.

## API (existing — reused)

| Concern | Endpoint |
| --- | --- |
| Company/office options | `GET /corporations/companies/active` (via `getActiveCompanies`) |
| Filtered user list | `GET /users?...&companyIds=<csv>` (via `useUsersStore.fetchUsers`; `companyIds` already supported and CSV-serialized in `users.api.ts`) |

The `companyIds` query param already exists on `GET /users`; a single-value quick filter is just a
one-element list, so the server contract is unchanged.

## Auth / deployment

- No new endpoints, DTOs, data model, or IaC changes.
- Existing controller guards apply (`CognitoAuthGuard`, `AuthorizationGuard`, `@RequireSubmodule`
  `USER_DIRECTORY_VIEW`); company-scoped visibility for corporation admins continues to be enforced
  server-side on `GET /users` / `GET /corporations/companies/active`.
