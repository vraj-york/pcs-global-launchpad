# Coach Session Actions Menu — backend mapping

Figma node `4:20393` (`PCS_Global_Coach_Persona_Launchpad_Test`) is the **more-actions dropdown** on a
coach's today's-session row. It is a pure UI component (shadcn `DropdownMenu`) — **no new backend work
is required**; both items map to endpoints already specified in `coach-dashboard-api-plan.md`.

## Menu → API mapping

| Menu item | Icon (lucide) | State | Endpoint (existing plan) |
| --- | --- | --- | --- |
| Quick Prep | `Zap` | default (`#2F414A` text) | `GET /coach-dashboard/sessions/:id/quick-prep` |
| Cancel Session | `CalendarX2` | destructive (`#C44755` text on `#FDF3F3` tint) | `DELETE /coach-dashboard/sessions/:id` |

## Frontend

- Rendered inline in `SessionRow` (`src/components/dashboard/coach-dashboard/CoachDashboard.tsx`) via the
  shared `components/ui/dropdown-menu.tsx` — not recreated.
- Container: `bg-background`, `border-border` (≈ `#DDD9EB`), `rounded-lg` (8px), `p-0.5` (2px), `shadow-xl`.
- Items: `rounded-md` (6px), `px-2 py-1.5`, `gap-2`, `min-h-9`, `text-small`, 20px (`size-5`) icons.
- Destructive item uses `variant="destructive"` so the highlight tint (`bg-destructive/10` ≈ `#FDF3F3`) and
  red text (`text-destructive` = `#C44755`) come from the design tokens in `index.css`.

## Auth / deployment

- Actions inherit the coach-dashboard controller guards (`CognitoAuthGuard`, `AuthorizationGuard`,
  `@RequireSubmodule`) and audit hooks described in `coach-dashboard-api-plan.md`. No IaC changes.
