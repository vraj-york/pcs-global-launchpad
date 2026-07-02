# Session Actions — Quick Prep & Cancel Session — Backend Plan

Design: [Figma node 2733-86124](https://www.figma.com/design/PS90cVnLY2qWdwRhTtWQAl/Untitled?node-id=2733-86124)
Frontend component: `frontend/src/components/common/SessionActionsMenu.tsx`
Repo: `github.com/vraj-york/pcs-global-launchpad` (mono-repo, `main`)

## Summary

The Figma design is a **session actions dropdown menu** with two items:

1. **Quick Prep** (`Zap` icon) — opens/generates prep material for an upcoming session.
2. **Cancel Session** (`CalendarX` icon, destructive) — cancels a scheduled session.

The UI is delivered as a reusable `SessionActionsMenu` built from the shared shadcn
`DropdownMenu` (same pattern as `tables/**/*Column.tsx` row-action menus, e.g.
`CompanyDirectoryColumn.tsx`). It exposes `onQuickPrep` / `onCancelSession` callbacks
so the host feature wires them to the APIs below. This plan describes the server
support the two actions need.

> Note: the personality-assessment "session" in `components/assessment/` is a
> different concept. These actions target a **scheduled/bookable session** entity.
> If that entity does not yet exist, create it as described in "Data model".

## Frontend integration points

- Import: `import { SessionActionsMenu } from "@/components/common";`
- Follows existing conventions: `variant="destructive"` for Cancel Session,
  icons at `size-4 text-icon-primary`, `MoreVertical` trigger `Button`
  (`variant="ghost"`, `size="icon-sm"`), copy from
  `SESSION_ACTIONS_MENU_CONTENT` (`const/common/session-actions.const.ts`).
- Wrap Cancel Session's callback in the shared `ConfirmationModal`
  (`components/common/ConfirmationModal.tsx`) before calling the API — destructive
  action must confirm.

## API endpoints

Prefer the repo's existing axios client (`frontend/src/lib/apiClient.ts`) + a
`sessions.api.ts` module mirroring existing `*.api.ts` files, and REST routes
consistent with the other resources.

### 1. Cancel Session

```
POST /api/v1/sessions/{sessionId}/cancel
```
- Auth: authenticated user (Cognito JWT, `ProtectedRoute` on the client). Authorize
  that the caller owns or administers the session (RBAC — reuse `lib/rbac`).
- Body: `{ "reason"?: string }`
- Success `200`: `{ "id": string, "status": "cancelled", "cancelledAt": string }`
- Errors: `403` (not permitted), `404` (missing), `409` (already
  cancelled/completed — surface via toast, same as other mutations).
- Side effects: release the time slot, notify the counterpart (email via the SES
  path used elsewhere), write an audit record.

### 2. Quick Prep

Two viable shapes depending on whether prep is precomputed or generated:

- **Fetch existing prep:** `GET /api/v1/sessions/{sessionId}/prep` → `200`
  `{ "sessionId": string, "summary": string, "talkingPoints": string[], "generatedAt": string }`
- **Generate on demand:** `POST /api/v1/sessions/{sessionId}/prep` (idempotent per
  session; returns cached result if present). If prep is AI-generated, reuse the
  existing chatbot/LLM backend patterns (`components/chatbot`, SSE) and stream or
  return the summary.

Client renders the result in a sheet/dialog (`components/ui/sheet.tsx` or
`dialog.tsx`) — no new primitive needed.

## Data model

If a scheduled-session entity is missing, add `sessions` (DynamoDB — align with the
project's existing tables/IaC):

| attr | type | notes |
|---|---|---|
| `id` (pk) | S | session id |
| `ownerId` / `participantId` | S | user references |
| `startsAt` / `endsAt` | S | ISO timestamps |
| `status` | S | `scheduled` \| `cancelled` \| `completed` |
| `cancelledAt` / `cancelReason` | S | set on cancel |
| `prep` | M | `{ summary, talkingPoints[], generatedAt }` cached prep |

GSI on `ownerId`/`startsAt` for listing upcoming sessions.

## Auth & security

- All routes behind Cognito JWT auth (API Gateway authorizer / existing middleware).
- Enforce ownership/role checks server-side (never trust the client menu state).
- Rate-limit Quick Prep generation to control LLM cost.
- Audit cancellations (who/when/why).

## AWS deployment notes

- Lambdas per route (or extend the existing sessions service) behind API Gateway,
  matching the mono-repo's current serverless layout.
- DynamoDB `sessions` table + GSI in the existing IaC stack (Terraform/CDK/SAM).
- Cancellation notification email via SES (reuse the transactional email path;
  see `backend/plan/verification-code-email.md`).
- Quick Prep generation: reuse the chatbot LLM integration + its IAM/secrets;
  consider async + SSE if latency is high.

## Testing

- Cancel: happy path, already-cancelled `409`, unauthorized `403`, missing `404`,
  confirmation-modal cancel path (no API call).
- Quick Prep: fetch cached, generate-then-cache, error/loading states in the UI.
